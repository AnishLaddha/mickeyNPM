#!/bin/bash

# Check if an argument is provided
if [ -z "$1" ]; then
  echo "No argument provided. Please provide 'install', 'test', or a URL."
  exit 1
fi

# Handle different argument values
case "$1" in
  install)
    npm i --silent
    num_dependencies=$(npm list --depth=0 | grep '├──' | wc -l)
    echo "$num_dependencies dependencies installed..."
    ;;
  test)
    echo "Running tests..."
    npm test
    echo "Done."
    ;;
  *)
    if [[ "$1" == *".txt"* ]]; then
      npx tsx src/calculate_metrics "$1"
      rc=$?
      if [ $rc -ne 0 ]; then
        echo "Error calculating metrics."
        exit $rc
      fi
    else
      echo "Invalid argument. Please provide 'install', 'test', or a valid npmjs or GitHub URL."
      exit 1
    fi
    ;;
esac