# mickeyNPM

Team Members: Shrijan Swaminathan, Rishab Pangal, Aarav Sumit Patel

## Overview

This project is designed to measure various metrics for a GitHub repository, including ramp-up time, correctness, and license compatability with
LGPL V2.1. Please ensure that you change the location of your `.env` file with the GitHub token inside `calculate_metrics.ts`.

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

1. Ensure you have a `.env` file with your GitHub token in the project root directory.

2. Navigate to the `src` folder:

   ```sh
   cd src
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

````sh
./run install
Installing dependencies...
Done.

./run ./url_files/SampleUrlFile.txt
{"URL":"https://github.com/cloudinary/cloudinary_npm","NetScore":-1,"NetScore_Latency":-1,"RampUp":-1,"RampUp_Latency":-1,"Correctness":0.675,"Correctness_Latency":0.633,"BusFactor":-1,"BusFactor_Latency":-1,"ResponsiveMaintainer":0.3,"ResponsiveMaintainer_Latency":0.412,"License":1,"License_Latency":0.414}
{"URL":"https://www.npmjs.com/package/express","NetScore":-1,"NetScore_Latency":-1,"RampUp":-1,"RampUp_Latency":-1,"Correctness":0.894,"Correctness_Latency":0.372,"BusFactor":-1,"BusFactor_Latency":-1,"ResponsiveMaintainer":0.3,"ResponsiveMaintainer_Latency":0.473,"License":1,"License_Latency":0.199}
{"URL":"https://github.com/nullivex/nodist","NetScore":-1,"NetScore_Latency":-1,"RampUp":-1,"RampUp_Latency":-1,"Correctness":0.569,"Correctness_Latency":0.458,"BusFactor":-1,"BusFactor_Latency":-1,"ResponsiveMaintainer":0.3,"ResponsiveMaintainer_Latency":0.509,"License":1,"License_Latency":0.176}
{"URL":"https://github.com/lodash/lodash","NetScore":-1,"NetScore_Latency":-1,"RampUp":-1,"RampUp_Latency":-1,"Correctness":0.345,"Correctness_Latency":0.246,"BusFactor":-1,"BusFactor_Latency":-1,"ResponsiveMaintainer":0.7,"ResponsiveMaintainer_Latency":0.51,"License":1,"License_Latency":0.244}
{"URL":"https://www.npmjs.com/package/browserify","NetScore":-1,"NetScore_Latency":-1,"RampUp":-1,"RampUp_Latency":-1,"Correctness":0.349,"Correctness_Latency":0.473,"BusFactor":-1,"BusFactor_Latency":-1,"ResponsiveMaintainer":0.3,"ResponsiveMaintainer_Latency":0.578,"License":1,"License_Latency":0.165}

Done.

```

```
````
