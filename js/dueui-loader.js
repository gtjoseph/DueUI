
keyExistsOn = (o, k) => k.replace('[', '.').replace(']', '').split(".")
	.reduce((a, c) => a.hasOwnProperty(c) ? a[c] || 1 : false, Object.assign({}, o)) === false ? false : true;

classExists = (c) => c && typeof(c) == "function" && typeof(c.prototype) == "object" ? true : false;

String.prototype.basename = function() { return this.split('/').slice(this[this.length - 1] == '/' ? -2 : -1)[0]; };
String.prototype.dirname = function() { return this.split('/').slice(0, this[this.length - 1] == '/' ? -2 : -1).join('/'); };

async function delay(ms) {
	return await new Promise(resolve => setTimeout(resolve, ms));
}

function extendObject(current, extra) {
	return $.extend(true, {}, ...arguments);
}

const DUEUI = {
	BACKENDS: {
		UNKNOWN: "UNKNOWN",
		STANDALONE: "STANDALONE",
		DSF: "DSF"
	},
	RETRIEVE_PREFIX: {
		"UNKNOWN": "",
		"STANDALONE": "/rr_download?name=",	
		"DSF": "/machine/file"		
	},
	BACKEND_CONFIGS: [
		"/sys/dueui_config.json",
		"dueui_config.json",
		"/sys/dueui_config_default.json",
		"dueui_config_default.json"
	],
	ACTIONS: {
		GCODE: "gcode",
		EVENT: "event",
		MACRO: "macro",
		PRINT: "print",
		LOG: "log",
		SETTING: "setting",
	},
	EVENTS: {
		UPDATE_VALUE: "update_value",
		UPDATE_LABEL: "update_label",
		DISABLE: "disable",
		ENABLE: "enable",
		REFRESH: "refresh",
		PRINT: "print",
		RUN: "run",
		CLEAR: "clear",
		JOG_SPEED: "jog_speed",
		JOG_SCALE: "jog_scale",
		JOG_SENSE: "jog_sense",
		SUBMIT: "dueui-submit",
		RECV_EVENTS: "recv-events"
	},
	CONFIG_VERSION: 101
}

function nativeFromString(vs) {
	if (typeof vs !== 'string') {
		return vs;
	}

	if (/^[-+]?\d+$/.test(vs)) {
		return parseInt(vs);
	}

	if (/^[-+]?((\d+[.]?)|([.]\d+)|(\d+[.]\d*))$/.test(vs)) {
		return parseFloat(vs).toFixed(vs.split('.')[1].length);
	}

	if (/^(true)|(false)$/.test(vs)) {
		return vs === "true";
	}
	return vs;
}

defaultSettings = {
	'duet_host': document.location.host,
	'duet_debug_polling_enabled': 0,
	'dueui_config_url': "dueui_config_default.json",
	'dueui_settings_dont_send_gcode': 0,
	'duet_polling_enabled': 0,
	'dueui_test_mode': 0,
	'duet_update_time': 0,
	'show_tooltips': 1,
	'hide_settings': 0,
	'backend_type': DUEUI.BACKENDS.UNKNOWN,
	'theme_name': "Cerulean",
	'theme_path': "css/dueui-Cerulean.theme.min.css",
	'duet_password': "reprap",
	'duet_poll_interval_1': 1000,
};

resolvedSettings = {};
settingsDirty = false;
configFileSettings = {};

themeList = [];

dueui_version="DUEUI_VERSION";

function addHeadElement(str, element, options = {}) {
	var elem;
	var new_elem = true;
	if (options.id) {
		elem = document.getElementById(options.id);
		if (elem) {
			elem.remove();
		}
	}
	elem = document.createElement(element);
	Object.assign(elem, options);
    elem.innerHTML = str;
    document.head.appendChild( elem );
}

async function tryFetch(url, options = {}) {
	var response = {};
	url = url.replace(document.location.origin, "");
	try {
		response = await fetch(url, { mode: "cors", ...options});
	} catch(error) {
		response.statusText = error;
		response.status = 900;
		response.ok = false;
	}
	
	return response;
}

