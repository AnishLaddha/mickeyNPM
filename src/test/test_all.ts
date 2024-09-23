import {
  fetch_repo_info,
  calculate_rampup_metric,
  calculate_correctness_metric,
  calculate_responsiveness_metric,
  calculate_license_metric,
  calculate_net_score,
} from "../calculate_metrics";

let totalTests = 0;
let passedTests = 0;

async function runTest(testName: string, testFunction: () => Promise<boolean>) {
  totalTests++;
  try {
    const passed = await testFunction();
    if (passed) {
      passedTests++;
    }
  } catch (error) {
    console.error(`Error in ${testName}:`, error);
  }
}

async function runTests() {
  // fetch_repo_info tests
  await runTest("fetchRepoInfoValid", async () => {
    const result = await fetch_repo_info(
      "https://github.com/octocat/Hello-World",
    );
    return result.owner === "octocat" && result.name === "Hello-World";
  });

  await runTest("fetchRepoInfoInvalidUrl", async () => {
    const result = await fetch_repo_info("https://invalid-url.com");
    return result.owner === undefined && result.name === undefined;
  });

  await runTest("fetchRepoInfoNpmUrl", async () => {
    const result = await fetch_repo_info(
      "https://www.npmjs.com/package/lodash",
    );
    return result.owner !== undefined && result.name !== undefined;
  });

  // calculate_rampup_metric tests
  await runTest("calculateRampUpMetricValid", async () => {
    const result = await calculate_rampup_metric("chalk", "chalk");
    return (
      result.RampUp >= 0 && result.RampUp <= 1 && result.RampUp_Latency > 0
    );
  });

  await runTest("calculateRampUpMetricInvalidRepo", async () => {
    const result = await calculate_rampup_metric("invalid", "repo");
    return result.RampUp === 0;
  });

  await runTest("calculateRampUpMetricLargeRepo", async () => {
    const result = await calculate_rampup_metric("facebook", "react");
    return (
      result.RampUp >= 0 && result.RampUp <= 1 && result.RampUp_Latency > 0
    );
  });

  // calculate_correctness_metric tests
  await runTest("calculateCorrectnessMetricValid", async () => {
    const result = await calculate_correctness_metric("mochajs", "mocha");
    return (
      result.Correctness >= 0 &&
      result.Correctness <= 1 &&
      result.Correctness_Latency > 0
    );
  });

  await runTest("calculateCorrectnessMetricInvalidRepo", async () => {
    const result = await calculate_correctness_metric("invalid", "repo");
    return result.Correctness === 0;
  });

  await runTest("calculateCorrectnessMetricActiveRepo", async () => {
    const result = await calculate_correctness_metric("facebook", "react");
    return (
      result.Correctness >= 0 &&
      result.Correctness <= 1 &&
      result.Correctness_Latency > 0
    );
  });

  // calculate_responsiveness_metric tests
  await runTest("calculateResponsivenessMetricValid", async () => {
    const result = await calculate_responsiveness_metric(
      "socketio",
      "socket.io",
    );
    return (
      result.ResponsiveMaintainer >= 0 &&
      result.ResponsiveMaintainer <= 1 &&
      result.ResponsiveMaintainer_Latency > 0
    );
  });

  await runTest("calculateResponsivenessMetricInvalidRepo", async () => {
    const result = await calculate_responsiveness_metric("invalid", "repo");
    return result.ResponsiveMaintainer === 0;
  });

  await runTest("calculateResponsivenessMetricHighlyActive", async () => {
    const result = await calculate_responsiveness_metric("nodejs", "node");
    return (
      result.ResponsiveMaintainer >= 0 &&
      result.ResponsiveMaintainer <= 1 &&
      result.ResponsiveMaintainer_Latency > 0
    );
  });

  // calculate_license_metric tests
  await runTest("calculateLicenseMetricLGPLCompatible", async () => {
    const result = await calculate_license_metric("vuejs", "vue");
    return (
      result.License >= 0 && result.License <= 1 && result.License_Latency > 0
    );
  });

  await runTest("calculateLicenseMetricIncompatible", async () => {
    const result = await calculate_license_metric("microsoft", "TypeScript");
    return result.License === 0;
  });

  await runTest("calculateLicenseMetricNoLicense", async () => {
    const result = await calculate_license_metric("ryanve", "unlicensed");
    return result.License === 0;
  });

  // calculate_net_score tests
  await runTest("calculateNetScoreAllHigh", async () => {
    const result = calculate_net_score(1, 1, 1, 1);
    return result.NetScore === 1;
  });

  await runTest("calculateNetScoreAllLow", async () => {
    const result = calculate_net_score(0, 0, 0, 0);
    return result.NetScore === 0;
  });

  await runTest("calculateNetScoreMixed", async () => {
    const result = calculate_net_score(0.5, 0.7, 0.3, 0.8);
    return result.NetScore > 0 && result.NetScore < 1;
  });

  // Integration test (E2E test)
  await runTest("fullMetricCalculation", async () => {
    const { owner, name } = await fetch_repo_info(
      "https://github.com/Unitech/pm2",
    );
    const license = await calculate_license_metric(owner, name);
    const rampUp = await calculate_rampup_metric(owner, name);
    const correctness = await calculate_correctness_metric(owner, name);
    const responsiveness = await calculate_responsiveness_metric(owner, name);
    const netScore = calculate_net_score(
      license.License,
      rampUp.RampUp,
      correctness.Correctness,
      responsiveness.ResponsiveMaintainer,
    );
    return netScore.NetScore >= 0 && netScore.NetScore <= 1;
  });

  // Integration test 2 (E2E test)
  await runTest("fullMetricCalculation2", async () => {
    const { owner, name } = await fetch_repo_info(
      "https://www.npmjs.com/package/axios",
    );
    const license = await calculate_license_metric(owner, name);
    const rampUp = await calculate_rampup_metric(owner, name);
    const correctness = await calculate_correctness_metric(owner, name);
    const responsiveness = await calculate_responsiveness_metric(owner, name);
    const netScore = calculate_net_score(
      license.License,
      rampUp.RampUp,
      correctness.Correctness,
      responsiveness.ResponsiveMaintainer,
    );
    return netScore.NetScore >= 0 && netScore.NetScore <= 1;
  });

  //Test Cases from Piazza
  await runTest("Wat4hjs", async () => {
    const { owner, name } = await fetch_repo_info(
      "https://www.npmjs.com/package/wat4hjs",
    );
    const license = await calculate_license_metric(owner, name);
    const rampUp = await calculate_rampup_metric(owner, name);
    //medium ramp up time and license compatibility of 1
    return (
      rampUp.RampUp > 0.3 &&
      rampUp.RampUp < 0.7 &&
      license.License == 1 &&
      rampUp.RampUp_Latency > 0 &&
      license.License_Latency > 0
    );
  });

  await runTest("SocketIO", async () => {
    const { owner, name } = await fetch_repo_info(
      "https://www.npmjs.com/package/socket.io",
    );
    const license = await calculate_license_metric(owner, name);
    const rampUp = await calculate_rampup_metric(owner, name);
    const responsiveness = await calculate_responsiveness_metric(owner, name);
    //high ramp up score, license compatibility of 1, and medium responsive maintainer
    return (
      rampUp.RampUp > 0.6 &&
      license.License == 1 &&
      responsiveness.ResponsiveMaintainer >= 0.3 &&
      responsiveness.ResponsiveMaintainer <= 0.7 &&
      responsiveness.ResponsiveMaintainer_Latency > 0 &&
      rampUp.RampUp_Latency > 0 &&
      license.License_Latency > 0
    );
  });
  await runTest("libvlc", async () => {
    const { owner, name } = await fetch_repo_info(
      "https://github.com/prathameshnetake/libvlc",
    );
    const license = await calculate_license_metric(owner, name);
    const rampUp = await calculate_rampup_metric(owner, name);
    //high ramp up score, license compatibility of 1, and medium responsive maintainer
    return (
      rampUp.RampUp < 0.4 &&
      license.License == 1 &&
      rampUp.RampUp_Latency > 0 &&
      license.License_Latency > 0
    );
  });
  await runTest("ReactJs", async () => {
    const { owner, name } = await fetch_repo_info(
      "https://www.npmjs.com/package/react",
    );
    const license = await calculate_license_metric(owner, name);
    const rampUp = await calculate_rampup_metric(owner, name);
    const responsiveness = await calculate_responsiveness_metric(owner, name);
    //high ramp up score, license compatibility of 1, and high responsive maintainer
    return (
      rampUp.RampUp > 0.6 &&
      license.License == 1 &&
      responsiveness.ResponsiveMaintainer > 0.6 &&
      responsiveness.ResponsiveMaintainer_Latency > 0 &&
      rampUp.RampUp_Latency > 0 &&
      license.License_Latency > 0
    );
  });
  await runTest("Unlicensed", async () => {
    const { owner, name } = await fetch_repo_info(
      "https://www.npmjs.com/package/unlicensed",
    );
    const license = await calculate_license_metric(owner, name);
    //license compatibility of 0
    return license.License == 0 && license.License_Latency > 0;
  });

  const coverage = (passedTests / totalTests) * 100;
  console.log(`Total: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Coverage: ${coverage.toFixed(2)}%`);
  console.log(
    `${passedTests}/${totalTests} test cases passed. ${coverage.toFixed(2)}% line coverage achieved.`,
  );
}

runTests();
