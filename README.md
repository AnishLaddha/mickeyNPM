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
   git clone https://github.com/your-username/mickeyNPM.git
   ```

2. Navigate to the project directory:

   ```sh
   cd mickeyNPM
   ```

3. Install the dependencies:

   ```sh
   npm ci
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

   Replace [`URL_FILE`] with the URL of the GitHub repository you want to analyze.

5. To run the test suite, use:

   ```sh
   ./run test
   ```

## Example Usage

Here's an example of how to run this:

```sh
./run install
Installing dependencies...
Done.

./run https://github.com/octocat/Hello-World
```
