import { graphql, GraphqlResponseError } from "@octokit/graphql";
import * as dotenv from "dotenv";
import { url_main } from "./url_handler";
import { LicenseInfoInterface } from "./interfaces/licenseinfointerface";
import { CorrectnessInterface } from "./interfaces/correctnessinterface";
import * as git from "isomorphic-git";
import fs from "fs";
import http from "isomorphic-git/http/node";

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
dotenv.config({ path: "../../githubapi.env" });
const githubToken = process.env.GITHUB_TOKEN;
const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${githubToken}`,
  },
});

// Modify logic if necessary, this is barebones implementation
function check_license_text(licenseText: string | undefined) {
  const normalizedText = licenseText?.toLowerCase();
  // List of licenses known to be compatible with LGPL v2.1
  const compatibleLicenses = [
    "mit license",
    "bsd 2-clause license",
    "bsd 3-clause license",
    "apache license, version 2.0",
    "lgpl",
    "gpl",
    "mozilla public license",
    "cc0",
  ];

  // Check if any compatible license is mentioned
  const mentionsCompatibleLicense = compatibleLicenses.some((license) =>
    normalizedText?.includes(license),
  );

  // Key phrases that indicate permissive terms
  const permissivePhrases = [
    "permission is hereby granted, free of charge",
    "redistribute",
    "without restriction",
    "provided that the above copyright notice",
  ];

  // Check if the license contains permissive phrases
  const containsPermissivePhrases = permissivePhrases.some((phrase) =>
    normalizedText?.includes(phrase),
  );

  // Check for phrases that might indicate incompatibility
  const incompatiblePhrases = [
    "not for use in",
    "not licensed for",
    "proprietary",
  ];

  const containsIncompatiblePhrases = incompatiblePhrases.some((phrase) =>
    normalizedText?.includes(phrase),
  );

  // Consider compatible if it mentions a compatible license or contains permissive phrases,
  // and doesn't contain incompatible phrases
  return (
    (mentionsCompatibleLicense || containsPermissivePhrases) &&
    !containsIncompatiblePhrases
  );
}

function getLatency(startTime: number): number {
  return Number(((performance.now() - startTime) / 1000).toFixed(3));
}

async function fetch_repo_info() {
  const url = process.argv[2];
  const obj = await url_main(url);
  const owner = obj?.repo_owner;
  const name = obj?.repo_name;

  return { owner, name };
}

// add blank function to calculate rampup time metric
async function calculate_rampup_metric(
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

  // delete the cloned repo
  fs.rm(`./repos/${name}`, { recursive: true }, (err) => {
    if (err) {
      console.error(err);
    }
  });

  return { rampupScore: 0, rampup_latency: getLatency(startTime) };
}

// add blank function to calculate correctness metric
async function calculate_correctness_metric(
  owner: string | undefined,
  name: string | undefined,
) {
  const startTime = performance.now();
  const query = `
  query($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
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

  } catch (error) {
    
  }
    //   if (error instanceof GraphqlResponseError) {
  //     console.log(error.message);
  //   } else {
  //     console.log(error);
  //   }
  //   return { licenseScore: 0, license_latency: 0 };
  // }
  // const query = `
  // query {
  //   repository(owner: "${owner}", name: "${name}") {
  //     issues(states: OPEN) {
  //       totalCount
  //     }
  //     pullRequests(states: OPEN) {
  //       totalCount
  //     }
  //   }
  // }
  // `;
  // try {
  //   const response = await graphqlWithAuth<CorrectnessInterface>(query);
  //   // const openIssuesCount = response.repository.issues.totalCount;
  //   // const openPullsCount = response.repository.pullRequests.totalCount;

  //   // // Example metric calculation: fewer open issues and PRs means higher correctness
  //   // const correctness = 100 - (openIssuesCount + openPullsCount);

  //   return { correctnessScore: correctness > 0 ? correctness : 0, correctness_latency: getLatency(startTime) };
  // } catch (error) {
  //   if (error instanceof GraphqlResponseError) {
  //     console.log(error.message);
  //   } else {
  //     console.log(error);
  //   }
  //   return { licenseScore: 0, license_latency: 0 };
  // }
}

// add blank function to calculate responsive maintenance metric
async function responsive_maintenance_metric() {
  return 0;
}

async function calculate_license_metric(
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
      mainLicense: object(expression: "main:LICENSE") {
        ... on Blob {
          text
        }
      }
      masterLicense: object(expression: "master:LICENSE") {
        ... on Blob {
          text
        }
      }
    }
  }
  `;

  try {
    const response = await graphqlWithAuth<LicenseInfoInterface>(query);
    const licenseInfo = response.repository.licenseInfo;
    const licenseText =
      response.repository.mainLicense?.text ||
      response.repository.masterLicense?.text;
    const licenseID = licenseInfo?.spdxId;
    const licenseName = licenseInfo?.name;

    let licenseScore = 0;
    if (licenseInfo == null || licenseID == null) {
      // No license info found
      return { licenseScore, license_latency: getLatency(startTime) };
    }

    if (
      licenseName === "Other" &&
      licenseText &&
      check_license_text(licenseText)
    ) {
      licenseScore = 1;
    } else if (lgplCompatibleSpdxIds.includes(licenseID)) {
      licenseScore = 1;
    }

    return { licenseScore, license_latency: getLatency(startTime) };
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      console.log(error.message);
    } else {
      console.log(error);
    }
    return { licenseScore: 0, license_latency: 0 };
  }
}

function calculate_net_score(
  licenseScore: number,
  rampupScore: number,
  correctnessScore: number,
  responsiveMaintenanceScore: number,
) {
  return (
    0.25 * licenseScore +
    0.25 * rampupScore +
    0.25 * correctnessScore +
    0.25 * responsiveMaintenanceScore
  );
}
async function main() {
  const { owner, name } = await fetch_repo_info();
  const { licenseScore, license_latency } = await calculate_license_metric(owner, name);
  // build ndjson object
  const data = {
    licenseScore,
    license_latency,
  };
  const ndjson = [
    JSON.stringify({ licenseScore, license_latency})
  ].join('\n');
  console.log(ndjson);
  // const { correctnessScore, correctness_latency } = await calculate_correctness_metric(owner, name);
  // // build ndjson object
  // const data = {
  //   correctnessScore,
  //   correctness_latency,
  // };
  // const ndjson = [
  //   JSON.stringify({ correctnessScore, correctness_latency})
  // ].join('\n');
  // console.log(ndjson);
  // await calculate_rampup_metric(owner, name);
}

if (require.main === module) {
  main();
}
