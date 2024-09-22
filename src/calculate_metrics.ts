import { graphql, GraphqlResponseError } from "@octokit/graphql";
import { url_main } from "./url_handler";
import { LicenseInfo } from "./interfaces/LicenseInfo";
import { RepositoryResponse } from "./interfaces/RepositoryResponse";
import { CorrectnessInterface } from "./interfaces/correctnessinterface";
import { get } from "http";
import * as git from "isomorphic-git";
import fs, { cp } from "fs";
import http from "isomorphic-git/http/node";
import axios from "axios";
import * as path from "path";
import winston from "winston";
import { getSystemErrorMap } from "util";
import { timeStamp } from "console";
import { doc, StringSupportOption } from "prettier";
import { Z_DEFAULT_STRATEGY } from "zlib";

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
  "MPL-2.0",
  "Unlicense",
  "CC0-1.0",
];

// Should be loaded from environment variables
const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) {
  console.log("GITHUB_TOKEN is not defined");
  process.exit(1);
}

let loglevel = Number(process.env.LOG_LEVEL);
// if loglevel is not defined, set it to default value of 0
if (!loglevel) {
  loglevel = 0;
}

let logfile = process.env.LOG_FILE;
// format the logfile path correctly
if (logfile) {
  logfile = path.resolve(logfile);
} else {
  console.log("LOG_FILE is not defined");
  process.exit(1);
}

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${githubToken}`,
  },
});

/*** Create a logger object using winston
when you are trying to make a debug message, you can use the logger.debug() function
when you are trying to make an info message, you can use the logger.info() function
**/
let logger: winston.Logger | undefined;
if (loglevel && logfile) {
  logger = winston.createLogger({
    // level is set to 'info' if loglevel is 1, and 'debug' if loglevel is 2
    level: loglevel == 1 ? "info" : "debug",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
    transports: [new winston.transports.File({ filename: logfile })],
  });
}

// Given a start time, calculate the latency, in seconds rounded to 3 decimal places
function getLatency(startTime: number): number {
  return Number(((performance.now() - startTime) / 1000).toFixed(3));
}

// Given a URL, fetch the owner and repository name. Will handle
// both github.com and npmjs.com URLs
export async function fetch_repo_info(
  url_link: string,
): Promise<{ owner: string | undefined; name: string | undefined }> {
  const url = url_link;
  logger?.info(`Fetching owner and repository name for: ${url}`);
  const obj = await url_main(url);
  const owner = obj?.repo_owner;
  const name = obj?.repo_name;
  logger?.debug(`Using URL Handler, fetched Owner: ${owner}, Name: ${name}`);
  return { owner, name };
}

export async function calculate_rampup_metric(
  owner: string | undefined,
  name: string | undefined,
): Promise<{ RampUp: number; RampUp_Latency: number }> {
  if (!owner || !name)
  {
    throw new Error('Owner or name is undefined');
  }
  const timeoutDuration = 300000;
  const timeoutPromise = new Promise<{ RampUp: number; RampUp_Latency: number }>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeoutDuration);
  });

  try {
    return await Promise.race([
      calculateRampUp(owner, name),
      timeoutPromise
    ]);
  } catch (error) {
    logger?.error(`Error or timeout in calculate_rampup_metric: ${error}`);
    return { RampUp: 0, RampUp_Latency: timeoutDuration / 1000 };
  }
}
async function calculateRampUp(owner: string, name: string): Promise<{ RampUp: number; RampUp_Latency: number }> {  
  logger?.info(`Calculating ramp-up metric for ${owner}/${name}`);
  const startTime = performance.now();
  //clone the repository into the repos directory
  const repoDir = `./src/repos/${name}`
  try {
    // Clone the repository using isomorphic-git
    logger?.debug(`Cloning repository https://github.com/${owner}/${name}.git`);
    await git.clone({
      fs,
      http,
      dir: repoDir,
      url: `https://github.com/${owner}/${name}.git`,
      singleBranch: true,
      depth: 1,  
      noCheckout: true,  
    });
    logger?.info(`Successfully cloned ${owner}/${name}`);
    //calculate rampup score
    const rampUpScore = await analyzeRepoStatic(repoDir);
    logger?.info(`Ramp-up score calculated: ${rampUpScore}`);  
    // delete repo from local
    logger?.debug("Deleting cloned repository");
    fs.rm(repoDir, { recursive: true }, (err) => {
      if (err) {
        logger?.error(err);
      }
    });
    return { RampUp: Number(rampUpScore.toFixed(3)), RampUp_Latency: getLatency(startTime) };
  } catch (error) {
    logger?.error(`Error calculating ramp-up metric: ${error}`);
    console.log(`Error calculating ramp-up metric: ${error}`);
    return { RampUp: 0, RampUp_Latency: getLatency(startTime) };
  }
}
async function analyzeRepoStatic(repoDir: string): Promise<number> {
  const weights = {
    readme: 0.1,
    documentation: 0.3,
    examples: 0.3,
    complexity: 0.3,
  }
  try {
    // List branches
    const branches = await git.listBranches({ fs, dir: repoDir, remote: 'origin' });
    logger?.debug(`Remote branches found: ${branches.join(', ')}`);

    // Use the first branch or 'main' or 'master' if available
    const defaultBranch = branches.find(b => ['main', 'master'].includes(b)) || branches[0];
    if (!defaultBranch) {
      throw new Error('No branches found');
    }
    logger?.debug(`Using branch: ${defaultBranch}`);

    // Resolve the reference to get the commit hash
    const oid = await git.resolveRef({ fs, dir: repoDir, ref: defaultBranch });
    logger?.debug(`Resolved ref: ${oid}`);

    // Read the tree for this commit
    const allFiles = await getAllFilesStatic(repoDir, oid);
    // check if a readme exists
    const readmeRegex = /^readme\.(md|txt|markdown)$/i;
    const readMeScore = allFiles.some(file => readmeRegex.test(file.path)) ? weights.readme : 0;
    //check if proper documentation exists
    const docFiles = allFiles.filter(file => 
      file.path.toLowerCase().includes('docs') || 
      file.path.toLowerCase().endsWith('.md') ||
      file.path.toLowerCase().endsWith('.markdown') ||
      file.path.toLowerCase().endsWith('.txt')      ||
      file.path.toLowerCase().endsWith('.rst') ||
      file.path.toLowerCase().endsWith('.adoc')
    );
    const docScore = weights.documentation * Math.min(docFiles.length / 20, 1);
    
    //check if examples exist
    const exampleFiles = allFiles.filter(file => 
      file.path.toLowerCase().includes('example') || 
      file.path.toLowerCase().includes('demo')    ||
      file.path.toLowerCase().includes('practice')
    );
    const exScore = weights.examples * Math.min(exampleFiles.length / 10, 1);
    
    // check the code complexity
    const complexityScore = weights.complexity * (await analyzeComplexityStatic(allFiles));

    const score = readMeScore + docScore + exScore + complexityScore;
    logger?.debug(`Scores - README: ${readMeScore}, Documentation: ${docScore}, Examples: ${exScore}, Complexity: ${complexityScore}`);
    console.log(`Scores - README: ${readMeScore}, Documentation: ${docScore}, Examples: ${exScore}, Complexity: ${complexityScore}`);
    return Math.max(0, Math.min(1, score));
  } catch (error) {
    logger?.error(`Error in analyzeRepoStatic: ${error}`);
    return 0;
  }
}
async function analyzeComplexityStatic(allFiles: any[]): Promise<number> {
  const codeFiles = allFiles.filter(entry => 
    /\.(ts|js|jsx|tsx|py|java|c|cpp|cs)$/i.test(entry.path)
  );
  // a lot of files means high code complexity
  return 1 - Math.min(codeFiles.length / 1000, 1);
}
async function getAllFilesStatic(repoDir: string, oid: string): Promise<Array<{ path: string, oid: string }>> {
  const { tree } = await git.readTree({ fs, dir: repoDir, oid });
  let allFiles: Array<{ path: string, oid: string }> = [];

  for (const entry of tree) {
    if (entry.type === 'tree') {
      const subFiles = await getAllFilesStatic(repoDir, entry.oid);
      allFiles = allFiles.concat(subFiles.map(file => ({
        path: `${entry.path}/${file.path}`,
        oid: file.oid
      })));
    } else {
      allFiles.push({ path: entry.path, oid: entry.oid });
    }
  }
  return allFiles;
}

