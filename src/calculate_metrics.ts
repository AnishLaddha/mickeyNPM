import { graphql, GraphqlResponseError } from "@octokit/graphql";
import { url_main } from "./url_handler";
import { LicenseInfo } from "./interfaces/LicenseInfo";
import { RepositoryResponse } from "./interfaces/RepositoryResponse";
import { CorrectnessInterface } from "./interfaces/correctnessinterface";
import { get } from "http";
import * as dotenv from "dotenv";
import * as git from "isomorphic-git";
import fs from "fs";
import http from "isomorphic-git/http/node";
import axios from "axios";
import * as path from "path";

const lgplCompatibleSpdxIds: string[] = [
  "LGPL-2.1-only",
  "LGPL-2.1-or-later",
  "MIT",
  "BSD-3-Clause",
  "BSD-2-Clause",
  "ISC",
  "Zlib",
  "Artistic-2.0",
  "GPL-2.0-only",
  "GPL-2.0-or-later",
  "GPL-3.0-only",
  "GPL-3.0-or-later",
  "LGPL-3.0-only",
  "LGPL-3.0-or-later",
  "MPL-2.0",
  "Unlicense",
  "CC0-1.0",
];

// Provide path to env file here
const envPath = path.resolve(__dirname, "../project.env");
dotenv.config({ path: envPath });
const githubToken = process.env.GITHUB_TOKEN;
const loglevel = process.env.LOG_LEVEL;
const logfile = process.env.LOG_FILE;

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${githubToken}`,
  },
});

function getLatency(startTime: number): number {
  return Number(((performance.now() - startTime) / 1000).toFixed(3));
}

export async function fetch_repo_info(url_link: string) {
  const url = url_link;
  const obj = await url_main(url);
  const owner = obj?.repo_owner;
  const name = obj?.repo_name;

  return { owner, name };
}

export async function calculate_rampup_metric(
  owner: string | undefined,
  name: string | undefined,
) {
  // use isomorphic-git to clone the repo
  const startTime = performance.now();
  await git.clone({
    fs,
    http,
    dir: "./repos/" + name,
    url: `https://github.com/${owner}/${name}.git`,
    singleBranch: true,
    depth: 1,
  });
  //perform analysis on the cloned repo for rampup time
  // Measure the time from when a developer first forks or clones the repository to when they submit their first pull request.
  // For this, we need to check the commits and PRs in the cloned repo. WE CANT USE THE GITHUB API FOR THIS
  // get all the commits
  // const commits = await git.log({
  //   fs,
  //   dir: `./repos/${name}`,
  //   depth: 100,
  // });
  // // get all the pull requests
  // const prs = await git.listBranches({
  //   fs,
  //   dir: `./repos/${name}`,
  // });
  // delete the cloned repo
  fs.rm(`./repos/${name}`, { recursive: true }, (err) => {
    if (err) {
      console.error(err);
    }
  });

  return { rampupScore: 0, rampup_latency: getLatency(startTime) };
}

export async function calculate_correctness_metric(
  owner: string | undefined,
  name: string | undefined,
) {
  const startTime = performance.now();
  const query = `
  query {
    repository(owner: "${owner}", name: "${name}") {
      issues(states: OPEN) {
        totalCount
      }
      closedIssues: issues(states: CLOSED) {
        totalCount
      }
      pullRequests(states: OPEN) {
        totalCount
      }
      releases {
        totalCount
      }
      defaultBranchRef {
        target {
          ... on Commit {
            history(since: "${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}") {
              totalCount
            }
          }
        }
      }
    }
  }
  `;
  try {
    const response = await graphqlWithAuth<CorrectnessInterface>(query);
    const repo = response.repository;
    const openIssues = repo.issues.totalCount;
    const closedIssues = repo.closedIssues.totalCount;
    const openPullRequests = repo.pullRequests.totalCount;
    const releases = repo.releases.totalCount;
    const recentCommits = repo.defaultBranchRef.target.history.totalCount;
    //calculate issue ratio
    const issueRatio = closedIssues / (openIssues + closedIssues) || 0;
    // calculate pr ratio
    const prRatio = releases / (openPullRequests + releases) || 0;
    //calculate recent commit ratio (past 30 days and max at 1)
    const recentCommitRatio = Math.min(recentCommits / 30, 1);
    //calculate correctness score (ensuring its between 0 and 1)
    const correctnessScore = Number(
      Math.max(
        0,
        Math.min((issueRatio + prRatio + recentCommitRatio) / 3),
      ).toFixed(3),
    );
    return {
      Correctness: correctnessScore,
      Correctness_Latency: getLatency(startTime),
    };
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      console.log(error.message);
    } else {
      console.log(error);
    }
    return { licenseScore: 0, license_latency: 0 };
  }
}

