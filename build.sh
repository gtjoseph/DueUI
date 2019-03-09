#!/bin/bash
#
# This is a quick script to package DueUI for upload to a Duet
# via Duet Web Control or FTP using the ncftp_put.sh script.
#
version=$(git describe)
rm -rf dist DueUI-${version}.zip || :
mkdir dist

sed -r -e "s/jquery.js/dueui-vendor-bundle.js/g" -e "/bootstrap/d" \
	-e "s/dueui.js/dueui-bundle.js/g" -e "/dueui_(panel|widget)/d" dueui.html > dist/dueui.html
cp -a dueui_config_default.json dist/
gzip dist/*.html

mkdir dist/js
cp js/jquery.js dist/js/dueui-vendor-bundle.js
cat js/bootstrap.bundle.js >> dist/js/dueui-vendor-bundle.js
cat js/bootstrap-autocomplete.js >> dist/js/dueui-vendor-bundle.js

cp js/dueui.js dist/js/dueui-bundle.js
cat js/dueui_panel.js >> dist/js/dueui-bundle.js
cat js/dueui_widget.js >> dist/js/dueui-bundle.js

gzip dist/js/*.js

cp -a css dist/
gzip dist/css/*.css

cp -a fonts dist/
gzip dist/fonts/*.ttf
gzip dist/fonts/*.eot

cd dist
zip -X -r ../DueUI-${version}.zip .
