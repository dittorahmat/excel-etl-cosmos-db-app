#!/bin/bash
set -e

echo "--- Current Directory ---"
pwd
echo

echo "--- Root Directory Content ---"
ls -lR /home/site/wwwroot
echo

echo "--- package.json content ---"
cat /home/site/wwwroot/package.json
echo

echo "--- Starting App ---"
npm start
