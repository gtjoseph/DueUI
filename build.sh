#!/bin/bash
#
version=$(git describe)
rm -rf dist DueUI-DSF-${version}.zip DueUI-Standalone-${version}.zip || :
mkdir -p dist/dueui
cp dueui_config_default_dsf.json dist/dueui/
cp dueui_config_default_standalone.json dist/dueui/
sed -r -e "s/DUEUI_VERSION/$version/g" dueui.html > dist/dueui/index.html
cp -a css js fonts dist/dueui/
cd dist
zip -r ../DueUI-DSF-${version}.zip dueui

cd dueui
rm index.html
sed -r -e "s/jquery.js/dueui-vendor-bundle.js/g" -e "/bootstrap/d" \
	-e "s/dueui.js/dueui-bundle.js/g" -e "/dueui_(element|panel|widget)/d" index.html > dueui.html
gzip *.html

cd js
mv jquery.js dueui-vendor-bundle.js
cat bootstrap.bundle.js >> dueui-vendor-bundle.js
cat bootstrap-autocomplete.js >> dueui-vendor-bundle.js
rm bootstrap.bundle.js bootstrap-autocomplete.js

mv dueui.js dueui-bundle.js
cat dueui_element.js >> dueui-bundle.js
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
