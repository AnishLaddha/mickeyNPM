interface PullRequestNode {
  createdAt: string;
  closedAt: string | null;
  mergedAt: string | null;
  state: string;
}

interface IssueNode {
  createdAt: string;
  closedAt: string | null;
  state: string;
}

export interface RepositoryResponse {
  repository: {
    pullRequests: {
      totalCount: number;
      edges: Array<{
        node: PullRequestNode;
      }>;
    };
    issues: {
      totalCount: number;
      edges: Array<{
        node: IssueNode;
      }>;
    };
  };
}
