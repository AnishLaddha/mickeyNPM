export interface CommitHistory {
  repository: {
    mainBranch?: {
      target: {
        history: {
          totalCount: number;
        };
      };
    };
    masterBranch?: {
      target: {
        history: {
          totalCount: number;
        };
      };
    };
  };
}
