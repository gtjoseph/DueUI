/*
 * These jQuery extensions provide the ability to set an element's
 * position using the same syntax as jQuery-UI (without the overhead
 * of jQuery-UI)
 */

keyExistsOn = (o, k) => k.split(".").reduce((a, c) => a.hasOwnProperty(c) ? a[c] || 1 : false, Object.assign({}, o)) === false ? false : true;

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
			"style": {},
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

	applyState() {
		if (!this.state) {
			return;
		}
		if (this.state.current === this.state.last) {
			return;
		}
		let current_state;
		if (typeof(this.state.current) === 'string') {
			if (this.state.current === 'true') {
				current_state = 1;
			} else if (this.state.current === 'false') {
				current_state = 0;
			} else {
				current_state = this.state.current; 
			}
		} else {
			current_state = this.state.current;
		}
		if (this.state.styles && this.state.styles[current_state]) {
			this.css($.extend(true, {}, this.style, this.state.styles[current_state]));
		}
		if (this.state.classes && this.state.classes[current_state]) {
			this.removeClasses(this.state.merged_classes);
			this.addClasses(this.state.classes[current_state]);
		}
		if (this.state.contents && this.state.contents[current_state]) {
			this.val(this.state.contents[current_state]);
		}
		this.state.last = this.state.current;
	}

	clearState() {
		this.removeClasses(this.state.merged_classes || []);
		this.state.last = -2;
		this.state.current = -1;
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
			if (this.actions && this.actions_type !== "choose") {
				if (this.actions_type === "state") {
					if (typeof(this.state.last) === 'undefined' || this.state.last.length == 0) {
						this.state.last = 0;
					} else {
						if (this.state && !this.state.field) {
							this.state.current++;
							if (this.state.current >= this.actions.length) {
								this.state.current = 0;
							}
						}
					}
					this.runActions(this.actions[ this.state.current ], false);
					this.applyState();
				} else {
					this.runActions(this.actions, false);
				}
			}
		});
		if (this.actions && run_startup_actions) {
			this.runActions(this.actions, true);
			setTimeout(() => {this.applyState();}, 500);
		}
	}
	setActions(actions, trigger, startup) {
		this.actions = actions;
		if (startup) {
			this.runActions(actions, true);
		}
		this.jq.on(trigger, (event) => {
			this.runActions(actions, false);
		});
	}
	runActions(actions, run_on_startup) {
		if (!Array.isArray(actions)) {
			actions = [ actions ];
		}
		loop:
		for(let a of actions) {
			if (run_on_startup && !a.fire_on_startup) {
				continue;
			}
			let a2 = $.extend(true, {}, a);
			if (a2.message) {
				a2.message = DueUI.evalValue(a2.message, this.val());
				dueui.logMessage("I", a2.message);
			}
			switch(a.type) {
			case "gcode":
				a2.gcode = DueUI.evalValueStatus(a2.gcode, this.val(), this.current_status);
				dueui.sendGcode(a2);
				break;
			case "macro":
				if (a2.file) {
					dueui.sendGcode({"gcode": `M98 P"${a2.file}"`, "get_reply": true});
				} else if (a2.macro) {
					dueui.sendGcode({"gcode": `M98 P"/macros/${a2.macro}"`, "get_reply": true});
				} else {
					dueui.logMessage("E", "No 'file' or 'macro' parameter present");
				}
				break;
			case "print":
				dueui.printFile(a2.file);
				break;
			case "setting": {
				if (run_on_startup) {
					if (this.actions_type === "state") {
						this.state.current = dueui.getSetting(a2.setting);
					} else {
						this.val(dueui.getSetting(a2.setting));
					}
				} else {
					let val;
					if (this.actions_type === "state") {
						val = this.state.current;
					} else {
						val = (a2.value ? DueUI.evalValue(a2.value, this.val()) : this.val());
					}
					dueui.setSetting(a2.setting, val);
				}
				break;
			}
			case "event": {
				let val = (a2.value ? DueUI.evalValue(a2.value, this.val()) : this.val());
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
				default:
					console.log(`Invalid UI action: ${a.action}`);
				}
				break;
			case "cgi":
				var uri = `${dueui.settings.duet_url}/${a2.cgi}`;
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
				var m = a2.message;
				$.getJSON(encodeURI(a2.uri)).then((response) => {
					dueui.logMessage("I", response);
				}).fail((xhr, reason, error) => {
					dueui.logMessage("E", reason);
				});
				break;
			default:
				console.log(`Invalid action: ${a.type}`);
			}
		}
	}
}
DueuiElement.registry = {};