export async function calculate_responsiveness_metric(
  owner: string | undefined,
  name: string | undefined,
) {
  const startTime = performance.now();
  const query = `
  query {
    repository(owner: "${owner}", name: "${name}") {
      pullRequests(first: 100, states: [OPEN, MERGED, CLOSED]) {
        edges {
          node {
            createdAt
            closedAt
            mergedAt
            state
          }
        }
      }
      issues(first: 100, states: [OPEN, CLOSED]) {
        edges {
          node {
            createdAt
            closedAt
            state
          }
        }
      }
    }
  }
  `;

  try {
    const response = await graphqlWithAuth<RepositoryResponse>(query);
    const pullRequests = response.repository.pullRequests.edges;
    const issues = response.repository.issues.edges;

    //  Pull Requests
    let totalPrResponseTime = 0;
    let resolvedPrs = 0;

    pullRequests.forEach((pr: any) => {
      if (pr.node.closedAt || pr.node.mergedAt) {
        const createdAt = pr.node.createdAt
          ? new Date(pr.node.createdAt).getTime()
          : 0;
        const closedOrMergedAt =
          pr.node.closedAt || pr.node.mergedAt
            ? new Date(pr.node.closedAt || pr.node.mergedAt).getTime()
            : 0;

        totalPrResponseTime += closedOrMergedAt - createdAt;
        resolvedPrs++;
      }
    });

    const avgPrResponseTime =
      resolvedPrs > 0 ? totalPrResponseTime / resolvedPrs : Infinity;

    // response time
    let totalIssueResponseTime = 0;
    let resolvedIssues = 0;

    issues.forEach((issue) => {
      if (issue.node.closedAt) {
        const createdAt = new Date(issue.node.createdAt).getTime();
        const closedAt = new Date(issue.node.closedAt).getTime();
        totalIssueResponseTime += closedAt - createdAt;
        resolvedIssues++;
      }
    });

    const avgIssueResponseTime =
      resolvedIssues > 0 ? totalIssueResponseTime / resolvedIssues : Infinity;

    // responsiveness score
    let responsivenessScore = 0;

    const maxAcceptableResponseTime = 86400000 * 7;
    if (
      avgPrResponseTime < maxAcceptableResponseTime &&
      avgIssueResponseTime < maxAcceptableResponseTime
    ) {
      responsivenessScore = 1;
    } else if (
      avgPrResponseTime < maxAcceptableResponseTime ||
      avgIssueResponseTime < maxAcceptableResponseTime
    ) {
      responsivenessScore = 0.7;
    } else {
      responsivenessScore = 0.3;
    }

    return {
      ResponsiveMaintainer: responsivenessScore,
      ResponsiveMaintainer_Latency: getLatency(startTime),
    };
  } catch (error) {
    console.error("Error fetching repository data:", error);
    return { responsivenessScore: 0, responsive_latency: 0 };
  }
}

