/*
 * These jQuery extensions provide the ability to set an element's
 * position using the same syntax as jQuery-UI (without the overhead
 * of jQuery-UI)
 */

String.prototype.basename = function() { return this.split('/').slice(this[this.length-1] == '/' ? -2 : -1)[0]; }
String.prototype.dirname = function() { return this.split('/').slice(0,this[this.length-1] == '/' ? -2 : -1).join('/'); }

keyExistsOn = (o, k) => k.replace('[','.').replace(']','').split(".")
	.reduce((a, c) => a.hasOwnProperty(c) ? a[c] || 1 : false, Object.assign({}, o)) === false ? false : true;

async function delay(ms) {
	return await new Promise(resolve => setTimeout(resolve, ms));
}

function nativeFromString(vs) {
	if (typeof(vs) !== 'string') {
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

const DUEUI = {
	BACKENDS: {
		STANDALONE: 0,
		DSF: 1
	},
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
		SUBMIT: "dueui-submit"
	},
}

jQuery.fn.extend({
	calcOffset: function calcOffset(pos) {
		let n = pos.match(/(left|center|right)(([+-])(\d+))?\s+(top|center|bottom)(([+-])(\d+))?/i);
		let width = this.outerWidth();
		let height = this.outerHeight();

		let left = 0;
		switch(n[1]) {
		case "left":
			break;
		case "right":
			left += width;
			break;
		case "center":
			left += (width / 2);
			break;
		}
		if (n[2]) {
			left += parseFloat(n[2]);
		}

		let top = 0;
		switch(n[5]) {
		case "top":
			break;
		case "bottom":
			top += height;
			break;
		case "center":
			top += (height / 2);
			break;
		}
		if (n[6]) {
			top += parseFloat(n[6]);
		}

		return {"left": left, "top": top};
	},
	dueuiPosition: function dueuiPosition(pos) {
		let my_offset = this.calcOffset(pos.my);
		let of_offset = $(pos.of).calcOffset(pos.at);
		let of_pos = $(pos.of).offset();
		let dest = {"left": of_pos.left + of_offset.left, "top": of_pos.top + of_offset.top};

		this.offset({"left": (dest.left - my_offset.left), "top": (dest.top - my_offset.top)});
	}
});

class DueuiElement {

	static addElementType(type_name, type_class) {
		DueuiElement.registry[type_name] = type_class;
	}

	static getElementClass(type_name) {
		return DueuiElement.registry[type_name];
	}

	constructor(html_element_type, config, parent) {
		$.extend(true, this, {
			"origin": "left top",
			"classes": [],
			"style": {
			},
			"element_configs": [],
			"element_defaults": {},
			"elements": []
		}, config);

		this.jq = $(`<${html_element_type}/>`);
		if (this.id) {
			this.jq.attr("id", this.id);
		}
		if (this.attr) {
			this.jq.attr(this.attr);
		}

		this.updateClass(this.classes);

		if (parent && parent.hasClass("dueui-panel-tab")) {
			this.style = $.extend(true, {"position": "absolute"}, this.style);
		}
		this.css(this.style);

		if (parent) {
			if (parent instanceof jQuery) {
				parent.append(this.jq);
			} else {
				parent.append(this);
			}
		}
		this.parent = parent;
		this.jq.data(this);

		if (!this.on || !this.on[DUEUI.EVENTS.UPDATE_VALUE]) {
			this.jq.on(DUEUI.EVENTS.UPDATE_VALUE, (event, value) => {
				if (this.val) {
					let v = DueUI.evalValue(value, this.val());
					this.val(v);
				}
				event.stopPropagation();
			});
		}

		if (!this.on || !this.on[DUEUI.EVENTS.UPDATE_LABEL]) {
			this.jq.on(DUEUI.EVENTS.UPDATE_LABEL, (event, value) => {
				if (!this.label_widget) {
					return;
				}
				if (this.label_widget.val) {
					let v = DueUI.evalValue(value, this.label_widget.val());
					this.label_widget.val(v);
				}
				event.stopPropagation();
			});
		}

		if (!this.on || !this.on[DUEUI.EVENTS.ENABLE]) {
			this.jq.on(DUEUI.EVENTS.ENABLE, (event, value) => {
				this.jq.children().attr("readonly", value);
				if (value) {
					this.jq.children().show();
				} else {
					this.jq.children().hide();
				}
				event.stopPropagation();
			});
		}

		if (this.on) {
			for (const o in this.on) {
				this.jq.on(o, (event, value) => {
					this.on[o].call(this, event, value);
					event.stopPropagation();
				});
			}
		}
	}

	hasClass(classname) {
		let t = (this instanceof jQuery) ? this : (this.css_object ? this.css_object : this.jq);
		return t.hasClass(classname);
	}

	addClasses(classes) {
		let t = (this instanceof jQuery) ? this : (this.css_object ? this.css_object : this.jq);
		t.addClass(Array.isArray(classes) ? classes.join(" ") : classes);
	}
	addClass(classes) {
		this.addClasses(classes);
	}

	removeClasses(classes) {
		let t = (this instanceof jQuery) ? this : (this.css_object ? this.css_object : this.jq);
		t.removeClass(Array.isArray(classes) ? classes.join(" ") : classes);
	}
	removeClass(classes) {
		this.removeClasses(classes);
	}

	static updateClasses(obj, classes) {
		let t = (obj instanceof jQuery) ? obj : (obj.css_object ? obj.css_object : obj.jq);
		let class_array = Array.isArray(classes) ? classes : classes.split(' ');
		for (let c of class_array) {
			if (c[0] === '+' || c[0] === '-') {
				if (c[0] === '-') {
					t.removeClass(c.slice(1));
				} else {
					t.addClass(c.slice(1));
				}
			} else {
				t.addClass(c);
			}
		}
	}

	updateClass(classes) {
		DueuiElement.updateClasses(this, classes);
	}

	getStateObject(state) {
		if (!keyExistsOn(this, "state.states") || !Array.isArray(this.state.states)) {
			return undefined;
		}
		return this.state.states.find((e) => e.state === state);
	}

	applyState() {

		if (!keyExistsOn(this, "state.current") || this.state.current === this.state.last) {
			return;
		}

		let cs = this.getStateObject(this.state.current);
		if (!cs) {
			return;
		}

		this.state.last = this.state.current;

		if (cs.style) {
			this.css($.extend(true, {}, this.style, cs.style));
		}

		if (cs.classes) {
			this.removeClasses(this.state.merged_classes);
			this.addClasses(cs.classes);
		}

		if (cs.value) {
			this.val(cs.value);
		}
	}

	clearState() {
		this.removeClasses(this.state.merged_classes || []);
		this.state.last = -2;
		this.state.current = 0;
	}

	css(style) {
		let t = (this instanceof jQuery) ? this : (this.css_object ? this.css_object : this.jq);
		return t.css(style);
	}

	updateId(new_id) {
		this.id = new_id;
		if (this.jq) {
			this.jq.attr("id", new_id);
		}
	}

	append(e) {
		if (e instanceof jQuery) {
			this.jq.append(e);
			return;
		}

		e.parent_element = this;
		this.jq.append(e.jq);
		if (e.position) {
			e.jq.dueuiPosition(e.position);
		}
	}

	appendTo(dest) {
		dest.append(this);
	}

	publishEvents(events, data, event) {
		let eas;
		if (Array.isArray(events)){
			eas = events;
		} else {
			eas = [events];
		}
		for(let ea of eas) {
			$(`#${ea.target}`).trigger(ea.event, data, event);
		}
	}

	setOnEvent(trigger, onevent, data){
		this.jq.on(trigger, (event) => {
			onevent(event, data);
		});
	}

	setupEvents(native_event, run_startup_actions) {
		if (native_event && native_event.length > 0) {
			this.jq.on(native_event, (event) => {
				if (native_event === 'keypress' && event.key !== "Enter") {
					return;
				}
				this.jq.trigger("dueui-submit", event);
			});
		}
		if (this.submit_on_event) {
			this.jq.on(this.submit_on_event, (event) => {
				this.jq.trigger("dueui-submit", event);
			});
		}

		this.jq.on("dueui-submit", (event) => {
			if (this.onsubmit) {
				this.onsubmit(event);
			}
			if (keyExistsOn(this, "state.current")) {
				let cs = this.getStateObject(this.state.current);
				if (cs && cs.actions) {
					this.runActions(cs.actions, false);
					this.applyState();
				}
			}
			if (this.actions) {
				this.runActions(this.actions, false);
			}
		});

		if (this.actions && run_startup_actions) {
			this.runActions(this.actions, true);
			setTimeout(() => {this.applyState();}, 500);
		}

		if (keyExistsOn(this, "state.states[0].actions")) {
			let a = [];
			for(let s of this.state.states) {
				if (s.actions) {
					if (Array.isArray(s.actions)) {
						a.push(...s.actions);
					} else {
						a.push(s.actions);
					}
				}
			}
			a = a.filter((e) => e.fire_on_startup);
			if (a.length > 0) {
				this.runActions(a, true);
				setTimeout(() => {this.applyState();}, 500);
			}
		}
	}

	runActions(action, run_on_startup) {
		if (!Array.isArray(action)) {
			action = [ action ];
		}
		loop:
		for(let a of action) {
			if (run_on_startup && !a.fire_on_startup) {
				continue;
			}
			let a2 = $.extend(true, {}, a);
			switch(a.type) {
			case "gcode":
				a2.gcode = DueUI.evalValueStatus(a2.gcode, this.val(), this.current_status);
				dueui.sendGcode(a2);
				break;
			case "macro":
				if (a2.file) {
					if (!a2.file.endsWith(".g")) a2.file += ".g";
					dueui.sendGcode({"gcode": `M98 P"${a2.file}"`});
				} else if (a2.macro) {
					if (!a2.macro.endsWith(".g")) a2.macro += ".g";
					dueui.sendGcode({"gcode": `M98 P"/macros/${a2.macro}"`});
				} else {
					dueui.logMessage("E", "No 'file' or 'macro' parameter present");
				}
				break;
			case "print":
				dueui.printFile(a2.file);
				break;
			case "setting": {
				if (run_on_startup) {
					if (keyExistsOn(this, "state.states[0].actions")) {
						this.state.current = dueui.getSetting(a2.setting);
					} else {
						this.val(dueui.getSetting(a2.setting));
					}
				} else {
					let val;
					if (keyExistsOn(this, "state.states[0].actions")) {
						this.state.current++;
						if (this.state.current >= this.state.states.length) {
							this.state.current = 0;
						}
						val = this.state.current;
					} else {
						val = (a2.value ? DueUI.evalValue(a2.value, this.val()) : this.val());
					}
					dueui.setSetting(a2.setting, val);
				}
				break;
			}
			case "event": {
				let val;
				if (a2.value) {
					if (/^[-+]?([0-9]*)([.][0-9]+)?$/.test(a2.value)) {
						val = Number(a2.value);
					} else {
						if (!a2.no_eval) {
							val = DueUI.evalValue(a2.value, this.val());
						} else {
							val = a2.value;
						}
					}
				} else {
					val = this.val();
				}
				let t = 0;
				if (run_on_startup) {
					t = 1000;
				}
				setTimeout(() => {
					$(`${a2.target}`).trigger(a2.event, val);
				}, t);
				break;
			}
			case "log": {
				let val = (a2.value ? DueUI.evalValue(a2.value, this.val()) : this.val());
				dueui.logMessage(a2.severity || "I", val);
				break;
			}
			case "callback":
				a2.callback();
				break;
			case "ui":
				switch(a2.action) {
				case "fullscreen_toggle":
					if (!document.fullscreenElement) {
						document.body.requestFullscreen();
					} else {
						document.exitFullscreen();
					}
					break;
				case "tab_change":
					$(".dueui-panel-tab").hide();
					a2.panel.show();
					break;
				case "refresh":
					location.reload(true);
					break;
				case "set_value":
					$(a2.target).data.val(a2.value);
					break;
				case "enable":
					$(a2.target).attr("readonly", false);
					break;
				case "disable":
					$(a2.target).attr("readonly", true);
					break;
				default:
					console.log(`Invalid UI action: ${a.action}`);
				}
				break;
			case "cgi":
				var uri = `http://${dueui.settings.duet_host}/${a2.cgi}`;
				if (a2.params) {
					uri += '?';
					if (typeof(a2.params) === 'string') {
						uri += encodeURI(a2.params);
					} else {
						let names = a2.params.getOwnPropertyNames();
						names.forEach((name, ix) => {
							if (ix > 0) {
								uri += '&';
							}
							uri += `${encodeURIComponent(name)}=${encodeURIComponent(a2.params[name])}`;
						});
					}
				}
				$.getJSON(uri).then((response) => {
				}).fail((xhr, reason, error) => {
					dueui.logMessage("E", reason);
				});
				break;
			case "http":
				$.getJSON(encodeURI(a2.uri)).then((response) => {
					dueui.logMessage("I", response);
				}).fail((xhr, reason, error) => {
					dueui.logMessage("E", reason);
				});
				break;
			case "deleteFile":
				dueui.deleteFile(a2.file);
				break;
			default:
				if (a.type) {
					console.log(`Invalid action: ${a.type}`);
				}
			}
			if (a2.message) {
				a2.message = DueUI.evalValue(a2.message, this.val());
				dueui.logMessage("I", a2.message);
			}
		}
	}
}
DueuiElement.registry = {};

class DueUI{

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
			let ev = eval(value);
			let nv = nativeFromString(ev);
			return nv;
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
			return nativeFromString(eval(str));
		}
		return str;
	}

	static evalValueStatus(str, value, state) {
		if (str.indexOf("${") >= 0) {
			if (!str.startsWith("`")) {
				str = "`" + str + "`";
			}
			return nativeFromString(eval(str));
		}
		return str;
	}

	static logDimensions(jq) {
		console.log({
			width: jq.width(),
			height: jq.height(),
			innerWidth: jq.innerWidth(),
			innerHeight: jq.innerHeight(),
			outerWidth: jq.outerWidth(),
			outerHeight: jq.outerHeight(),
			clientWidth: jq[0].clientWidth,
			clientHeight: jq[0].clientHeight,
			jq: jq
		});
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

	constructor(){
		this.settings = this.getSettings();
		let temp_hostname = document.location.host;
		if (keyExistsOn(this.settings, "duet_url")) {
			temp_hostname = this.settings.duet_url.replace("http://", "");
			delete this.settings.duet_url;
		}


		this.getSetting('duet_debug_polling_enabled', 0);
		this.getSetting('dueui_settings_dont_send_gcode', 0);
		this.getSetting('duet_polling_enabled', 0);
		this.getSetting('duet_update_time', 0);
		this.getSetting('show_tooltips', 1);
		this.getSetting('backend_type', DUEUI.BACKENDS.STANDALONE);
		this.getSetting('theme', "Cerulean");
		this.getSetting('duet_host', temp_hostname);
		this.getSetting('duet_password', "reprap");
		this.getSetting('dueui_config_url', `http://${this.settings.duet_host}/rr_download?name=/sys/dueui_config_default_standalone.json`);
		this.getSetting('duet_poll_interval_1', 1000);
		this.getSetting('duet_poll_interval_2', 0);
		this.getSetting('duet_poll_interval_3', 5000);

		this.setSettings(this.settings);

		this.model = {};
		this.model.seq = 0;
		this.current_status = "";
		this.connected = false;
		this.connect_retry = 0;
		this.duet_connect_retries = {
				"number": 10,
				"interval": 5000
		};
		this.configured = false;
		$("head > title").html(`DueUI - ${this.settings.duet_host}`);
	}

	severityMap = [ "I", "W", "E" ] ;

	logMessage(severity, message) {
		if (typeof(message) === undefined) {
			return;
		}
		if (typeof(message) === 'string') {
			message = message.trim();
			if (message.length == 0) {
				return;
			}
		}

		var d = new Date();
		if (typeof(severity) === 'number') {
			severity = this.severityMap[severity];
		}
		var msg = {"timestamp": d, "severity": severity, "message": message};
		console.log(msg);
		$(".log-message-listener").trigger("log_message", msg);
	}

	getSetting(setting, default_value) {
		if (!keyExistsOn(this.settings, setting)) {
			this.settings[setting] = nativeFromString(localStorage.getItem(setting));
		}
		if (typeof(this.settings[setting]) !== 'undefined' && this.settings[setting] !== null
				&& this.settings[setting] !== 'null') {
			return this.settings[setting];
		}

		let local = localStorage.getItem(setting);
		if (local === null || local === "null") {
			local = default_value;
		}
		this.settings[setting] = nativeFromString(local);
		return this.settings[setting];
	}

	getSettings() {
		let l = localStorage.length;
		if (l == 0) {
			return {};
		}
		let settings = {};
		for (let i = 0; i < l; i++) {
			let name = localStorage.key(i);
			let val = localStorage.getItem(name);
			settings[name] = nativeFromString(val);
		}
		return settings;
	}

	setSetting(setting, value) {
		this.settings[setting] = value;
		localStorage.setItem(setting, value);
		if (setting === "theme") {
			DueUI.setCurrentTheme(value);
		}
	}

	setSettings(settings) {
		localStorage.clear();
		let keys = Object.keys(settings);
		for(let name of keys) {
			localStorage.setItem(name, settings[name]);
		}
	}

	printFile(file) {
		this.sendGcode({"gcode": `M32 "${file}"`, "get_reply": true});
	}

	addGcodeReplyListener(callback) {
		this.gcode_reply_subscriptions.add(callback);
	}
	removeGcodeReplyListener(callback) {
		this.gcode_reply_subscriptions.remove(callback);
	}

	showStartupSettings(msg) {
		this.startup_settings = new DueuiSettingsPanel(
				{"position": "left top+64"}, $("body"));

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

	async postData(path, data) {
		let resp = {};
		try {
			resp.data = await $.post(`http://${this.settings.duet_host}${path}`, data);
			resp.ok = true;
		} catch (error) {
			resp.error = error;
			resp.ok = false;
			console.log(error);
		}
		return resp;
	}

	async getText(path) {
		let resp = {};
		try {
			resp.data = await $.get(`http://${this.settings.duet_host}${path}`);
			resp.ok = true;
		} catch (error) {
			resp.error = error;
			resp.ok = false;
			console.log(path, error);
		}
		return resp;
	}

	async getJSON(path, jsonpCallback) {
		let resp = {};
		try {
			if (typeof(jsonpCallback) === "undefined") {
				resp.data = await $.getJSON(`http://${this.settings.duet_host}${path}`);
			} else {
				resp.data = await $.ajax({
					url: `http://${this.settings.duet_host}${path}`,
					dataType: "jsonp",
					jsonp: "callback",
					jsonpCallback: jsonpCallback});
			}
			resp.ok = true;
		} catch (error) {
			resp.error = error;
			resp.ok = false;
			console.log(path, error);
		}
		return resp;
	}

	async getConfig(config) {
		let resp = {};
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
		$(".connection-listener").trigger("duet_connection_change", { "status": "connecting" });

		while (this.connect_retry <= this.duet_connect_retries.number) {
			resp = await this.connect_once(url);
			if (!resp.ok) {
				this.connect_retry++;
				this.logMessage("W", `Connection attempt ${this.connect_retry} of ${this.duet_connect_retries.number} failed`);
				$(".connection-listener").trigger("duet_connection_change", { "status": "retrying", "retry": this.connect_retry });
				delay(this.duet_connect_retries.interval);
				continue;
			}

			this.connected = true;
			if (this.connect_retry > 0) {
				$(".connection-listener").trigger("duet_connection_change", { "status": "reconnected", "response": "OK" });
				this.logMessage("I", "Reconnected");
			} else {
				$(".connection-listener").trigger("duet_connection_change", { "status": "connected", "response": "OK" });
				this.logMessage("I", "Connected");
			}
			this.connect_retry = 0;

			let c_url;
			if (this.settings.dueui_config_url.length == 0) {
				if (this.settings.backend_type == DUEUI.BACKENDS.NODSF) {
					c_url = `http://${this.settings.duet_host}/rr_download?name=/sys/dueui_config.json`
				} else {
					c_url = `http://${this.settings.duet_host}/machine/file/sys/dueui_config.json`
				}
			} else {
				c_url = this.settings.dueui_config_url;
			}
			resp = await this.getConfig(c_url);
			if (!resp.ok) {
				alert(`Could not retrieve config from ${c_url}`);
				return resp;
			}
			if (this.settings.dueui_config_url.length == 0) {
				this.setSetting("dueui_config_url", c_url);
			}

			this.active_config_url = resp.config_url;
			this.configured = true;
			this.status_map = resp.data.status_map;
			this.dueui_content = resp.data.dueui_content;
			DueUIConfig = resp.data;
			this.populate(this.dueui_content);
			this.logMessage("I", `DueUI Version ${dueui_version}`);
/*
			resp = await this.sendGcode({"gcode": "M115", "no_echo": true, "no_event": true});
			if (!resp.ok) {
				dueui.logMessage("E", resp.error);
			} else {
				for (let r of resp.replies) {
					dueui.logMessage("I", r);
				}
			}
*/
			resp = await this.startPolling();
			if (!resp.ok) {
				dueui.logMessage("E", resp.error);
			}

			return resp;
		}

		return resp;
	}

	disconnect() {
		this.connect_retry = 0;
		this.connected = false;
		$(".connection-listener").trigger("duet_connection_change", {"status": "disconnected"});
	}

	async startup() {
		$("#dueui_startup").remove();
		DueUI.setCurrentTheme(this.settings.theme);
		this.id = "dueui";
		this.jq = $("#dueui");
		$("body").addClass(`connection-listener ui ui-widget-content bg-light`);

		if (this.settings.duet_polling_enabled != 1) {
			this.showStartupSettings();
			return;
		}

		let resp = await this.connect(this.settings.duet_host);
		if (!resp.ok) {
			alert(`Could not connect to ${this.settings.duet_host} or retrieve any config files`);
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

	constructor() {
		super();
	}

	normalizePath(path) {
		if (path[0] === '/') {
			return "/machine/file" + path;
		} else {
			return "/machine/file/" + path;
		}
	}

	async postData(path, data) {
		return super.postData(this.normalizePath(path), data);
	}

	async getText(path) {
		return super.getText(this.normalizePath(path));
	}

	async getJSON(path, jsonpCallback) {
		return super.getJSON(this.normalizePath(path), jsonpCallback);
	}

	async getThemeList(custom) {
		let resp = await super.getJSON(custom ? "/dueui/css/dueui-themes_custom.css" : "/dueui/css/dueui-themes.css",
				custom ? "DueUICustomThemes" : "DueUIThemes");
		if (!resp.ok) {
			return [];
		}
		return resp.data.themes;
	}

	async deleteFile(path) {
		let resp = {};
		try {
			path = this.normalizePath(path);
			resp.data = await $.ajax({
				url: `http://${this.settings.duet_host}${path}`,
				method: "DELETE"});
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
			gcodes = [ gcodes ];
		}

		for (let ge of gcodes) {
			if (typeof(ge) === 'string') {
				ge = {"gcode": ge, "get_reply": false};
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
			if (this.settings.dueui_settings_dont_send_gcode == 1) {
				this.logMessage("D", `GCode: ${gc}`);
				continue;
			}

			let single_resp = await super.postData("/machine/code", gc);
			if (!single_resp.ok) {
				this.logMessage("E", `GCode: ${gc}  Error: ${single_resp.error.responseText}`);
				return single_resp;
			} else {
				resp.replies.push(single_resp.data);
				if (!ge.no_event && single_resp.data && single_resp.data.length > 0) {
					d = new Date();
					$(".gcode-reply-listener").trigger("gcode_reply", {
						"timestamp": d,
						"gcode": gc,
						"response": single_resp.data.trim()
					});
				}
			}
		}

		return resp;
	}

	processWebSocketMsg(msg) {
		let data = JSON.parse(msg.data);
		if (this.settings.duet_debug_polling_enabled) {
			console.log(data);
		}

		if (keyExistsOn(data, "messages")) {
			for (let m of data.messages) {
				this.logMessage(m.type, m.content);
			}
			delete data.messages;
		}

		$.extend(true, this.model, data);
		if (this.settings.duet_debug_polling_enabled) {
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

	async startPolling() {
		let _this = this;
		let resp = {};
		resp.ok = true;

		let ws_url = `ws://${this.settings.duet_host}/machine`;
		try {
			let socket = new WebSocket(ws_url);

			socket.onmessage = (data) => {
				if (!this.settings.duet_polling_enabled) {
					socket.close();
					return;
				}
				this.processWebSocketMsg(data);
				socket.send("OK\n");
			};

			socket.onclose = (e) => {
				console.log(e);
				this.logMessage("E", `Websocket closed.  Please refresh.`);
			};
		} catch(error) {
			resp.ok = false;
			resp.error = error;
			console.log(error);
			_this.logMessage("E", `Failed to connect websocket.  Please refresh.`);
		}

		return resp;
	}

	async connect_once(host) {
		let resp = {};
		if (this.connected) {
			resp.ok = true;
			return resp;
		}
		try {
			resp.data = await $.ajax({
				dataType: "json",
				url: `http://${host}/machine/status`,
				timeout: 1000
			});
			resp.ok = true;
			this.dsf = true;
		} catch(error) {
			console.log(error);
			resp.error = error;
			resp.ok = false;
		}
		return resp;
	}
}

class DueUI_Standalone extends DueUI {
	constructor() {
		super();
		this.last_poll = [0, 0, 0, 0];
		this.sequence = -1;
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

	async postData(path, data) {
		return super.postData(this.normalizePath(path), data);
	}

	async getText(path) {
		return super.getText(this.normalizePath(path));
	}

	async getJSON(path, jsonpCallback) {
		return super.getJSON(this.normalizePath(path), jsonpCallback);
	}

	async getThemeList(custom) {
		let resp = await super.getJSON(custom ? "/css/dueui-themes_custom.css" : "/css/dueui-themes.css",
				custom ? "DueUICustomThemes" : "DueUIThemes");
		if (!resp.ok) {
			return [];
		}
		console.log(resp);
		return resp.data.themes;
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
		if (this.model.status !== this.current_status) {
			$(`.status-change-listener`).trigger("duet_status_change", this.model.status);
			this.current_status = this.model.status;
		}
		$(`.state-poll-listener`).trigger("duet_poll_response", this.model);

		if (this.model.seq > this.sequence) {
			let resp = await this.getGcodeReply();
			if (resp.replies.length > 0) {
				for (let r in resp.replies) {
					this.logMessage("I", resp.replies[r]);
				}
			}
		}
	}

	async pollOnce(poll_level, notify, lock) {
		if (lock) {
			if (this.poll_in_flight) {
				return;
			}
			this.poll_in_flight = true;
		}
		let resp = await super.getJSON(`/rr_status?type=${poll_level}`);

//		let resp = await this.sendGcode('M409 F"v"')
//		let resp0 = await super.getJSON("/rr_gcode?gcode=M409%20F%22v%22");
//		let resp = await super.getJSON("/rr_reply");
		if (resp.ok) {
//			resp.data.result.state.status = resp.data.result.state.status.toLowerCase();
			$.extend(true, this.model, resp.data);
//			$.extend(true, this.model, resp.data.result);
//			console.log(JSON.stringify(this.model));
			if (this.sequence < 0) {
				this.sequence = this.model.seq;
			}
			if (this.settings.duet_debug_polling_enabled == 1) {
				console.log({"poll_level": poll_level, "response": this.model});
			}
			if (notify) {
				await this.processPollResponse();
			}
		} else {
			this.logMessage("W", `Poll type ${poll_level} failed`);
		}
		if (lock) {
			this.poll_in_flight = false;
		}
		return resp;
	}

	async startPolling() {
		let interval = Math.min(
			this.settings.duet_poll_interval_1,
			this.settings.duet_poll_interval_2,
			this.settings.duet_poll_interval_3
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

		setInterval( async () => {
			if (!this.connected || !this.configured || this.settings.duet_polling_enabled != 1) {
				return;
			}

			let now = Date.now();
			let poll_level = -1;
			if (this.settings.duet_poll_interval_3 > 250
					&& now - this.last_poll[3] >= this.settings.duet_poll_interval_3) {
				poll_level = 3;
				this.last_poll[3] = now;
			} else if (this.settings.duet_poll_interval_2 > 250
					&& now - this.last_poll[2] >= this.settings.duet_poll_interval_2) {
				poll_level = 2;
				this.last_poll[2] = now;
			} else if (this.settings.duet_poll_interval_1 > 250
					&& now - this.last_poll[1] >= this.settings.duet_poll_interval_1) {
				poll_level = 1;
				this.last_poll[1] = now;
			}

			if (this.connected && poll_level > 0 && this.settings.duet_polling_enabled == 1) {
				this.pollOnce(poll_level, true, true);
			}
		}, interval);
		return resp;
	}

	async connect_once(url) {
		let resp = {};
		if (this.connected) {
			resp.ok = true;
			return resp;
		}
		try {
			resp.data = await super.getJSON(`/rr_connect?password=${ encodeURI(this.settings.duet_password) }`);
			resp.ok = true;
		} catch(error) {
			console.log(error);
			resp.error = error;
			resp.ok = false;
		}
		return resp;
	}

	async getGcodeReply(gc) {
		let tempgc = gc || { no_echo: true, gcode: ""};
		let resp = {
			ok: true,
			replies: []
		};

		while (this.sequence < this.model.seq) {
			let tempresp = await super.getText("/rr_reply");
			if (!tempresp.ok) {
				this.logMessage("E", tempresp.error);
				return tempresp;
			}
			resp.replies.push(tempresp.data);
			this.sequence++;
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
			gcodes = [ gcodes ];
		}

		for (let ge of gcodes) {
			if (typeof(ge) === 'string') {
				ge = {"gcode": ge, "get_reply": false};
			}
			ge.gcode = ge.gcode.replace(/;/g, "\n");
			let gc = ge.gcode.trim();
			if (this.settings.dueui_settings_dont_send_gcode == 1) {
				this.logMessage("D", `GCode: ${gc}`);
				continue;
			}
			let uri = `/rr_gcode?gcode=${gc.replace(/[+]/, "%2B")}`;
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

const backend_type = localStorage.getItem("backend_type");
if (backend_type == DUEUI.BACKENDS.DSF) {
	var dueui = new DueUI_DSF();
} else {
	var dueui = new DueUI_Standalone();
}
