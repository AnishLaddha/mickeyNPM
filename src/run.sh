#!/bin/bash

# Check if an argument is provided
if [ -z "$1" ]; then
  echo "No argument provided. Please provide 'install', 'URL_FILE', or 'test'."
  exit 1
fi

# Handle different argument values
case "$1" in
  install)
    echo "Installing dependencies..."
    npm i
    echo "Done."
    ;;
  url)
    echo "URL case is not implemented yet."
    ;;
  test)
    echo "Test case is not implemented yet."
    ;;
  *)
    echo "Invalid argument. Please provide 'install', 'url', or 'test'."
    exit 1
    ;;
esac