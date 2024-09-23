// use axios to fetch data from the url and return the response
import axios from "axios";
import { exit } from "process";

// get third argument from the command line
function handle_npm_url(cli_url: string) {
  const parts = cli_url.split("/");
  const pkg_name = parts[parts.length - 1];
  return "https://registry.npmjs.org/" + pkg_name;
}

async function fetchUrl(url: string): Promise<any> {
  const response = await axios.get(url);
  return response.data;
}

function get_repoowner_reponame(url: string) {
  const parts = url.split("/");
  let repo_owner;
  let repo_name;
  // find position of github.com
  let github_pos = parts.findIndex(
    (part) => part.includes("github.com") || part.includes("git@github.com"),
  );
  // Handle custom GitHub Enterprise domains
  if (github_pos === -1) {
    github_pos = parts.findIndex((part) => part.includes("github."));
  }
  if (github_pos !== -1 && parts.length > github_pos + 2) {
    repo_owner = parts[github_pos + 1];
    repo_name = parts[github_pos + 2];
    repo_name = repo_name.replace(".git", "");
  } else {
    throw new Error("Invalid GitHub URL");
  }
  return { repo_owner, repo_name };
}

// main function to fetch the url

export async function url_main(url: string) {
  if (url.includes("npmjs.com")) {
    const endpoint_url = handle_npm_url(url);
    const data = await fetchUrl(endpoint_url);
    const github_url = data.repository.url;
    let { repo_owner, repo_name } = get_repoowner_reponame(github_url);
    return { repo_owner, repo_name };
  } else if (url.includes("github.com")) {
    let { repo_owner, repo_name } = get_repoowner_reponame(url);
    return { repo_owner, repo_name };
  }
  else
  {
    const output1 = 'undefined';
    const output2 = 'undefined';
    return { output1, output2 };
  }
}
