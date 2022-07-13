#! /usr/bin/bash
pkill -f 'node bot.js'
git pull
nohup node bot.js > output.log &
