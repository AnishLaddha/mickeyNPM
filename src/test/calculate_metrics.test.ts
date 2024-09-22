import { graphql } from "@octokit/graphql";
import * as git from "isomorphic-git";
import fs from "fs";
import axios from "axios";
import {
  fetch_repo_info,
  calculate_rampup_metric,
  calculate_correctness_metric,
  calculate_responsiveness_metric,
  calculate_license_metric,
  calculate_net_score,
} from "../calculate_metrics";

// Mock dependencies
jest.mock("@octokit/graphql");
jest.mock("isomorphic-git");
jest.mock("fs");
jest.mock("axios");

describe("calculate_metrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("fetch_repo_info should return owner and name", async () => {
    const mockUrlMain = jest.fn().mockResolvedValue({
      repo_owner: "owner",
      repo_name: "name",
    });
    jest.mock("../url_handler", () => ({
      url_main: mockUrlMain,
    }));

    const { owner, name } = await fetch_repo_info(
      "https://github.com/owner/name",
    );
    expect(owner).toBe("owner");
    expect(name).toBe("name");
  });

  test("calculate_rampup_metric should return rampup score and latency", async () => {
    (git.clone as jest.Mock).mockResolvedValue(undefined);
    (fs.rm as jest.Mock).mockImplementation((path, options, callback) =>
      callback(null),
    )

    const result = await calculate_rampup_metric("owner", "name");
    expect(result).toHaveProperty("rampupScore");
    expect(result).toHaveProperty("rampup_latency");
  });

  test("calculate_correctness_metric should return correctness score and latency", async () => {
    (graphql.defaults as jest.Mock).mockReturnValue({
      request: jest.fn().mockResolvedValue({
        repository: {
          issues: { totalCount: 10 },
          closedIssues: { totalCount: 5 },
          pullRequests: { totalCount: 3 },
          releases: { totalCount: 2 },
          defaultBranchRef: {
            target: {
              history: { totalCount: 20 },
            },
          },
        },
      }),
    });

    const result = await calculate_correctness_metric("owner", "name");
    expect(result).toHaveProperty("Correctness");
    expect(result).toHaveProperty("Correctness_Latency");
  });

  test("calculate_responsiveness_metric should return responsiveness score and latency", async () => {
    (graphql.defaults as jest.Mock).mockReturnValue({
      request: jest.fn().mockResolvedValue({
        repository: {
          pullRequests: {
            edges: [
              {
                node: {
                  createdAt: "2021-01-01T00:00:00Z",
                  closedAt: "2021-01-02T00:00:00Z",
                  mergedAt: null,
                  state: "CLOSED",
                },
              },
            ],
          },
          issues: {
            edges: [
              {
                node: {
                  createdAt: "2021-01-01T00:00:00Z",
                  closedAt: "2021-01-02T00:00:00Z",
                  state: "CLOSED",
                },
              },
            ],
          },
        },
      }),
    });

    const result = await calculate_responsiveness_metric("owner", "name");
    expect(result).toHaveProperty("ResponsiveMaintainer");
    expect(result).toHaveProperty("ResponsiveMaintainer_Latency");
  });

  test("calculate_license_metric should return license score and latency", async () => {
    (graphql.defaults as jest.Mock).mockReturnValue({
      request: jest.fn().mockResolvedValue({
        repository: {
          licenseInfo: { spdxId: "MIT", name: "MIT" },
          mainpackage: { json: '{"name": "test-package"}' },
          masterpackage: null,
        },
      }),
    });

    const result = await calculate_license_metric("owner", "name");
    expect(result).toHaveProperty("License");
    expect(result).toHaveProperty("License_Latency");
  });

  test("calculate_net_score should return net score and latency", () => {
    const result = calculate_net_score(1, 1, 1, 1);
    expect(result).toHaveProperty("NetScore");
    expect(result).toHaveProperty("NetScore_Latency");
  });

  test("fetch_repo_info should handle null response", async () => {
    const mockUrlMain = jest.fn().mockResolvedValue(null);
    jest.mock("../url_handler", () => ({
      url_main: mockUrlMain,
    }));

    const { owner, name } = await fetch_repo_info(
      "https://github.com/owner/name",
    );
    expect(owner).toBeUndefined();
    expect(name).toBeUndefined();
  });

  test("calculate_rampup_metric should handle git clone error", async () => {
    (git.clone as jest.Mock).mockRejectedValue(new Error("Clone failed"));

    await expect(calculate_rampup_metric("owner", "name")).rejects.toThrow(
      "Clone failed",
    );
  });

  test("calculate_correctness_metric should handle graphql error", async () => {
    (graphql.defaults as jest.Mock).mockReturnValue({
      request: jest.fn().mockRejectedValue(new Error("GraphQL error")),
    });

    const result = await calculate_correctness_metric("owner", "name");
    expect(result).toEqual({ licenseScore: 0, license_latency: 0 });
  });

  test("calculate_responsiveness_metric should handle graphql error", async () => {
    (graphql.defaults as jest.Mock).mockReturnValue({
      request: jest.fn().mockRejectedValue(new Error("GraphQL error")),
    });

    const result = await calculate_responsiveness_metric("owner", "name");
    expect(result).toEqual({ responsivenessScore: 0, responsive_latency: 0 });
  });

  test("calculate_license_metric should handle graphql error", async () => {
    (graphql.defaults as jest.Mock).mockReturnValue({
      request: jest.fn().mockRejectedValue(new Error("GraphQL error")),
    });

    const result = await calculate_license_metric("owner", "name");
    expect(result).toEqual({ License: 0, License_Latency: 0 });
  });

  test("calculate_net_score should handle zero scores", () => {
    const result = calculate_net_score(0, 0, 0, 0);
    expect(result.NetScore).toBe(0);
  });

  test("calculate_net_score should handle mixed scores", () => {
    const result = calculate_net_score(1, 0.5, 0.75, 0.25);
    expect(result.NetScore).toBeCloseTo(0.625);
  });

  test("calculate_rampup_metric should handle fs.rm error", async () => {
    (git.clone as jest.Mock).mockResolvedValue(undefined);
    (fs.rm as jest.Mock).mockImplementation((path, options, callback) =>
      callback(new Error("Remove failed")),
    );

    const result = await calculate_rampup_metric("owner", "name");
    expect(result).toHaveProperty("rampupScore");
    expect(result).toHaveProperty("rampup_latency");
  });

  test("calculate_correctness_metric should handle zero issues and pull requests", async () => {
    (graphql.defaults as jest.Mock).mockReturnValue({
      request: jest.fn().mockResolvedValue({
        repository: {
          issues: { totalCount: 0 },
          closedIssues: { totalCount: 0 },
          pullRequests: { totalCount: 0 },
          releases: { totalCount: 0 },
          defaultBranchRef: {
            target: {
              history: { totalCount: 0 },
            },
          },
        },
      }),
    });

    const result = await calculate_correctness_metric("owner", "name");
    expect(result.Correctness).toBe(0);
  });

  test("calculate_responsiveness_metric should handle zero pull requests and issues", async () => {
    (graphql.defaults as jest.Mock).mockReturnValue({
      request: jest.fn().mockResolvedValue({
        repository: {
          pullRequests: { edges: [] },
          issues: { edges: [] },
        },
      }),
    });

    const result = await calculate_responsiveness_metric("owner", "name");
    expect(result.ResponsiveMaintainer).toBe(0.3);
  });

  test("calculate_license_metric should handle no license info", async () => {
    (graphql.defaults as jest.Mock).mockReturnValue({
      request: jest.fn().mockResolvedValue({
        repository: {
          licenseInfo: null,
          mainpackage: { json: '{"name": "test-package"}' },
          masterpackage: null,
        },
      }),
    });

    (axios.get as jest.Mock).mockResolvedValue({
      data: { license: "MIT" },
    });

    const result = await calculate_license_metric("owner", "name");
    expect(result.License).toBe(1);
  });

  test("calculate_license_metric should handle incompatible license", async () => {
    (graphql.defaults as jest.Mock).mockReturnValue({
      request: jest.fn().mockResolvedValue({
        repository: {
          licenseInfo: { spdxId: "Proprietary", name: "Proprietary" },
          mainpackage: { json: '{"name": "test-package"}' },
          masterpackage: null,
        },
      }),
    });

    const result = await calculate_license_metric("owner", "name");
    expect(result.License).toBe(0);
  });

  test("calculate_license_metric should handle missing package.json", async () => {
    (graphql.defaults as jest.Mock).mockReturnValue({
      request: jest.fn().mockResolvedValue({
        repository: {
          licenseInfo: { spdxId: "MIT", name: "MIT" },
          mainpackage: null,
          masterpackage: null,
        },
      }),
    });

    const result = await calculate_license_metric("owner", "name");
    expect(result.License).toBe(1);
  });

  test("calculate_net_score should handle negative scores", () => {
    const result = calculate_net_score(-1, -1, -1, -1);
    expect(result.NetScore).toBe(-1);
  });
});