async function getGzText(url, options = {}) {
	var response = await tryFetch(url, options);
	if (response.ok) {
		if (response.status === 200) {
			response.text = async function() {
				let bt = await response.arrayBuffer();
    			return pako.inflate(bt, { to: 'string' });
			};
			return response;
		}
		/* Eat the response */
		response.text();
		console.log(`Fetch of ${url} failed with (${response.status}) ${response.statusText}`);
	}
	return response;
}

async function getGzJSON(url, options = {}) {
	var response = await tryFetch(url, options);
	if (response.ok) {
		if (response.status === 200) {
			response.json = async function() {
				let bt = await response.arrayBuffer();
    			return JSON.parse(pako.inflate(bt, { to: 'string' }));
			};
			return response;
		}
		/* Eat the response */
		response.text();
		console.log({error: response.statusText, url: url});
	}
	return response;
}

async function getJSON(url, options = {}) {
	var response = await tryFetch(url, options);
	if (response.ok) {
		response.data = await response.json();
	}
	return response;
}

async function getText(url, options = {}) {
	var response = await tryFetch(url, options);
	if (response.ok) {
		response.data = await response.text();
	}
	return response;
}

async function getTextFromDuet(rawpath, options = { normalize: false }) {
	let prefix = "";
	if (options.normalize) {
		prefix = DUEUI.RETRIEVE_PREFIX[resolvedSettings.backend_type] 
		 + ( rawpath.startsWith('/') ? "" : '/' );
	} 
	let resp = getText("http://" + resolvedSettings.duet_host 
		+ prefix
		+ rawpath);
	return resp;
}

async function getJSONFromDuet(rawpath, options = { normalize: false }) {
	let prefix = "";
	if (options.normalize) {
		prefix = DUEUI.RETRIEVE_PREFIX[resolvedSettings.backend_type] 
		 + ( rawpath.startsWith('/') ? "" : '/' );
	} 
	let resp = getJSON("http://" + resolvedSettings.duet_host 
		+ prefix
		+ rawpath);
	return resp;
}

async function getWebFile(path) {
	let resp = getText(rawpath);
	return resp;
}

async function loadGzElement(url, element, options) {
	var response = await getGzText(url, options);
	
	if (response.ok && response.status === 200) {
	    let str = await response.text();
		addHeadElement(str, element, options);
		return true;
	}
	
	return false;
}

async function getThemeList() {
	var localThemeList = [];

	var response = await getGzJSON("css/dueui-themes.css.gz");
	if (response.ok && response.status === 200) {
		let obj = await response.json();
		localThemeList.push(...obj.themes);
	} else {
		console.log("No themes: css/dueui-themes.css: ", error);
	}

	response = await getGzJSON("css/dueui-themes-custom.css.gz");
	if (response.ok && response.status === 200) {
		let obj = await response.json();
		localThemeList.push(...obj.themes);
	} else {
		console.log("No custom themes: css/dueui-themes-custom.css: ", error);
	}

	localThemeList.sort((a, b) => {
		return a.label.localeCompare(b.label);
	});

	return localThemeList;
}

function saveLocalSettings(settings) {
	console.log("Saving localSettings: ", {localSettings: settings});
	localStorage.setItem("config_version", DUEUI.CONFIG_VERSION);
	localStorage.dueui_settings = JSON.stringify(settings); 
	settingsDirty = false;
	$(".save_settings_button").removeClass("btn-warning");
}

function getStorageSettings(storage) {
	var localSettings = {};
	if (!storage.dueui_settings) {
		for (let q of Object.keys(storage)) {
			if (!q) {
				continue;
			}
			let val = nativeFromString(storage.getItem(q));
			localSettings[q] = val;
		}
	} else {
		localSettings = JSON.parse(storage.dueui_settings);
	}
	

	if (localSettings.backend_type && typeof localSettings.backend_type === "number") {
		localSettings.backend_type = DUEUI.BACKENDS[localSettings.backend_type];
	}

	return localSettings;
}


function getLocalSettings() {
	return getStorageSettings(localStorage);
}

function setSetting(setting, value) {
	resolvedSettings[setting] = value;
	console.log(`Saving setting '${setting}' = '${value}'`);
}

