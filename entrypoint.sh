#!/bin/bash
echo "MATBIT ENTRYPOINT"
date
echo "waiting for db"
/wait
echo "starting node index.js"
node index.js