export async function calculate_correctness_metric(
  owner: string | undefined,
  name: string | undefined,
): Promise<{ Correctness: number; Correctness_Latency: number }> {
  logger?.info(`Calculating correctness metric for ${owner}/${name}`);
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
  logger?.debug(`Query: ${query}`);
  try {
    const response = await graphqlWithAuth<CorrectnessInterface>(query);
    logger?.info("Correctness GraphQL response successful");
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
    logger?.info(`Correctness score calculated: ${correctnessScore}`);
    return {
      Correctness: correctnessScore,
      Correctness_Latency: getLatency(startTime),
    };
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      logger?.error(error.message);
    } else {
      logger?.error(error);
    }
    return { Correctness: 0, Correctness_Latency: getLatency(startTime) };
  }
}

export async function calculate_responsiveness_metric(
  owner: string | undefined,
  name: string | undefined,
): Promise<{
  ResponsiveMaintainer: number;
  ResponsiveMaintainer_Latency: number;
}> {
  logger?.info(`Calculating responsiveness metric for ${owner}/${name}`);
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
  logger?.debug(`Query: ${query}`);
  try {
    const response = await graphqlWithAuth<RepositoryResponse>(query);
    logger?.info("Responsiveness GraphQL response successful");
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

    logger?.debug(`Average PR response time: ${avgPrResponseTime} ms`);
    logger?.debug(`Average Issue response time: ${avgIssueResponseTime} ms`);
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
    logger?.info(`Responsiveness score calculated: ${responsivenessScore}`);

    return {
      ResponsiveMaintainer: responsivenessScore,
      ResponsiveMaintainer_Latency: getLatency(startTime),
    };
  } catch (error) {
    logger?.error(error);
    return {
      ResponsiveMaintainer: 0,
      ResponsiveMaintainer_Latency: getLatency(startTime),
    };
  }
}