function getLocalSetting(setting, default_value) {
	return localStorage.getItem(setting) || default_value;
}

function setLocalSetting(setting, value) {
	localStorage.setItem(setting, value);
}

function setTheme(theme_name, theme_path) {
	if (theme_name && !theme_path) {
		theme_path = themeList.find(t => t.label === theme_name);
	}	
	
	console.log(`Loading theme ${theme_name} from ${theme_path}.gz`);
	loadGzElement(`${theme_path}.gz`, 'style', {id: 'theme', type: 'text/css'});
}

async function isStandalone(duet_host, duet_password) {
	console.log(`Testing ${duet_host} as Standalone`);	
	response = await tryFetch(duet_host + "/rr_connect" + (duet_password ? "?password=" + duet_password : ""));
	if (response.ok) {
		response.text();
		if (response.status === 200) {
			console.log(`${duet_host} is Standalone`);
			return true;
		}
	}
	console.log(`${duet_host} not Standalone: (${response.status}) ${response.statusText}`);
	return false; 
}

async function isDSF(duet_host) {
	console.log(`Testing ${duet_host} as DSF`);	
	response = await tryFetch(duet_host + "/machine/file/sys/config.g");
	if (response.ok) {
		response.text();
		if (response.status === 200) {
			console.log(`${duet_host} is DSF`);
			return true;
		}
	} 
	console.log(`${duet_host} not DSF: (${response.status}) ${response.statusText}`);
	return false; 
}

async function getHostBackendType(duet_host, duet_password) {
	if (await isStandalone(duet_host, duet_password)) {
		return DUEUI.BACKENDS.STANDALONE;
	}
	if (await isDSF(duet_host)) {
		return DUEUI.BACKENDS.DSF;
	}
	return DUEUI.BACKENDS.UNKNOWN;
}

async function getTextFile(url) {
	console.log("Trying to get file from " + config_url);
	let file = "";
	let response = await tryFetch(url);
	if (response.ok && response.status === 200) {
		file = await response.text();
		console.log("Got file from  " + url);
	} else {
		console.log(`Fetch of ${url} failed with (${response.status}) ${response.statusText}`);
	}
	return file;	
}

