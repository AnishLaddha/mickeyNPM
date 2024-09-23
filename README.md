# mickeyNPM

Team Members: Shrijan Swaminathan, Rishab Pangal, Aarav Sumit Patel

## Overview

This project is designed to measure various metrics for a GitHub repository, including ramp-up time, correctness, and license compatability with
LGPL V2.1. Please ensure that you have $LOG_LEVEL, $GITHUB_TOKEN, and $LOG_FILE environment variables saved in your current session. One way of doing this is by creating a .env file and running ". .env" in the shell.

## Prerequisites

- Node.js (version 14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/shrijan-swaminathan/mickeyNPM
   ```

2. Navigate to the project directory:

   ```sh
   cd mickeyNPM
   ```

## Running the Code

To run the code and measure the ramp-up time for a repository, follow these steps:

1. Ensure that all environment variables have been saved for the current session.

2. Ensure you are in the root directory of mickeyNPM:

   ```sh
   pwd
   ~/mickeyNPM
   ```

3. Run the `run.sh` script:

   ```sh
   ./run install
   ```

   This installs the dependencies needed to run this project.

4. To calculate the metrics associated with a repository, run:

   ```sh
   ./run URL_FILE
   ```

   Replace [`URL_FILE`] with the absolute path of the file containg the URL's you
   want metrics on

5. To run the test suite, use:

   ```sh
   ./run test
   ```

## Example Usage

Here's an example of how to run this:

```sh
./run install
10 dependencies installed...

Given SampleUrlFile.txt:
https://github.com/cloudinary/cloudinary_npm
https://www.npmjs.com/package/express
https://github.com/nullivex/nodist
https://github.com/lodash/lodash
https://www.npmjs.com/package/browserify

./run ./url_files/SampleUrlFile.txt
{"URL":"https://github.com/cloudinary/cloudinary_npm","NetScore":-1,"NetScore_Latency":-1,"RampUp":-1,"RampUp_Latency":-1,"Correctness":0.675,"Correctness_Latency":0.633,"BusFactor":-1,"BusFactor_Latency":-1,"ResponsiveMaintainer":0.3,"ResponsiveMaintainer_Latency":0.412,"License":1,"License_Latency":0.414}
{"URL":"https://www.npmjs.com/package/express","NetScore":-1,"NetScore_Latency":-1,"RampUp":-1,"RampUp_Latency":-1,"Correctness":0.894,"Correctness_Latency":0.372,"BusFactor":-1,"BusFactor_Latency":-1,"ResponsiveMaintainer":0.3,"ResponsiveMaintainer_Latency":0.473,"License":1,"License_Latency":0.199}
{"URL":"https://github.com/nullivex/nodist","NetScore":-1,"NetScore_Latency":-1,"RampUp":-1,"RampUp_Latency":-1,"Correctness":0.569,"Correctness_Latency":0.458,"BusFactor":-1,"BusFactor_Latency":-1,"ResponsiveMaintainer":0.3,"ResponsiveMaintainer_Latency":0.509,"License":1,"License_Latency":0.176}
{"URL":"https://github.com/lodash/lodash","NetScore":-1,"NetScore_Latency":-1,"RampUp":-1,"RampUp_Latency":-1,"Correctness":0.345,"Correctness_Latency":0.246,"BusFactor":-1,"BusFactor_Latency":-1,"ResponsiveMaintainer":0.7,"ResponsiveMaintainer_Latency":0.51,"License":1,"License_Latency":0.244}
{"URL":"https://www.npmjs.com/package/browserify","NetScore":-1,"NetScore_Latency":-1,"RampUp":-1,"RampUp_Latency":-1,"Correctness":0.349,"Correctness_Latency":0.473,"BusFactor":-1,"BusFactor_Latency":-1,"ResponsiveMaintainer":0.3,"ResponsiveMaintainer_Latency":0.578,"License":1,"License_Latency":0.165}

./run test
Total: 20
Passed: 20
Coverage: 100%
20/20 test cases passed. 100% line coverage achieved.
```