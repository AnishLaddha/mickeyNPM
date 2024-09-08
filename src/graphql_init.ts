import { graphql, GraphqlResponseError } from "@octokit/graphql";
import * as dotenv from 'dotenv';
import { url_main } from './url_handler';
import { CommitHistoryResponse } from "./interfaces/commithistoryinterface";

// Provide path to env file here
dotenv.config({ path: '../../githubapi.env' });
const githubToken = process.env.GITHUB_TOKEN
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

async function main() {
  const { owner, name } = await fetch_repo_info();
  const query = `
  query {
    repository(owner: "${owner}", name: "${name}") {
      mainBranch: ref(qualifiedName: "refs/heads/main") {
        target {
          ... on Commit {
            history {
              totalCount
            }
          }
        }
      }
      masterBranch: ref(qualifiedName: "refs/heads/master") {
        target {
          ... on Commit {
            history {
              totalCount
            }
          }
        }
      }
    }
  }
`;
  try {
    const response = await graphqlWithAuth<CommitHistoryResponse>(query);
    if (response.repository.mainBranch){
      console.log(`Main branch has ${response.repository.mainBranch.target.history.totalCount} commits`);
    }
    if (response.repository.masterBranch){
      console.log(`Master branch has ${response.repository.masterBranch.target.history.totalCount} commits`);
    }
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      console.error(error.request);
      console.error(error.response);
    }
  }
}


main();