async function dueui_loader() {
	console.log("Initializing");
	let localSettings = getLocalSettings();
	if (!localStorage.getItem("config_version") || nativeFromString(localStorage.getItem("config_version")) < 100) {
		localSettings = {};
		localStorage.clear();
		localStorage.setItem("config_version", DUEUI.CONFIG_VERSION);
	} 
	console.log({localSettings: localSettings});
	
	let params = window.location.search.substr(1, window.location.search.length).split("&");
	var queryParamSettings = {};
	for (let q of params) {
		if (!q) {
			continue;
		}
		let kvp = q.split("=");
		let val = nativeFromString(decodeURIComponent(kvp[1]));
		queryParamSettings[decodeURIComponent(kvp[0])] = val;
	}
	console.log({queryParams: queryParamSettings});
	
	let response = {};
	let earlySettings = {...localSettings, ...queryParamSettings};
	let tempSettings = {
		duet_host: earlySettings.duet_host || document.location.host,
		dueui_config_url: earlySettings.dueui_config_url || "dueui_config_default.json"
	};
	
	tempSettings.backend_type = await getHostBackendType("http://" + tempSettings.duet_host, tempSettings.duet_password);
	
	if (tempSettings.backend_type == DUEUI.BACKENDS.UNKNOWN) {
		console.log(`${tempSettings.duet_host} is UNKNOWN: (${response.status}) ${response.statusText}`);
	}

	let config_file = "";
	
	console.log("Starting with config_url: " + tempSettings.dueui_config_url);
	
	if (tempSettings.dueui_config_url.startsWith("http")) {
		console.log("Trying direct: " + tempSettings.dueui_config_url);
		let response = await tryFetch(tempSettings.dueui_config_url);
		if (response.ok && response.status === 200) {
			config_file = await response.text();
			console.log("Got config file from  " + tempSettings.dueui_config_url);
		} else {
			console.log(tempSettings.dueui_config_url + " not a good config");
			alert(tempSettings.dueui_config_url + " not a good config");
		}
	} else if (tempSettings.backend_type == DUEUI.BACKENDS.UNKNOWN) {
		// This is probably a standalone web server
		console.log(`${tempSettings.duet_host} is not a Duet or DSF`);
		let m = tempSettings.dueui_config_url.match(/dueui_config_default[.]json/);
		let response = { ok: false };
		let url = "";
		let defaultUrl = "";
		if (!m) {
			// A user specified path.  Try exact.
			if (tempSettings.dueui_config_url.startsWith("/")) {
				url = `${window.location.origin}${tempSettings.dueui_config_url}`;
			} else {
				url = `${window.location.href.dirname()}/${tempSettings.dueui_config_url}`;
			}
			console.log(`Trying: '${url}'`);
			response = await tryFetch(tempSettings.dueui_config_url);
		}
		if (!response.ok) {
			defaultUrl = `${window.location.href.dirname()}/dueui_config_default.json`;
			console.log(`Trying: '${defaultUrl}'`);
			// Try dueui_config_default.json
			response = await tryFetch("dueui_config_default.json");
			if (response.ok) {
				console.log(`Config file '${url}' was not found.  Loaded '${defaultUrl}' instead`);
			}
		}
		
		if (response.ok) {
			config_file = await response.text();
			console.log("Got config file from  " + response.url);
		} else {
			console.log(`No config file was found at '${url ? url + 'or' : ''} '${defaultUrl}'`);
			alert(`No config file was found at '${url ? url + 'or' : ''} '${defaultUrl}'`);
		}
	} else {
		console.log(`${tempSettings.duet_host} is ${tempSettings.backend_type}`);
		let prefix = `http://${tempSettings.duet_host}${DUEUI.RETRIEVE_PREFIX[tempSettings.backend_type]}`;
		let m = tempSettings.dueui_config_url.match(/dueui_config_default[.]json/);
		let response = { ok: false };
		let url = "";
		let defaultUrl = "";
		if (!m) {
			url = `${prefix}${tempSettings.dueui_config_url[0] == "/" ? "" : "/sys/"}${tempSettings.dueui_config_url}`;
			console.log(`Trying: ${url}`);
			response = await tryFetch(url);
		}
		if (!response.ok) {
			defaultUrl = `${prefix}/sys/dueui_config_default.json`;
			console.log(`Trying: ${defaultUrl}`);
			response = await tryFetch(`${defaultUrl}`);
			if (response.ok) {
				console.log(`Config file '${url}' was not found.  Loaded '${defaultUrl}' instead`);
			}
		}
		
		if (response.ok) {
			config_file = await response.text();
			console.log("Got config file from  " + response.url);
		} else {
			console.log(`No config file was found at '${url ? url + 'or' : ''} '${defaultUrl}'`);
			alert(`No config file was found at '${url ? url + 'or' : ''} '${defaultUrl}'`);
		}
	}
	let configLoaded = false;
	if (config_file.length > 0) {
		addHeadElement(config_file, "script", {id: 'config-file', type: "text/javascript"})
		configLoaded = true;
	} else {
		console.log("No config file found");
	}
	
	resolvedSettings = { ...defaultSettings, 
		...configFileSettings,
		...localSettings,
		...queryParamSettings};

	if (resolvedSettings.backend_type === DUEUI.BACKENDS.UNKNOWN) {
		resolvedSettings.backend_type = await getHostBackendType("http://" + resolvedSettings.duet_host, resolvedSettings.duet_password); 
	}

	themeList = await getThemeList();

	loadGzElement('css/dueui-fonts.css.gz', 'style', {id: 'dueui-fonts-css', type: 'text/css'});
	loadGzElement('css/bootstrap.min.css.gz', 'style', {id: 'bootstrap-css', type: 'text/css'});
	
	if (resolvedSettings.theme_path || resolvedSettings.theme_path) {
		setTheme(resolvedSettings.theme_name, resolvedSettings.theme_path);
	}
	
    DueUI.startup(configLoaded);
}

dueui_loader();
