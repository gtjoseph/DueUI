#!/bin/bash
#
# This is a quick script to package DueUI for upload to a Duet
# via Duet Web Control or FTP using the ncftp_put.sh script.
#
version=$(git describe)
rm -rf dist DueUI-DSF-${version}.zip DueUI-Standalone-${version}.zip || :
mkdir -p dist/dueui
cp dueui_config_default.json dist/dueui/
cp dueui.html dist/dueui/index.html
cp -a css js fonts dist/dueui/

cd dist
zip -r ../DueUI-DSF-${version}.zip dueui

cd dueui
sed -r -e "s/jquery.js/dueui-vendor-bundle.js/g" -e "/bootstrap/d" \
	-e "s/dueui.js/dueui-bundle.js/g" -e "/dueui_(panel|widget)/d" index.html > dueui.html
sed -i -r -e "s/DUEUI_VERSION/$version/g" dueui.html
gzip *.html

cd js
mv jquery.js dueui-vendor-bundle.js
cat bootstrap.bundle.js >> dueui-vendor-bundle.js
cat bootstrap-autocomplete.js >> dueui-vendor-bundle.js
rm bootstrap.bundle.js bootstrap-autocomplete.js

mv dueui.js dueui-bundle.js
cat dueui_panel.js >> dueui-bundle.js
cat dueui_widget.js >> dueui-bundle.js
rm dueui_panel.js dueui_widget.js 
gzip *.js

cd ../css/
gzip *.css

cd ../fonts/
gzip *.ttf
gzip *.eot

cd ..
zip -r ../../DueUI-Standalone-${version}.zip .
