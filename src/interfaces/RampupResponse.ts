interface RampUpResponse {
    repository: {
      pullRequests: {
        edges: {
          node: {
            createdAt: string;
          };
        }[];
      };
      defaultBranchRef: {
        target: {
          history: {
            edges: {
              node: {
                committedDate: string;
              };
            }[];
          };
        };
      };
    };
  }
  