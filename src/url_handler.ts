// use axios to fetch data from the url and return the response
import axios from "axios";

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
  const repo_owner = parts[parts.length - 2];
  const repo_name = parts[parts.length - 1];
  return { repo_owner, repo_name };
}

// main function to fetch the url

export async function url_main(url: string) {
  if (process.argv[2].includes("npmjs")) {
    const endpoint_url = handle_npm_url(url);
    const data = await fetchUrl(endpoint_url);
    const github_url = data.repository.url;
    let { repo_owner, repo_name } = get_repoowner_reponame(github_url);
    repo_name = repo_name.split(".")[0];
    return { repo_owner, repo_name };
  } else if (process.argv[2].includes("github")) {
    let { repo_owner, repo_name } = get_repoowner_reponame(url);
    return { repo_owner, repo_name };
  }
}
