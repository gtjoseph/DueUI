#!/bin/bash
#
# This is a quick script to package DueUI for upload to a Duet
# via Duet Web Control or FTP using the ncftp_put.sh script.
#
rm -rf DueUI DueUI.zip || :
mkdir DueUI
cp -a *.html dueui_config_default.json DueUI/
gzip DueUI/*.html

cp -a js DueUI/
gzip DueUI/js/*.js
cd DueUI
zip -X -r ../DueUI.zip .
