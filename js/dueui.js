/*
 * These jQuery extensions provide the ability to set an element's
 * position using the same syntax as jQuery-UI (without the overhead
 * of jQuery-UI)
 */

String.prototype.basename = function() { return this.split('/').slice(this[this.length - 1] == '/' ? -2 : -1)[0]; };
String.prototype.dirname = function() { return this.split('/').slice(0, this[this.length - 1] == '/' ? -2 : -1).join('/'); };

keyExistsOn = (o, k) => k.replace('[', '.').replace(']', '').split(".")
	.reduce((a, c) => a.hasOwnProperty(c) ? a[c] || 1 : false, Object.assign({}, o)) === false ? false : true;

classExists = (c) => typeof(c) == "function" && typeof(c.prototype) == "object" ? true : false;

async function delay(ms) {
	return await new Promise(resolve => setTimeout(resolve, ms));
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

function extendObject(current, extra) {
	return $.extend(true, {}, ...arguments);
}

var dueui;
const DUEUI = {
	BACKENDS: {
		UNKNOWN: 0,
		STANDALONE: 1,
		DSF: 2
	},
	BACKEND_NAMES: {
		0: "Unknown",
		1: "Standalone",
		2: "DSF",
	},
	BACKEND_CONFIGS: [
		"",
		"rr_download?name=/sys/dueui_config.json",
		"machine/file/sys/dueui_config.json"
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
}

var resolvedSettings = {
	'duet_host': document.location.host,
	'duet_debug_polling_enabled': 0,
	'dueui_settings_dont_send_gcode': 0,
	'duet_polling_enabled': 0,
	'dueui_test_mode': 0,
	'duet_update_time': 0,
	'show_tooltips': 1,
	'backend_type': DUEUI.BACKENDS.UNKNOWN,
	'theme': "css/dueui-Cerulean.theme.css",
	'duet_password': "reprap",
	'duet_poll_interval_1': 1000,
	'duet_poll_interval_2': 0,
	'duet_poll_interval_3': 5000,
	'rrf_version': 0,
};

function getSetting(setting, default_value) {
	if (setting in resolvedSettings) {
		return resolvedSettings[setting];
	}
	return default_value;
}

function setSetting(setting, value) {
	resolvedSettings[setting] = value;
	localStorage.setItem(setting, value);
	if (setting === "theme") {
		DueUI.setCurrentTheme(value);
	}
}

class DueUI {

	static getCurrentTheme() {
		return $("link[href$='.theme.css']").attr("href");
	}

	static setCurrentTheme(new_theme) {
		$("link[href$='.theme.css']").attr("href", new_theme);
	}

	static evalStatus(state, value, _this) {
		if (value.indexOf("${") >= 0) {
			if (!value.startsWith("`")) {
				value = "`" + value + "`";
			}
			try {
				let ev = eval(value);
				let nv = nativeFromString(ev);
				return nv;
			} catch (error) {
				dueui.logMessage("E", error.message + ": " + value);
				return Number.NaN;
			}
		}
		return value;
	}

	static rgb2hex(c) {
		return `rgb(${c[0]},${c[1]},${c[2]})`;
	}

	static pointInCircle(x, y, cx, cy, radius) {
		let dsq = (x - cx) * (x - cx) + (y - cy) * (y - cy);
		return dsq < (radius * radius);
	}

	static evalValue(str, value) {
		if (str.indexOf("${") >= 0) {
			if (!str.startsWith("`")) {
				str = "`" + str + "`";
			}
			try {
				return nativeFromString(eval(str));
			} catch (error) {
				dueui.logMessage("E", error.message + ": " + value);
				return Number.NaN;
			}
		}
		return str;
	}

	static evalValueStatus(str, value, state) {
		if (str.indexOf("${") >= 0) {
			if (!str.startsWith("`")) {
				str = "`" + str + "`";
			}
			try {
				return nativeFromString(eval(str));
			} catch (error) {
				dueui.logMessage("E", error.message + ": " + value);
				return Number.NaN;
			}
		}
		return str;
	}

	static formatTime(d) {
		var m = d.getMinutes();
		if (m < 10) m = "0" + m;
		var s = d.getSeconds();
		if (s < 10) s = "0" + s;
		return `${d.getHours()}:${m}:${s}`;
	}

	static formatElapsed(seconds) {
		let h = Math.floor(seconds / 3600);
		seconds -= (h * 3600);
		let m = Math.floor(seconds / 60);
		seconds -= (m * 60);
		seconds = seconds.toFixed(0);
		if (m < 10) m = "0" + m;
		if (seconds < 10) seconds = "0" + seconds;
		return `${h}:${m}:${seconds}`;
	}

	static getQueryParams() {
		let params = window.location.search.substr(1, window.location.search.length).split("&");
		let queryParams = {};
		for (let q of params) {
			let kvp = q.split("=");
			let val = nativeFromString(decodeURIComponent(kvp[1]));
			queryParams[decodeURIComponent(kvp[0])] = val;
		}
		return queryParams;
	}

	static async getSettingsFromConfig(configUrl) {
		let resp = {};
		try {
			resp.data = await $.ajax({
				url: configUrl,
				cache: false,
				dataType: "script",
				timeout: 2000
			});
			resp.data = new DueUISettings();
			resp.ok = true;
			console.log(`Retrieved config from ${configUrl}`);
			return resp.data;
		} catch (error) {
			console.log(error);
			resp.ok = false;
			resp.error = error;
			return resp;
		}
	}

	static async getSettings() {
		let l = localStorage.length;
		let localSettings = {};
		for (let i = 0; i < l; i++) {
			let name = localStorage.key(i);
			let val = localStorage.getItem(name);
			localSettings[name] = nativeFromString(val);
		}
		console.log({"localSettings": localSettings});

		let configSettings;
		let queryParams = DueUI.getQueryParams();
		console.log({"queryParams": queryParams});

		if ("dueui_config_url" in queryParams) {
			configSettings = await DueUI.getSettingsFromConfig(queryParams["dueui_config_url"]);
		}
		console.log({"configSettings": configSettings});

		$.extend(resolvedSettings, localSettings, configSettings, queryParams);

		let backendType = resolvedSettings["backend_type"];
		if (typeof backendType === "string") {
			let val;
			if (backendType.toUpperCase() === "DSF") {
				val = DUEUI.BACKENDS.DSF;
			} else if (backendType.toUpperCase() === "STANDALONE") {
				val = DUEUI.BACKENDS.STANDALONE;
			} else {
				val = DUEUI.BACKENDS.UNKNOWN;
			}
			resolvedSettings["backend_type"] = val;
		}

		if ("theme" in resolvedSettings) {
			let theme = resolvedSettings["theme"];
			if (!theme.match(/[.]css$/)) {
				resolvedSettings["theme"] = `css/dueui-${theme}.theme.css`;
			}
		}

		console.log({"resolvedSettings": resolvedSettings});
		return resolvedSettings;
	}

	static saveSettings(settings) {
		localStorage.clear();
		let keys = Object.keys(settings);
		for (let name of keys) {
			localStorage.setItem(name, settings[name]);
		}
	}

	static async startup() {
		let settings = await DueUI.getSettings();

		if (settings.backend_type == DUEUI.BACKENDS.DSF) {
			console.log("Initializing with existing backend type DSF");
			dueui = new DueUI_DSF(settings);
			dueui.startup();
			return;
		} else if (settings.backend_type == DUEUI.BACKENDS.STANDALONE) {
			console.log("Initializing with existing backend type STANDALONE");
			dueui = new DueUI_Standalone(settings);
			dueui.startup();
			return;
		} else {
			console.log("Probing backend type DSF");
			settings.backend_type = DUEUI.BACKENDS.DSF;
			let tmp_dueui = new DueUI_DSF(settings);
			let resp = await tmp_dueui.connect_once();
			if (!resp.ok) {
				console.log(resp);
				console.log("Probing backend type STANDALONE");
				settings.backend_type = DUEUI.BACKENDS.STANDALONE;
				tmp_dueui = new DueUI_Standalone(settings);
				resp = await tmp_dueui.connect_once();
			}

			if (!resp.ok) {
				console.log(resp);
				console.log("Unknown backend.  Showing settings");
				settings.backend_type = DUEUI.BACKENDS.UNKNOWN;
				new DueuiSettingsPanel(
					{ "position": "left top+64" }, $("body"));
				return;
			}
			dueui = tmp_dueui;
		}
		DueUI.saveSettings(settings);
		dueui.startup();
	}

	constructor(settings) {
		console.log(settings);
		this.lastLogMessage = "";
		this.model = this.initializeModel({}, settings.rrf_version);
		this.connected = false;
		this.connect_retry = 0;
		this.duet_connect_retries = {
			"number": 10,
			"interval": 5000
		};
		this.configured = false;
		$("head > title").html(`DueUI - ${getSetting("duet_host")}`);
	}

	patchModel(model, change) {
		return $.extend(true, model, change);
	}

	initializeModel(model, rrf_version) {
		this.patchModel(model, {
			"meta": {
				"rrfVersion": rrf_version,
			},
			"last": {
				"status": "",
				"reply_seq": 0,
				"messageBox": {
					"seq": 0
				},
				displayMessage: ""
			},
			"current": {
				"status": "",
				"reply_seq": 0,
				"messageBox": {
					"seq": 0
				},
				displayMessage: ""
			}
		});
		return model;
	}

	severityMap = ["I", "W", "E"];


	logMessage(severity, message) {
		if (typeof (message) === undefined) {
			return;
		}
		if (typeof (message) === 'string') {
			message = message.trim();
			if (message.length == 0) {
				return;
			}
		}
		if (message == this.lastLogMessage) {
			return;
		}
		this.lastLogMessage = message;

		var d = new Date();
		if (typeof (severity) === 'number') {
			severity = this.severityMap[severity];
		}
		var msg = { "timestamp": d, "severity": severity, "message": message };
		console.log("Log: ", msg);
		$(".log-message-listener").trigger("log_message", msg);
	}

	printFile(file) {
		this.sendGcode({ "gcode": `M32 "${file}"`, "get_reply": true });
	}

	addGcodeReplyListener(callback) {
		this.gcode_reply_subscriptions.add(callback);
	}
	removeGcodeReplyListener(callback) {
		this.gcode_reply_subscriptions.remove(callback);
	}

	showStartupSettings(msg) {
		this.startup_settings = new DueuiSettingsPanel(
			{ "position": "left top+64" }, $("body"));

	}
	removeStartupSettings() {
		if (this.startup_settings) {
			this.startup_settings.jq.remove();
			this.jq.empty();
		}
	}

	populate(config_data) {
		$.extend(true, this, config_data);
		var ec = $.extend(true, {
			"id": "dueui",
			"style": {
				"position": "absolute",
				"width": "98%",
				"height": "98%"
			}
		}, this.dueui_content);
		var p = new (DueuiElement.getElementClass(this.dueui_content.type))(ec, $("body"));
	}

	async postData(rawpath, data) {
		let resp = {};
		try {
			resp.data = await $.post(`http://${getSetting("duet_host")}${rawpath}`, data);
			resp.ok = true;
		} catch (error) {
			resp.error = error;
			resp.ok = false;
			console.log(error);
		}
		return resp;
	}

	async getText(rawpath) {
		let resp = {};

		try {
			resp.data = await $.get(`http://${getSetting("duet_host")}${rawpath}`);
			resp.ok = true;
		} catch (error) {
			resp.error = error;
			resp.ok = false;
			console.log(rawpath, error);
		}
		return resp;
	}

	async getJSON(rawpath, jsonpCallback) {
		let resp = {};
		let path = `http://${getSetting("duet_host")}${rawpath}`;
		try {
			if (typeof jsonpCallback === "undefined") {
				resp.data = await $.getJSON(path);
			} else {
				resp.data = await $.ajax({
					url: path,
					dataType: "jsonp",
					jsonp: "callback",
					jsonpCallback: jsonpCallback
				});
			}
			resp.ok = true;
		} catch (error) {
			resp.error = error;
			resp.ok = false;
			console.log(path, error);
		}
		return resp;
	}

	async getWebFile(path) {
		let resp = {};
		try {
			resp.data = await $.get(path);
			resp.ok = true;
		} catch (error) {
			resp.error = error;
			resp.ok = false;
			console.log(path, error);
		}
		return resp;
	}

	async getThemeList() {
		let resp = {};
		let themeList = [];

		try {
			resp = await this.getWebFile("css/dueui-themes.css");
			if (resp.ok) {
				let obj = JSON.parse(resp.data);
				themeList.push(...obj.themes);
			}
		} catch (error) {
			console.log("No themes: css/dueui-themes.css: ", error);
			return [];
		}

		try {
			resp = await this.getWebFile("css/dueui-themes-custom.css");
			if (resp.ok) {
				let obj = JSON.parse(resp.data);
				themeList.push(...obj.themes);
			}
		} catch (error) {
			console.log("No themes: css/dueui-themes-custom.css: ", error);
		}

		themeList.sort((a, b) => {
			return a.label.localeCompare(b.label);
		});

		return themeList;
	}

	async getConfig(config) {
		let resp = {};
		if (classExists(DueUIConfig)) {
			resp.data = new DueUIConfig();
			resp.ok = true;
			this.logMessage("I", `Retrieved config from ${config}`);
			return resp;
		}
		try {
			resp.data = await $.ajax({
				url: config,
				cache: false,
				dataType: "script",
				timeout: 2000
			});
			resp.data = new DueUIConfig();
			resp.ok = true;
			this.logMessage("I", `Retrieved config from ${config}`);
		} catch (error) {
			console.log(error);
			resp.ok = false;
			resp.error = error;
		}
		return resp;
	}

	async connect(url) {
		let resp = {};
		this.connect_retry = 0;

		if (!getSetting("dueui_test_mode", false)) {

			$(".connection-listener").trigger("duet_connection_change", { "status": "connecting" });
			this.connected = false;
			while (!this.connected && this.connect_retry <= this.duet_connect_retries.number) {
				resp = await this.connect_once(url);
				if (!resp.ok) {
					this.connect_retry++;
					this.logMessage("W", `Connection attempt ${this.connect_retry} of ${this.duet_connect_retries.number} failed`);
					$(".connection-listener").trigger("duet_connection_change", { "status": "retrying", "retry": this.connect_retry });
					delay(this.duet_connect_retries.interval);
					continue;
				}
				this.connected = true;
			}
			if (!this.connected) {
				return resp;
			}

			if (this.connect_retry > 0) {
				$(".connection-listener").trigger("duet_connection_change", { "status": "reconnected", "response": "OK" });
				this.logMessage("I", "Reconnected");
			} else {
				$(".connection-listener").trigger("duet_connection_change", { "status": "connected", "response": "OK" });
				this.logMessage("I", "Connected");
			}
			this.connect_retry = 0;

			resp = await this.startPolling();
			if (!resp.ok) {
				dueui.logMessage("E", resp.error);
			}
			$("body").addClass("dueui-setting-listener");
			$("body").on("duet_polling_enabled", (event, value) => {
				if (value) {
					this.startPolling();
				} else {
					this.stopPolling();
				}
			});
		}

		let c_url;
		if (getSetting("dueui_config_url", "").length == 0) {
			c_url = `http://${getSetting("duet_host")}/${DUEUI.BACKEND_CONFIGS[getSetting("backend_type", 0)]}`;
		} else {
			c_url = getSetting("dueui_config_url", "");
		}
		resp = await this.getConfig(c_url);
		if (!resp.ok) {
			alert(`Could not retrieve config from ${c_url}`);
			return resp;
		}
		if (getSetting("dueui_config_url", "").length == 0) {
			setSetting("dueui_config_url", c_url);
		}
		this.active_config_url = resp.config_url;
		this.configured = true;
		this.status_map = resp.data.status_map;
		this.dueui_content = resp.data.dueui_content;
		DueUIConfig = resp.data;

		this.populate(this.dueui_content);
		this.logMessage("I", `DueUI Version ${dueui_version}`);

		if (!getSetting("dueui_test_mode", false)) {
			this.sendGcode({ "gcode": "M115", "no_echo": true });
		}

		return resp;
	}

	disconnect() {
		this.connect_retry = 0;
		this.connected = false;
		$(".connection-listener").trigger("duet_connection_change", { "status": "disconnected" });
	}

	async startup() {
		$("#dueui_startup").remove();
		DueUI.setCurrentTheme(getSetting("theme", "Cerulean"));
		this.id = "dueui";
		this.jq = $("#dueui");
		$("body").addClass(`connection-listener ui ui-widget-content bg-light`);

		if (getSetting("duet_polling_enabled", 0) != 1) {
			this.showStartupSettings();
			return;
		}

		let resp = await this.connect(getSetting("duet_host"));
		if (!resp.ok) {
			alert(`Could not connect to ${getSetting("duet_host")} or retrieve any config files`);
			this.showStartupSettings();
			return;
		}

		$("body").on("duet_connection_change", (event, response) => {
			if (response.status === "reconnected") {
				location.reload(true);
				return;
			}
			this.removeStartupSettings();
		});
	}

}

class DueUI_DSF extends DueUI {

	async connect_once(host) {
		let resp = {};
		try {
			let resp = await super.getJSON("/machine/status");
			if (resp.ok) {
				this.initializeModel(this.model, 3);
				this.connected = true;
				let data = resp.data;
				if (resp.data.result) {
					data = resp.data.result;
				}
				this.patchModel(this.model, data);
				this.model.current.status = this.model.state.status;
				this.model.current.displayMessage = this.model.state.displayMessage;
				this.patchModel(this.model.current.messageBox, data.state.messageBox);
				console.log("Combined Model:", this.model);
			}
		} catch (error) {
			console.log(error);
			resp.error = error;
			this.model.meta.rrfVersion = 0;
			resp.ok = false;
			this.connected = false;
		}
		return resp;
	}

	constructor(settings) {
		super(settings);
	}

	normalizePath(path) {
		if (path[0] === '/') {
			return "/machine/file" + path;
		} else {
			return "/machine/file/" + path;
		}
	}

	async getText(rawpath) {
		return super.getText(this.normalizePath(rawpath));
	}

	async getJSON(rawpath, jsonpCallback) {
		return super.getText(this.normalizePath(rawpath));
	}

	async deleteFile(path) {
		let resp = {};
		try {
			path = this.normalizePath(path);
			resp.data = await $.ajax({
				url: `http://${getSetting("duet_host")}${path}`,
				method: "DELETE"
			});
			resp.ok = true;
		} catch (error) {
			resp.error = error;
			resp.ok = false;
			console.log(error);
		}
		return resp;
	}

	async getFileList(directory) {
		let resp = await super.getJSON(`/machine/directory${directory}`);
		if (!resp.ok) {
			return [];
		}
		return resp.data;
	}

	async sendGcode(gcodes) {
		let resp = {
			ok: true,
			replies: []
		};

		if (!Array.isArray(gcodes)) {
			gcodes = [gcodes];
		}

		for (let ge of gcodes) {
			if (typeof (ge) === 'string') {
				ge = { "gcode": ge, "get_reply": false };
			}
			if (!keyExistsOn(ge, "no_event")) {
				ge.no_event = false;
			}

			let d = new Date();
			$(".gcode-sent-listener").trigger("gcode_sent", {
				"timestamp": d,
				"gcode": ge.gcode.trim()
			});

			ge.gcode = ge.gcode.replace(/;/g, "\n");
			let gc = ge.gcode.trim();
			if (getSetting("dueui_settings_dont_send_gcode", 0) == 1) {
				this.logMessage("D", `GCode: ${gc}`);
				continue;
			}

			let single_resp = await super.postData("/machine/code", gc);
			if (!single_resp.ok) {
				this.logMessage("E", `GCode: ${gc}  Error: ${single_resp.error.responseText}`);
				return single_resp;
			} else {
				resp.replies.push(single_resp.data);
				let response = "";
				if (single_resp.data) {
					response = single_resp.data.trimStart().trim();
				}
				if (!ge.no_event && response.length > 0) {
					$(".gcode-reply-listener").trigger("gcode_reply", {
						"timestamp": d,
						"gcode": gc,
						"response": response
					});
				}
			}
		}

		return resp;
	}

	processWebSocketMsg(msg) {
		let data = JSON.parse(msg.data);
		if (getSetting("duet_debug_polling_enabled", false)) {
			console.log(data);
		}

		if (keyExistsOn(data, "messages")) {
			for (let m of data.messages) {
				this.logMessage(m.type, m.content);
			}
			delete data.messages;
		}

		$.extend(true, this.model, data);
		if (getSetting("duet_debug_polling_enabled", false)) {
			console.log(this.model);
		}

		if (this.model.state.status !== this.current_status) {
			this.current_status = this.model.state.status;
			$(`.status-change-listener`).trigger("duet_status_change", this.model.state.status);
		}
		if (keyExistsOn(data, "state.displayMessage") && data.state.displayMessage.length > 0) {
			this.logMessage("I", data.state.displayMessage);
		}
		$(`.state-poll-listener`).trigger("duet_poll_response", this.model);
	}

	async pollOnce(poll_level, notify, lock) {

	}

	stopPolling() {
		this.websocket.close();
	}

	async startPolling() {
		let _this = this;
		let resp = {};
		resp.ok = true;

		let ws_url = `ws://${getSetting("duet_host")}/machine`;
		try {
			this.websocket = new WebSocket(ws_url);

			this.websocket.onmessage = (data) => {

				this.processWebSocketMsg(data);
				if (this.websocket.readyState == 1) {
					this.websocket.send("OK\n");
				}
			};

			this.websocket.onopen = (e) => {
				console.log(e);
				this.logMessage("E", `Websocket opened.`);
				setTimeout(() => {
					this.websocket.send("OK\n");
				}, 1000);
			};

			this.websocket.onclose = (e) => {
				console.log(e);
				this.logMessage("E", `Websocket closed.`);
				if (getSetting("duet_polling_enabled", false)) {
					this.logMessage("E", "Waiting 5 seconds to try");
					setTimeout(() => {
						this.startPolling();
					}, 5000);
				}
			};
		} catch (error) {
			resp.ok = false;
			resp.error = error;
			console.log(error);
			_this.logMessage("E", `Failed to connect websocket.  Please refresh.`);
		}

		return resp;
	}
}

class DueUI_Standalone extends DueUI {

	async connect_once(url) {
		let resp = {};
		try {
			resp = await super.getJSON(`/rr_connect?password=${encodeURI(getSetting("duet_password", ""))}`);
			if (!resp.ok) {
				return resp;
			}

			if (this.model.meta.rrfVersion === 3 || this.model.meta.rrfVersion === 0) {
				resp = await super.getJSON("/rr_model");
				console.log("rr_model resp: ", resp);
				if (resp.ok) {
					let keys = Object.keys(resp.data.result);
					this.model = resp.data.result;
					for (let name of keys) {
						let resp2 = await super.getJSON(`/rr_model?key=${name}&flags=nvd10`);
						this.patchModel(resp.data.result[name], resp2.data.result);
					}
					this.initializeModel(this.model, 3);
					this.connected = true;
					this.patchModel(this.model, resp.data.result);
					this.model.current.status = this.model.state.status;
					this.model.current.reply_seq = this.model.seqs.reply;
					this.model.current.displayMessage = this.model.state.displayMessage;
					this.patchModel(this.model.current.messageBox, resp.data.result.state.messageBox);
					console.log({ "model": this.model });

					return resp;
				}
			}

			if (this.model.meta.rrfVersion === 2 || this.model.meta.rrfVersion === 0) {
				resp = await super.getJSON("/rr_status?type=1");
				if (resp.ok) {
					$.extend(true, this.model, resp.data);
					resp = await super.getJSON("/rr_status?type=3");
					if (resp.ok) {
						this.initializeModel(this.model, 2);
						this.connected = true;
						this.initializeModel(this.model);
						this.patchModel(this.model, resp.data);

						this.model.current.status = this.model.status;
						this.model.current.reply_seq = this.model.seq;
						this.model.current.displayMessage = this.model.output.displayMessage;
						this.model.current.messageBox.axisControls = this.model.output.msgBox.controls;
						this.model.current.messageBox.mode = this.model.output.msgBox.mode;
						this.model.current.messageBox.message = this.model.output.msgBox.msg;
						this.model.current.messageBox.seq = this.model.output.msgBox.seq;
						this.model.current.messageBox.timeout = this.model.output.msgBox.timeout;
						this.model.current.messageBox.title = this.model.output.msgBox.title;
						console.log("Combined Model:", this.model);

						return resp;
					}
				}
			}
		} catch (error) {
			console.log(error);
			this.model.meta.rrfVersion = 0;
			resp.error = error;
			this.connected = false;
			resp.ok = false;
		}
		return resp;
	}

	constructor(settings) {
		super(settings);
		this.last_poll = [0, 0, 0, 0];
		this.current_poll_response = {};
		this.poll_in_flight = false;
		this.pollOnce(3, false, true);
	}

	normalizePath(path) {
		if (path[0] === '/') {
			return "/rr_download?name=" + path;
		} else {
			return "/rr_download?name=/" + path;
		}
	}

	async getText(rawpath) {
		return super.getText(this.normalizePath(rawpath));
	}

	async getJSON(rawpath, jsonpCallback) {
		return super.getText(this.normalizePath(rawpath));
	}

	async getFileList(directory) {
		let first = -1;
		let files = [];

		while (first != 0) {
			let resp = await super.getJSON(`/rr_filelist?dir=${directory}` + (first > -1 ? `&first=${first}` : ""));
			if (!resp.ok) {
				console.log(resp.error);
				return files;
			}
			files.push(...resp.data.files);
			if (resp.data.next == 0) {
				return files;
			}
			first = resp.data.next;
		}
		return files;
	}

	async processPollResponse() {

		if (this.model.current.status !== this.model.last.status) {
			$(`.status-change-listener`).trigger("duet_status_change", this.model.current.status);
		}
		$(`.state-poll-listener`).trigger("duet_poll_response", this.model);

		if (this.model.current.displayMessage !== this.model.last.displayMessage) {
			this.logMessage("I", this.model.current.displayMessage);
		}

		if (this.model.current.reply_seq !== this.model.last.reply_seq) {
			let resp = await this.getGcodeReply();
			if (resp.replies.length > 0) {
				for (let r in resp.replies) {
					this.logMessage("I", resp.replies[r]);
				}
			}
		}
	}

	async pollOnce(poll_level, notify, lock) {
		if (!this.connected) {
			return { "ok": false, "error": "not connected" };
		}
		if (lock) {
			if (this.poll_in_flight) {
				if (getSetting("duet_debug_polling_enabled", false) == 1) {
					console.log({ "poll_level": poll_level }, "Locked");
				}
				return { "ok": false, "error": "locked" };
			}
			this.poll_in_flight = true;
		}

		let purl = "";
		if (this.model.meta.rrfVersion === 3) {
			purl = "/rr_model?flags=fnd10"
		} else {
			purl = `/rr_status?type=${poll_level}`;
		}

		$.extend(true, this.model.last, this.model.current);

		let resp = await super.getJSON(purl);
		if (!resp.ok) {
			this.logMessage("W", `Poll type ${poll_level} failed`);
			this.poll_in_flight = false;
			return resp;
		}

		if (this.model.meta.rrfVersion === 3) {
			let newseq = resp.data.result.seqs;
			let keys = Object.keys(newseq);
			for (let key of keys) {
				if (newseq[key] != this.model.seqs[key]) {
					let resp2 = await super.getJSON(`/rr_model?key=${key}&flags=nvd10`);
					if (!resp.ok) {
						this.logMessage("W", `Poll type ${poll_level} failed`);
						this.poll_in_flight = false;
						return resp;
					}
					$.extend(true, resp.data.result[key], resp2.data.result);
				}
			}
			$.extend(true, this.model, resp.data.result);
			this.model.current.status = this.model.state.status;
			this.model.current.reply_seq = this.model.seqs.reply;
			this.model.current.displayMessage = this.model.state.displayMessage;
			$.extend(true, this.model.current.messageBox, resp.data.result.state.messageBox);
		} else {
			$.extend(true, this.model, resp.data);
			this.model.current.displayMessage = this.model.output.displayMessage;
			this.model.current.messageBox.axisControls = this.model.output.msgBox.controls;
			this.model.current.messageBox.mode = this.model.output.msgBox.mode;
			this.model.current.messageBox.message = this.model.output.msgBox.msg;
			this.model.current.messageBox.seq = this.model.output.msgBox.seq;
			this.model.current.messageBox.timeout = this.model.output.msgBox.timeout;
			this.model.current.messageBox.title = this.model.output.msgBox.title;
		}

		if (getSetting("duet_debug_polling_enabled", false) == 1) {
			console.log({ "poll_level": poll_level, "response": this.model });
		}
		if (notify) {
			await this.processPollResponse();
		}
		if (lock) {
			this.poll_in_flight = false;
		}
		return resp;
	}

	stopPolling() {
		clearInterval(this.pollerIntervalId);
	}

	async startPolling() {
		let pi_1 = getSetting("duet_poll_interval_1", 0);
		let pi_2 = getSetting("duet_poll_interval_2", 0);
		let pi_3 = getSetting("duet_poll_interval_3", 0);
		let dpi = getSetting("duet_polling_enabled", 0);


		let interval = Math.min(
			250,
			getSetting("duet_poll_interval_1", 99999),
			getSetting("duet_poll_interval_2", 99999),
			getSetting("duet_poll_interval_3", 99999)
		);

		let resp = await this.pollOnce(1, false, true);
		if (!resp.ok) {
			return resp;
		}
		resp = await this.pollOnce(2, false, true);
		if (!resp.ok) {
			return resp;
		}
		resp = await this.pollOnce(3, true, true);
		if (!resp.ok) {
			return resp;
		}

		this.pollerIntervalId = setInterval(async () => {
			if (!this.connected || !this.configured || dpi != 1) {
				return;
			}
			let now = Date.now();
			let poll_level = -1;
			if (pi_3 > 250
				&& now - this.last_poll[3] >= pi_3) {
				poll_level = 3;
				this.last_poll[3] = now;
			} else if (pi_2 > 250
				&& now - this.last_poll[2] >= pi_2) {
				poll_level = 2;
				this.last_poll[2] = now;
			} else if (pi_1 > 250
				&& now - this.last_poll[1] >= pi_1) {
				poll_level = 1;
				this.last_poll[1] = now;
			}

			if (this.connected && poll_level > 0 && dpi == 1) {
				this.pollOnce(poll_level, true, true);
			}
		}, interval);
		return resp;
	}

	async getGcodeReply(gc) {
		let tempgc = gc || { no_echo: true, gcode: "" };
		let resp = {
			ok: true,
			replies: []
		};
		let mseq = this.model.meta.rrfVersion === 3 ? this.model.seqs.reply : this.model.seq;

		while (this.model.last.reply_seq < this.model.current.reply_seq) {
			let tempresp = await super.getText("/rr_reply");
			if (!tempresp.ok) {
				this.logMessage("E", tempresp.error);
				return tempresp;
			}
			resp.replies.push(tempresp.data);
			this.model.last.reply_seq++;
		}

		return resp;
	}

	async sendGcode(gcodes) {
		this.poll_in_flight = true;

		let resp = {
			ok: true,
			replies: []
		};

		if (!Array.isArray(gcodes)) {
			gcodes = [gcodes];
		}

		for (let ge of gcodes) {
			if (typeof (ge) === 'string') {
				ge = { "gcode": ge, "get_reply": false };
			}
			let gc = ge.gcode.trim().replace(/;/g, "\n");

			if (getSetting("dueui_settings_dont_send_gcode", 0) == 1) {
				this.logMessage("D", `GCode: ${gc}`);
				continue;
			}

			let uri = `/rr_gcode?gcode=${encodeURIComponent(gc)}`;
			let single_resp = await super.getJSON(uri);
			if (!single_resp.ok) {
				this.logMessage("E", `GCode: ${gc}  Error: ${single_resp.error.responseText}`);
				return single_resp;
			} else {
				let pollresp = await this.pollOnce(1, false, false);
				let reply = await this.getGcodeReply(ge);
				resp.replies = reply.replies;

				if (!ge.no_event && reply.replies.length > 0) {
					for (let r in reply.replies) {
						if (reply.replies[r].trim().length == 0) {
							continue;
						}
						let d = new Date();
						$(".gcode-reply-listener").trigger("gcode_reply", {
							"timestamp": d,
							"gcode": (ge.no_echo ? "" : gc),
							"response": reply.replies[r].trim()
						});
					}
				}
			}
		}
		this.poll_in_flight = false;
		return resp;
	}
}
