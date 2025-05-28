#!/bin/bash
set -e

# Ensure an empty directory before building
rm -rf ./build && mkdir -p ./build

echo 'Copying output files to the build folder...' &&
  cp -f ./next.config.js ./build &&
  cp -R ./public ./build &&
  cp -f .env ./build &&
  cp -R ./.next/standalone/. ./build &&
  cp -R ./.next/static ./build/.next

# Print the output file after building
ls -al './build'

echo 'AUTOTMS build successful!'
