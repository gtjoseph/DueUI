#!/bin/bash
#
# This is a quick script to package DueUI and send it to a Duet.
#
./build.sh
hostname=${1:?You must supply a hostname}
cmd="ncftpput -t 1 -r 0 -R -m ${hostname} /www/ dist/*.gz dist/js dist/css dist/fonts"
# FTP can be a little flaky on the Duet so we always retry
$cmd || $cmd
cmd="ncftpput -t 1 -r 0 -R -m ${hostname} /sys/ dist/dueui_config_default.json"
$cmd || $cmd