class DueUI{

	static delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	static getCurrentTheme() {
		return $("link[href$='.theme.css']").attr("href");
	}

	static setCurrentTheme(new_theme) {
		$("link[href$='.theme.css']").attr("href", new_theme);
	}

	static evalStatus(status, value, _this) {
		if (value.indexOf("${") >= 0) {
			if (!value.startsWith("`")) {
				value = "`" + value + "`";
			}
			return eval(value);
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
			return eval(str);
		}
		return str;
	}

	static evalValueStatus(str, value, status) {
		if (str.indexOf("${") >= 0) {
			if (!str.startsWith("`")) {
				str = "`" + str + "`";
			}
			return eval(str);
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
		if (!this.settings) {
			this.settings = {};
			this.settings.theme = "Cerulean";
			this.settings.duet_url = `http://${document.location.host}`;
			this.settings.duet_password = "reprap";
			this.settings.dueui_config_url = `${this.settings.duet_url}/rr_download?name=/sys/dueui_config.json`;
			this.settings.duet_poll_interval_1 = 2000;
			this.settings.duet_poll_interval_2 = 5000;
			this.settings.duet_poll_interval_3 = 10000;
			this.settings.duet_debug_polling_enabled = 0;
			this.settings.dueui_settings_dont_send_gcode = 0;
			this.settings.duet_polling_enabled = 0;
			this.settings.show_tooltips = 1;
			this.settings.duet_update_time = 0;
		}
		this.settings.theme = this.settings.theme || "Cerulean";
		this.settings.duet_url = this.settings.duet_url || document.location.host;
		this.settings.duet_password = this.settings.duet_password || "reprap";
		this.settings.dueui_config_url = this.settings.dueui_config_url || `${this.settings.duet_url}/rr_download?name=/sys/dueui_config.json`;
		this.settings.duet_poll_interval_1 = this.settings.duet_poll_interval_1 || 1000;
		this.settings.duet_poll_interval_2 = this.settings.duet_poll_interval_2 || 0;
		this.settings.duet_poll_interval_3 = this.settings.duet_poll_interval_3 || 5000;
		if (typeof(this.settings.duet_debug_polling_enabled) === 'undefined' ||
				this.settings.duet_debug_polling_enabled === "0") {
			this.settings.duet_debug_polling_enabled = 0;
		}
		if (typeof(this.settings.dueui_settings_dont_send_gcode) === 'undefined' ||
				this.settings.dueui_settings_dont_send_gcode === "0") {
			this.settings.dueui_settings_dont_send_gcode = 0;
		}
		if (typeof(this.settings.duet_polling_enabled) === 'undefined' ||
				this.settings.duet_polling_enabled === "0") {
			this.settings.duet_polling_enabled = 0;
		}
		if (typeof(this.settings.show_tooltips) === 'undefined') {
			this.settings.show_tooltips = 1;
		}
		if (typeof(this.settings.duet_update_time) === 'undefined') {
			this.settings.duet_update_time = 0;
		}

		this.setSettings(this.settings);

		this.dsf = false;
		this.model = {}; 
		this.current_status = "";
		this.last_poll = [0, 0, 0, 0];
		this.connected = false;
		this.connect_retry = 0;
		this.sequence = -1;
		this.current_poll_response = {};
		this.duet_connect_retries = {
				"number": 10,
				"interval": 5000
		};
		this.poll_in_flight = false;

		this.config_file_preference = [
			this.settings.dueui_config_url,
			`${this.settings.duet_url}/rr_download?name=/sys/dueui_config.json`,
			`${this.settings.duet_url}/rr_download?name=/sys/dueui_config_default.json`,
			`${this.settings.duet_url}/machine/file/sys/dueui_config.json`,
			`${this.settings.duet_url}/machine/file/sys/dueui_config_default.json`,
			"/dueui/dueui_config.json",
			"/dueui/dueui_config_default.json",
			"dueui_config.json",
			"dueui_config_default.json"
		];
		this.configured = false;
		this.config_retry = 0;
		this.active_config_url = "";
		$("head > title").html(`DueUI - ${this.settings.duet_url.replace("http://", "")}`);
	}

	logMessage(severity, message) {
		var d = new Date();
		var msg = {"timestamp": d, "severity": severity, "message": message.trim()};
		console.log(msg);
		$(".log-message-listener").trigger("log_message", msg);
	}

	getSetting(setting) {
		if (typeof(this.settings[setting]) !== 'undefined') {
			return this.settings[setting];
		}
		this.settings[setting] = localStorage.getItem(setting);
		return this.settings[setting];
	}

	getSettings() {
		let l = localStorage.length;
		if (l == 0) {
			return undefined;
		}
		var settings = {};
		for (let i = 0; i < l; i++) {
			let name = localStorage.key(i);
			settings[name] = localStorage.getItem(name);
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
		let keys = Object.keys(settings);
		for(let name of keys) {
			localStorage.setItem(name, settings[name]);
		}
	}

	async postData(path, data) {
		let resp = {};
		try {
			resp.data = await $.post(`${this.settings.duet_url}${path}`, data);
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
			resp.data = await $.get(`${this.settings.duet_url}${path}`);
			resp.ok = true;
		} catch (error) {
			resp.error = error;
			resp.ok = false;
			console.log(error);
		}
		return resp;
	}

	async getJSON(path, jsonpCallback) {
		let resp = {};
		try {
			if (typeof(jsonpCallback) === "undefined") {
				resp.data = await $.getJSON(`${this.settings.duet_url}${path}`);
			} else {
				resp.data = await $.ajax({
					url: `${this.settings.duet_url}${path}`,
					dataType: "jsonp",
					jsonp: "callback",
					jsonpCallback: jsonpCallback});
			}
			resp.ok = true;
		} catch (error) {
			resp.error = error;
			resp.ok = false;
			console.log(error);
		}
		return resp;
	}

	async getFileList_dsf(directory) {
		let resp = await this.getJSON(`/machine/directory${directory}`);
		return resp;
	}

	async getFileList(directory) {
		return this.getFileList_dsf(directory);
	}

	async sendGcode(gcodes) {
		var _this = this;

		if (!Array.isArray(gcodes)) {
			gcodes = [ gcodes ];
		}

		for (let ge of gcodes) {
			if (typeof(ge) === 'string') {
				ge = {"gcode": ge, "get_reply": false};
			}
			let gee = ge.gcode.split(";");
			for (let gc of gee) {
				gc = gc.trim();
				if (this.settings.dueui_settings_dont_send_gcode == 1) {
					this.logMessage("D", `GCode: ${gc}`);
					continue;
				}
				let resp;
				if (this.dsf) {
					resp = await this.postData("/machine/code", gc);
					if (!resp.ok) {
						this.logMessage("E", `GCode: ${gc}  Error: ${resp.error.responseText}`);
					} else {
						if (ge.get_reply && resp.data && resp.data.length > 0) {
							let d = new Date();
							$(".gcode-reply-listener").trigger("gcode_reply", {
								"timestamp": d,
								"gcode": (ge.no_echo ? "" : gc),
								"response": resp.ok ? resp.data : resp.error.responseText
							});
						}
					}
				} else {
					let uri = `/rr_gcode?gcode=${g.replace(/[+]/, "%2B")}`;
					resp = await this.getJSON(uri);
					if (!resp.ok) {
						this.logMessage("D", `GCode: ${gc}  Error: ${resp.error.responseText}`);
					}
				}
			}
		}
	}

	printFile(file) {
		this.sendGcode({"gcode": `M23"${file}" ; M24`, "get_reply": true});
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

	async openWebsocket() {
		let _this = this;
		let resp = {};
		let ws_url = this.settings.duet_url.replace("http", "ws") + "/machine";
		let socket = new WebSocket(ws_url);
		let model = await new Promise(function(resolve, reject) {
			/* These are temp callbacks just for the initial connection */
			socket.onmessage = function(e) {
				const model = JSON.parse(e.data);
				resp.ok = true;
				resp.data = model;
				resp.socket = socket;
				resolve(model);
			}
			socket.onclose = function(e) {
				resp.ok = false;
				resp.error = e;
				resp.code = e.code;
				console.log(e);
				_this.logMessage("E", `Websocket ${e.currentTarget.url} closed.  Code: ${e.code}`);
				reject(resp);
			}
			socket.onerror = function(e) {
				resp.ok = false;
				resp.error = e;
				resp.code = e.code;
				console.log(e);
				_this.logMessage("E", `Failed to connect websocket: ${e.currentTarget.url}`);
				reject(resp);
			}
		});
		
		return resp;
	}
	
	async startPolling() {
		let _this = this;
		let resp = await this.openWebsocket();
		if (!resp.ok) {
			console.log(resp);
			return resp;
		}
		var counter = 0;
		this.model = resp.data;
		this.current_status = this.model.state.status;
		$(`.status-change-listener`).trigger("duet_status_change", this.current_status);
		
		console.log(this.model);
		this.websocket = resp.socket;
		this.websocket.onmessage = async (e) => {
			let data = JSON.parse(e.data);
			if (this.settings.duet_debug_polling_enabled) {
				console.log(data);
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
			$(`.status-poll-listener-9`).trigger("duet_poll_response", this.model);
			
			this.websocket.send("OK\n");
		}
		this.websocket.onclose = (e) => {
			console.log(e);
			this.logMessage("E", `Websocket ${e.currentTarget.url} closed.  Code: ${e.code}`);
		}
		this.websocket.onerror = (e) => {
			console.log(e);
			this.logMessage("E", `Failed to connect websocket: ${e.currentTarget.url}`);
		}
		this.websocket.send("OK\n");
		
		return resp;
	}
	
	async getConfig(config) {
		let resp = {};
		try {
			resp.data = await $.ajax({
				url: config,
				cache: false,
				timeout: 2000,
				dataType: "jsonp",
				jsonp: "callback",
				jsonpCallback: "DueUIConfig"
			});
			resp.ok = true;
		} catch (error) {
			console.log(error);
			resp.ok = false;
			resp.error = error;
		}
		return resp;
	}

	async loadConfig(configs) {
		for (let config of configs) {
			let resp = await this.getConfig(config);
			if (!resp.ok) {
				if (resp.error.status == 404) {
					continue;
				}
				return resp;
			}
			this.logMessage("I", `Retrieved config from ${config}`);
			resp.config_url = config;
			return resp;
		}
	}

	async connect_once(url) {
		let resp = {};
		if (this.connected) {
			resp.ok = true;
			return resp;
		}
		try {
			resp.data = await $.ajax({
				dataType: "json",
				url: `${url}/machine/status`,
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

	async connect(url) {
		let resp = {};
		this.connect_retry = 0;
		$(".connection-listener").trigger("duet_connection_change", { "status": "connecting" });

		while (this.connect_retry <= this.duet_connect_retries.number) {
			resp = await this.connect_once(url);
			if (resp.ok) {
				this.connected = true;
				if (this.connect_retry > 0) {
					$(".connection-listener").trigger("duet_connection_change", { "status": "reconnected", "response": "OK" });
					this.logMessage("I", "Reconnected");
				} else {
					$(".connection-listener").trigger("duet_connection_change", { "status": "connected", "response": "OK" });
					this.logMessage("I", "Connected");
				}
				this.connect_retry = 0;
				
				resp = await this.loadConfig(this.config_file_preference);
				if (!resp.ok) {
					alert(`Could not retrieve any config`);
					return resp;
				}
				
				this.active_config_url = resp.config_url;
				this.configured = true;
				this.populate(resp.data);
				this.logMessage("I", `DueUI Version ${dueui_version}`);
				if (this.dsf) {
					resp = await this.postData("/machine/code", "M115");
					if (resp.ok) {
						dueui.logMessage("I", resp.data);
					} else {
						dueui.logMessage("E", resp.error);
					}
				} else {
					resp = await this.getJSON("/rr_config");
					if (resp.ok) {
						dueui.logMessage("I", response.firmwareElectronics);
						dueui.logMessage("I", response.firmwareName + ": " + response.firmwareVersion);
					} else {
						dueui.logMessage("E", resp.error);
					}
				}
				
				resp = await this.startPolling();
				if (!resp.ok) {
					dueui.logMessage("E", resp.error);
				}
				
				return resp;
			}
			this.connect_retry++;
			this.logMessage("W", `Connection attempt ${this.connect_retry} of ${this.duet_connect_retries.number} failed`);
			$(".connection-listener").trigger("duet_connection_change", { "status": "retrying", "retry": this.connect_retry });
			await DueUI.delay(this.duet_connect_retries.interval);
		}
		alert("There was an error attempting to connect to "+this.settings.duet_url+"\nPlease see the javascript console for more information.");
		$(".connection-listener").trigger("duet_connection_change", { "status": "failed", "reason": "unknown" });
		this.logMessage("E", `Final connection attempt failed.  Refresh to restart.`);

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

		let resp = await this.connect(this.settings.duet_url);
		if (!resp.ok) {
			alert(`Could not connect to ${this.settings.duet_url} or retrieve any config files`);
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
var dueui = new DueUI();
