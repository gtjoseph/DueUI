#!/bin/bash
LIBSDIR=$(readlink -f $(dirname $0))
TOPDIR=$(readlink -f ${LIBSDIR}/../)

install_bootstrap() {
	cp ${LIBSDIR}/bootstrap/dist/css/bootstrap.min.css ${TOPDIR}/css/
	cp ${LIBSDIR}/bootstrap/dist/js/bootstrap.bundle.min.js ${TOPDIR}/js/
}

install_bootstrap_autocomplete() {
	cp bootstrap-autocomplete/dist/latest/bootstrap-autocomplete.min.js ${TOPDIR}/js/
}

install_bootswatch() {
	declare -a dirs=( $(find ${LIBSDIR}/bootswatch/dist/ -mindepth 1 -type d | sort) )
	lastdir=${dirs[ $((${#dirs[@]} - 1 )) ]}
	cat >${TOPDIR}/css/dueui-themes.css <<-EOF
	{
		"themes": [
	EOF
	for d in ${dirs[@]} ; do
		aname=( $(head -1 $d/_variables.scss) )
		name=${aname[1]}
		echo "/* ${name} */" > ${TOPDIR}/css/dueui-${name}.theme.min.css
		cat $d/bootstrap.min.css >> ${TOPDIR}/css/dueui-${name}.theme.min.css
		echo -n "{\"label\": \"${name}\", \"value\": \"css/dueui-${name}.theme.min.css\"}" >>${TOPDIR}/css/dueui-themes.css
		if [ $d != $lastdir ] ; then
			echo "," >>${TOPDIR}/css/dueui-themes.css
		else
			echo >>${TOPDIR}/css/dueui-themes.css
		fi
	done
	cat >>${TOPDIR}/css/dueui-themes.css <<-EOF
		]
	}
	EOF
}

install_jquery() {
	cp ${LIBSDIR}/jquery/dist/jquery.min.js ${TOPDIR}/js/
}

install_material_icons() {
	woff2_compress ${LIBSDIR}/material-design-icons/font/MaterialIcons-Regular.ttf
	mv ${LIBSDIR}/material-design-icons/font/MaterialIcons-Regular.woff2 ${TOPDIR}/fonts/
	cp ${LIBSDIR}/dueui-fonts.css ${TOPDIR}/css/
}

install_pako() {
	cp ${LIBSDIR}/pako/dist/pako_inflate.min.js ${TOPDIR}/js/
}

install_bootstrap
install_bootstrap_autocomplete
install_bootswatch
install_jquery
install_material_icons
install_pako
