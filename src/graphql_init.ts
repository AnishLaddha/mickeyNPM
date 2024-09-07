import { graphql, GraphqlResponseError } from "@octokit/graphql";
import * as dotenv from 'dotenv';

// Provide path to env file here
dotenv.config({ path: '../../shrijan.env' });

const githubToken = process.env.GITHUB_TOKEN

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${githubToken}`,
  },
});

// make a query to the GitHub API, to get number of commits in the last year on https://github.com/octokit/graphql.js
const query = `
  query {
    repository(owner: "octokit", name: "graphql.js") {
      ref(qualifiedName: "main") {
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

interface CommitHistoryResponse {
  repository: {
    ref: {
      target: {
        history: {
          totalCount: number;
        };
      };
    };
  };
}

async function main() {
  try {
    const result = await graphqlWithAuth<CommitHistoryResponse>(query);
    console.log(result.repository.ref.target.history.totalCount);
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      console.log("Request failed:", error.request);
      console.log(error.message); // Field 'bioHtml' doesn't exist on type 'User'
    } else {
      console.log("Request failed");
    }
  }
}

main();
