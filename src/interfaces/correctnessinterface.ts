// export interface CorrectnessInterface {
//     repository: {
//       issues: {
//         totalCount: number;
//       };
//       pullRequests: {
//         totalCount: number;
//       };
//     };
//   }
  export interface CorrectnessInterface {
    repository: {
      issues: {
        totalCount: number;
      };
      closedIssues: {
        totalCount: number;
      };
      pullRequests: {
        totalCount: number;
      };
      releases: {
        totalCount: number;
      };
      defaultBranchRef: {
        target: {
          history: {
            totalCount: number;
          };
        };
      };
    };
  }
  
// export interface CorrectnessInterface {
//     codeQualityScore: number; // 0-100 linting score
//     testCoverage: number; // 0-100 percentage
//     hasReadme: boolean;
//     hasContributingGuide: boolean;
//     daysLastCommit: number;
//     averageIssueResolutionDays: number;
//     contributorCount: number;
//     starCount: number;
//     forkCount: number;
//     releaseCount: number;
//   }
  