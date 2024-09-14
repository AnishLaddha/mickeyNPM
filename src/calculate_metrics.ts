import { graphql, GraphqlResponseError } from "@octokit/graphql";
import * as dotenv from "dotenv";
import { url_main } from "./url_handler";
import { LicenseInfoInterface } from "./interfaces/licenseinfointerface";

const lgplCompatibleSpdxIds: string[] = [
  'LGPL-2.1-only',
  'LGPL-2.1-or-later',
  'MIT',
  'BSD-3-Clause',
  'BSD-2-Clause',
  'ISC',
  'Zlib',
  'Artistic-2.0',
  'GPL-2.0-only',
  'GPL-2.0-or-later',
  'GPL-3.0-only',
  'GPL-3.0-or-later',
  'LGPL-3.0-only',
  'LGPL-3.0-or-later',
  'MPL-2.0',
  'Unlicense',
  'CC0-1.0'
];

// Provide path to env file here
dotenv.config({ path: "../../githubapi.env" });
const githubToken = process.env.GITHUB_TOKEN;
const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${githubToken}`,
  },
});


async function fetch_repo_info() {
  const url = process.argv[2];
  const obj = await url_main(url);
  const owner = obj?.repo_owner;
  const name = obj?.repo_name;

  return { owner, name };
}

// add blank function to calculate rampup time metric
async function calculate_rampup_metric() {
  return 0;
}

// add blank function to calculate correctness metric
async function correctness_metric() {
  return 0;
}

// add blank function to calculate responsive maintenance metric
async function responsive_maintenance_metric() {
  return 0;
}

async function calculate_license_metric(owner: string | undefined, name: string | undefined) {
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
    }
  }
`;
  let licenseID: string | undefined;
  try {
    const response = await graphqlWithAuth<LicenseInfoInterface>(query);
    licenseID = response.repository.licenseInfo.spdxId;
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      console.error(error.request);
      console.error(error.response);
    }
  }
  let licenseScore: number = 0;
  if (!licenseID) {
    // Log into file specified in $LOG_FILE
    licenseScore = 0;
  }
  else {
    if (lgplCompatibleSpdxIds.includes(licenseID)) {
      licenseScore = 1;
    }
    else {
      licenseScore = 0;
    }
  }
  const license_latency: number = Number(((performance.now() - startTime) / 1000).toFixed(3));
  return { licenseScore, license_latency };
}

function calculate_net_score(licenseScore: number, rampupScore: number, correctnessScore: number, responsiveMaintenanceScore: number) {
  return 0.25 * licenseScore + 0.25 * rampupScore + 0.25 * correctnessScore + 0.25 * responsiveMaintenanceScore;
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
    JSON.stringify({ licenseScore, license_latency })
  ].join('\n');
  console.log(ndjson);
}

if (require.main === module) {
  main();
}