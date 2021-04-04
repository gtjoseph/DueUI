#!/bin/bash
#
version=$(git describe)

rm -rf dist releases/DueUI-${version}.zip  || :
mkdir -p dist/js dist/css dist/fonts
cp dueui_config_default.json dist/
cp dueui.html dist/

cp -a css/* dist/css/
cp -a fonts/* dist/fonts/

touch dist/js/dueui-vendor-bundle.js
echo -e "\n// JQuery"					>> dist/js/dueui-vendor-bundle.js
cat js/jquery.min.js 					>> dist/js/dueui-vendor-bundle.js
echo -e "\n// Bootstrap"				>> dist/js/dueui-vendor-bundle.js
cat js/bootstrap.bundle.min.js 			>> dist/js/dueui-vendor-bundle.js
echo -e "\n// Bootstrap autocomplete"	>> dist/js/dueui-vendor-bundle.js
cat js/bootstrap-autocomplete.min.js 	>> dist/js/dueui-vendor-bundle.js
echo -e "\n// Pako"						>> dist/js/dueui-vendor-bundle.js
cat js/pako_inflate.min.js 				>> dist/js/dueui-vendor-bundle.js

sed -r -e "s/DUEUI_VERSION/$version/g" js/dueui-loader.js > dist/js/dueui-loader.js

touch dist/js/dueui-bundle.js
echo -e "\n// dueui"			>> dist/js/dueui-bundle.js
cat js/dueui.js 				>> dist/js/dueui-bundle.js
echo -e "\n// dueui_elelemt"	>> dist/js/dueui-bundle.js
cat js/dueui_element.js 		>> dist/js/dueui-bundle.js
echo -e "\n// dueui_panel"		>> dist/js/dueui-bundle.js
cat js/dueui_panel.js 			>> dist/js/dueui-bundle.js
echo -e "\n// dueui_widget"		>> dist/js/dueui-bundle.js
cat js/dueui_widget.js 			>> dist/js/dueui-bundle.js

cd dist/css/
gzip *.css