export async function calculate_license_metric(
  owner: string | undefined,
  name: string | undefined,
): Promise<{ License: number; License_Latency: number }> {
  logger?.info(`Calculating license metric for ${owner}/${name}`);
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
  logger?.debug(`Query: ${query}`);
  try {
    const response = await graphqlWithAuth<LicenseInfo>(query);
    logger?.info("License GraphQL response successful");
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
      logger?.info(`${licenseID} license is compatible with LGPL V2.1`);
      licenseScore = 1;
    } else if (
      licenseInfo == null ||
      licenseID == null ||
      licenseName == "Other"
    ) {
      if (!packageName) {
        logger?.info("No package.json found, unable to determine license");
        return { License: 0, License_Latency: getLatency(startTime) };
      }
      logger?.info("Checking license from registry");
      const registry_link = `https://registry.npmjs.org/${packageName}`;
      logger?.debug(`Fetching license from registry: ${registry_link}...`);
      const registryResponse = await axios.get(registry_link);
      registryLicenseName = registryResponse.data.license;
      if (
        typeof registryLicenseName === "string" &&
        lgplCompatibleSpdxIds.includes(registryLicenseName)
      ) {
        licenseScore = 1;
        logger?.info(
          `${registryLicenseName} license is compatible with LGPL V2.1`,
        );
      } else {
        logger?.info(
          `${registryLicenseName} license is not compatible with LGPL V2.1`,
        );
        licenseScore = 0;
      }
    }
    return { License: licenseScore, License_Latency: getLatency(startTime) };
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      logger?.error(error.message);
    } else {
      logger?.error(error);
    }
    return { License: 0, License_Latency: getLatency(startTime) };
  }
}

export function calculate_net_score(
  licenseScore: number,
  rampupScore: number,
  correctnessScore: number,
  responsiveMaintenanceScore: number,
): { NetScore: number; NetScore_Latency: number } {
  const startTime = performance.now();
  return {
    NetScore:
      0.3 * licenseScore +
      0.2 * rampupScore +
      0.25 * correctnessScore +
      0.2 * responsiveMaintenanceScore,
    NetScore_Latency: getLatency(startTime),
  };
}

async function main() {
  try {
    logger?.info("Starting metric calculation");
    const url_file = process.argv[2];
    // open the file
    logger?.info(`Reading URLs from file: ${url_file}`);
    const url_data = fs.readFileSync(url_file, "utf8");
    // parse line by line
    const urls = url_data.split("\n").map((url) => url.trim());
    logger?.info(`Read ${urls.length} URLs from file`);
    let ndjson_data = [];
    // iterate over each url
    for (const url of urls) {
      if (url != "") {
        logger?.info(`Calculating metrics for ${url}`);
        const { owner, name } = await fetch_repo_info(url);
        logger?.debug(`Owner: ${owner}, Name: ${name}`);

        // Calculate metrics concurrently
        const [
          { License, License_Latency },
          { ResponsiveMaintainer, ResponsiveMaintainer_Latency },
          { Correctness, Correctness_Latency },
          { RampUp, RampUp_Latency },
        ] = await Promise.all([
          calculate_license_metric(owner, name),
          calculate_responsiveness_metric(owner, name),
          calculate_correctness_metric(owner, name),
          calculate_rampup_metric(owner, name),
        ]);

        let { NetScore, NetScore_Latency } = calculate_net_score(
          License,
          RampUp,
          Correctness,
          ResponsiveMaintainer,
        );
        NetScore = Number(NetScore.toFixed(3));

        // build ndjson object
        const data = {
          URL: url,
          NetScore,
          NetScore_Latency,
          RampUp,
          RampUp_Latency,
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
        logger?.info(`Metrics calculated for ${url}`);
      }
    }
    const ndjson_output = ndjson_data.join("\n");
    logger?.debug(`NDJSON output: ${ndjson_output}`);
    console.log(ndjson_output);
    logger?.info("Metrics calculation completed. Exiting...");
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  } catch (error) {
    logger?.error(error);
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
}
async function main2() {
  try {
    logger?.info("Starting metric calculation");
    const url_file = process.argv[2];
    // open the file
    logger?.info(`Reading URLs from file: ${url_file}`);
    const url_data = fs.readFileSync(url_file, "utf8");
    // parse line by line
    const urls = url_data.split("\n").map((url) => url.trim());
    logger?.info(`Read ${urls.length} URLs from file`);
    let ndjson_data = [];
    // iterate over each url
    for (const url of urls) {
      if (url != "") {
        logger?.info(`Calculating metrics for ${url}`);
        const { owner, name } = await fetch_repo_info(url);
        logger?.debug(`Owner: ${owner}, Name: ${name}`);

        // Calculate metrics concurrently
        const [
          { RampUp, RampUp_Latency },
        ] = await Promise.all([
          
          calculate_rampup_metric(owner, name),
        ]);
        console.log(RampUp, RampUp_Latency)
      }
    }
  } catch (error) {
    logger?.error(error);
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
}

if (require.main === module) {
  main2();
}