export async function calculate_license_metric(
  owner: string | undefined,
  name: string | undefined,
) {
  const startTime = performance.now();
  const query = `
  query {
    repository(owner: "${owner}", name: "${name}") {
      licenseInfo {
        name
        spdxId
        url
        description
      }
      mainpackage: object(expression: "main:package.json") {
        ... on Blob {
          json: text
        }
      }
      masterpackage: object(expression: "master:package.json") {
        ... on Blob {
          json: text
        }
      }
    }
  }
  `;

  try {
    const response = await graphqlWithAuth<LicenseInfo>(query);
    const licenseInfo = response.repository.licenseInfo;
    const mainPackageJson = response.repository.mainpackage
      ? JSON.parse(response.repository.mainpackage.json)
      : null;
    const masterPackageJson = response.repository.masterpackage
      ? JSON.parse(response.repository.masterpackage.json)
      : null;
    let packageName;
    let registryLicenseName;
    if (mainPackageJson && mainPackageJson.name) {
      packageName = mainPackageJson.name;
    } else if (masterPackageJson && masterPackageJson.name) {
      packageName = masterPackageJson.name;
    }
    const licenseID = licenseInfo?.spdxId;
    const licenseName = licenseInfo?.name;

    let licenseScore = 0;
    if (lgplCompatibleSpdxIds.includes(licenseID)) {
      licenseScore = 1;
    } else if (
      licenseInfo == null ||
      licenseID == null ||
      licenseName == "Other"
    ) {
      if (!packageName) {
        return { License: 0, License_Latency: getLatency(startTime) };
      }
      const registry_link = `https://registry.npmjs.org/${packageName}`;
      const registryResponse = await axios.get(registry_link);
      registryLicenseName = registryResponse.data.license;
      if (
        typeof registryLicenseName === "string" &&
        lgplCompatibleSpdxIds.includes(registryLicenseName)
      ) {
        licenseScore = 1;
      } else {
        licenseScore = 0;
      }
    }
    return { License: licenseScore, License_Latency: getLatency(startTime) };
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      console.log(error.message);
    } else {
      console.log(error);
    }
    return { License: 0, License_Latency: 0 };
  }
}

export function calculate_net_score(
  licenseScore: number,
  rampupScore: number,
  correctnessScore: number,
  responsiveMaintenanceScore: number,
) {
  const startTime = performance.now();
  return {
    NetScore:
      0.25 * licenseScore +
      0.25 * rampupScore +
      0.25 * correctnessScore +
      0.25 * responsiveMaintenanceScore,
    NetScore_Latency: getLatency(startTime),
  };
}

async function main() {
  try {
    const url_file = process.argv[2];
    // open the file
    const url_data = fs.readFileSync(url_file, "utf8");
    // parse line by line
    const urls = url_data.split("\n").map((url) => url.trim());
    let ndjson_data = [];
    // iterate over each url
    for (const url of urls) {
      const { owner, name } = await fetch_repo_info(url);
      const [
        { License, License_Latency },
        { ResponsiveMaintainer, ResponsiveMaintainer_Latency },
        { Correctness, Correctness_Latency },
      ] = await Promise.all([
        calculate_license_metric(owner, name),
        calculate_responsiveness_metric(owner, name),
        calculate_correctness_metric(owner, name),
      ]);
      // const { RampUp, RampUp_Latency } = await calculate_rampup_metric(owner, name);
      // build ndjson object
      const data = {
        URL: url,
        NetScore: -1,
        NetScore_Latency: -1,
        RampUp: -1,
        RampUp_Latency: -1,
        Correctness,
        Correctness_Latency,
        BusFactor: -1,
        BusFactor_Latency: -1,
        ResponsiveMaintainer,
        ResponsiveMaintainer_Latency,
        License,
        License_Latency,
      };

      const json = JSON.stringify(data);
      // push to ndjson array
      ndjson_data.push(json);
    }
    const ndjson_output = ndjson_data.join("\n");
    console.log(ndjson_output);
    process.exit(0);
  } catch (error) {
    console.error("An error occured:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
