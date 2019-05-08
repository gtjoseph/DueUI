/*
 * These jQuery extensions provide the ability to set an element's
 * position using the same syntax as jQuery-UI (without the overhead
 * of jQuery-UI)
 */
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
		
		if (this.state.styles && this.state.styles[this.state.current]) {
			this.css($.extend(true, {}, this.style, this.state.styles[this.state.current]));
		}
		if (this.state.classes && this.state.classes[this.state.current]) {
			this.removeClasses(this.state.merged_classes);
			this.addClasses(this.state.classes[this.state.current]);
		}
		if (this.state.contents && this.state.contents[this.state.current]) {
			this.val(this.state.contents[this.state.current]);
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
		if (Array.isArray(events)){
			var eas = events;
		} else {
			var eas = [events];
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
				a2.gcode = DueUI.evalValue(a2.gcode, this.val());
				dueui.sendGcode(a2);
				break;
			case "macro":
				if (a2.file) {
					dueui.sendGcode({"gcode": `M98 P${a2.file}`, "get_reply": true});
				} else if (a2.macro) {
					dueui.sendGcode({"gcode": `M98 P/macros/${a2.macro}`, "get_reply": true});
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
					break
				case "refresh":
					location.reload(true);
					break
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
			default:
				console.log(`Invalid action: ${a.type}`);
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
			this.settings.theme = "base";
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
		}
		this.settings.theme = this.settings.theme || "bootstrap";
		this.settings.duet_url = this.settings.duet_url || document.location.host;
		this.settings.duet_password = this.settings.duet_password || "reprap";
		this.settings.dueui_config_url = this.settings.dueui_config_url || `${this.settings.duet_url}/rr_download?name=/sys/dueui_config.json`;
		this.settings.duet_poll_interval_1 = this.settings.duet_poll_interval_1 || 1000;
		this.settings.duet_poll_interval_2 = this.settings.duet_poll_interval_2 || 0;
		this.settings.duet_poll_interval_3 = this.settings.duet_poll_interval_3 || 5000;
		if (typeof(this.settings.duet_debug_polling_enabled) === 'undefined') {
			this.settings.duet_debug_polling_enabled = 0;
		}
		if (typeof(this.settings.dueui_settings_dont_send_gcode) === 'undefined') {
			this.settings.dueui_settings_dont_send_gcode = 0;
		}
		if (typeof(this.settings.duet_polling_enabled) === 'undefined') {
			this.settings.duet_polling_enabled = 0;
		}
		if (typeof(this.settings.show_tooltips) === 'undefined') {
			this.settings.show_tooltips = 1;
		}

		this.setSettings(this.settings);
		
		this.current_status = "";
		this.last_poll = [0, 0, 0, 0];
		this.connected = false;
		this.connect_retry = 0;
		this.sequence = -1;
		this.current_poll_response = {};
		this.duet_connect_retries = {
				"number": 3,
				"interval": 2000
		};

		this.config_file_preference = [
			this.settings.dueui_config_url,
			`${this.settings.duet_url}/rr_download?name=/sys/dueui_config.json`,
			`${this.settings.duet_url}/rr_download?name=/sys/dueui_config_default.json`,
			"/DueUI/dueui_config.json",
			"/DueUI/dueui_config_default.json",
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
		console.log(`Saving setting: ${setting} : ${value}`);
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

	getJSON(url) {
		return $.getJSON(dueui.getSetting("duet_url") + url);
	}

	getFileList(directory, last_response) {
		let first = -1;
		if (last_response && last_response.next > 0) {
			first = last_response.next;
		}

		return this.getJSON(`/rr_filelist?dir=${directory}` + (first > -1 ? `&first=${first}` : ""))
		.then((data) => {
			if (last_response) {
				last_response.files.push(...data.files);
			} else {
				last_response = data;
			}
			if (data.next > 0) {
				return this.getFileList(directory, last_response);
			}
			last_response.next = 0;
			return last_response;
		});
	}

	pollOnce(poll_level) {
		$.getJSON(`${this.settings.duet_url}/rr_status?type=${poll_level}`).then((response) => {
			this.current_poll_response = response;
			if (this.settings.duet_debug_polling_enabled == 1) {
				console.log({"poll_level": poll_level, "response": response});
			}
			if (response.status !== this.current_status) {
				$(`.status-change-listener`).trigger("duet_status_change", response.status);
				this.current_status = response.status;
			}
			$(`.status-poll-listener-${poll_level}`).trigger("duet_poll_response", response);
			if (this.sequence < 0) {
				this.sequence = response.seq;
			}
			if (response.seq > this.sequence) {
				this.getGcodeReply();
			}
		}).fail((xhr, reason, error) => {
			this.logMessage("W", `Poll type ${poll_level} failed`);
		});
	}

	schedulePoll() {
		let interval = Math.min(
			this.settings.duet_poll_interval_1,
			this.settings.duet_poll_interval_2,
			this.settings.duet_poll_interval_3
		);

		setInterval(() => {
			if (!this.connected || this.settings.duet_polling_enabled != 1) {
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
				this.pollOnce(poll_level);
			}
		}, interval);
	}

	connect() {
		if (this.connected) {
			return;
		}
		var _this = this;
		delete this.reconnect_timer;
		$.getJSON(`${this.settings.duet_url}/rr_connect?password=${ encodeURI(this.settings.duet_password) }`)
		.then((response, status, xhr) => {
			console.log({ response, status, xhr} );
			if (response.err == 1) {
				this.connected = false;
				$(".connection-listener").trigger("duet_connection_status", { "status": "failed", "reason": "bad_password" });
				return;
			}
			if (response.err == 2) {
				this.connected = false;
				$(".connection-listener").trigger("duet_connection_status", { "status": "failed", "reason": "busy" });
				return;
			}
			this.connected = true;
			this.connect_retry = 0;
			$(".connection-listener").trigger("duet_connection_status", { "status": "connected", "response": response });
		}).fail((xhr, reason, error) => {
			console.log({xhr, reason, error});
			console.log(xhr.getAllResponseHeaders());
			this.connected = false;
			if (this.connect_retry < this.duet_connect_retries.number) {
				this.connect_retry++;
				this.reconnect_timer = setTimeout(() => {
					this.logMessage("W", `Attempting reconnection ${this.connect_retry} of ${this.duet_connect_retries.number}`);
					this.connect();
				}, this.duet_connect_retries.interval);
				$(".connection-listener").trigger("duet_connection_status", { "status": "retrying", "retry": this.connect_retry });
				this.logMessage("W", `Connection attempt ${this.connect_retry} of ${this.duet_connect_retries.number} failed`);
			} else {
				alert("There was an error attempting to connect to "+this.settings.duet_url+"\nPlease see the javascript console for more information.");
				$(".connection-listener").trigger("duet_connection_status", { "status": "failed", "reason": reason });
				this.logMessage("E", `Final connection attempt failed.  Refresh to restart.`);
			}
		});
	}

	disconnect() {
		this.connect_retry = 0;
		if (this.reconnect_timer) {
			cancelTimeout(this.reconnect_timer);
			delete this.reconnect_timer;
		}
		this.connected = false;
		$(".connection-listener").trigger("duet_connection_status", {"status": "disconnected"});
		$.getJSON(`${this.settings.duet_url}/rr_disconnect`).then((response) => {
			console.log(response);
		});
	}

	getGcodeReply(gc) {
		var uri = `${this.settings.duet_url}/rr_reply`;
		let tempgc = gc || { no_echo: true, gcode: ""};
		$.get(uri, (response) => {
			response = response.trim();
			let d = new Date();
			let r = response.trim();
			if (r.length) {
				$(".gcode-reply-listener").trigger("gcode_reply", {
					"timestamp": d,
					"gcode": (tempgc.no_echo ? "" : tempgc.gcode),
					"response": response
				});
			}
			this.sequence++;
			if (this.sequence < this.current_poll_response.seq) {
				setTimeout(() => {
					this.getGcodeReply();
				}, 0);
			}
		}).fail((xhr, reason, error) => {
			this.logMessage("E", reason);
			console.log({xhr, reason, error})
		});
	}

	sendGcode(gcode) {
		var _this = this;
		var gc = gcode;
		var more = false;
		if (gcode instanceof Array) {
			gc = gcode[0];
			if (gcode.length > 1) {
				more = true;
			}
		}

		if (typeof(gc) === 'string') {
			gc = {"gcode": gc, "get_reply": false};
		}

		var g = encodeURI(gc.gcode.replace(/;/g,"\n"));
		var uri = `${this.settings.duet_url}/rr_gcode?gcode=${g.replace(/[+]/, "%2B")}`;
		if (this.settings.dueui_settings_dont_send_gcode == 1) {
			this.logMessage("D", `GCode: ${gc.gcode}`);
			return;
		}
		$.getJSON(uri).then((response) => {
			console.log(uri, response);
			if (more) {
				this.sendGcode(gcode.slice(1));
			}
		}).fail((xhr, reason, error) => {
			console.log({xhr, reason, error})
		});
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

	getConfig(configs) {
		if (configs.length == 0) {
			return;
		}
		let config = configs[0];
		$.ajax({
			url: config,
			cache: false,
			timeout: 2000,
			dataType: "jsonp",
			jsonp: "callback",
			jsonpCallback: "DueUIConfig"
		}).done((config_data) => {
			this.logMessage("I", `Retrieved config from ${config}`);
			this.active_config_url = config;
			this.configured = true;
			console.log(config_data);
			this.populate(config_data);
			this.schedulePoll();
			this.logMessage("I", `DueUI Version ${dueui_version}`);
		}).fail((data, reason, xhr) => {
			if (reason === "parsererror") {
				try {
					/*
					var s = document.createElement("script");
					s.text = data.responseText;
					document.head.appendChild(s).parentNode.removeChild(s);
					*/
					eval(data.responseText);
				} catch(error) {
					alert(`${error.message}
					There was an error parsing config file
					${config}.
					Use the browser's Javascript console and look for
					"Uncaught SyntaxError".  To the far right you'll
					see a dummy file name and the line in the config
					file that caused the error.
					`.trim());
					this.showStartupSettings();
					return;
				}
			}
			
			if (xhr === "Not Found" && configs.length > 1) {
				setTimeout(() => {
					this.getConfig(configs.slice(1));
				});
			} else {
				alert(`Unable to retrieve config file '${config}': ${reason}`);
				this.showStartupSettings();
				this.logMessage("E", `Final configuration attempt failed.  Refresh to restart.`);
			}
		});
	}

	startup() {
		$("#dueui_startup").remove();
		DueUI.setCurrentTheme(this.settings.theme);
		this.id = "dueui";
		this.jq = $("#dueui");
		$("body").addClass(`connection-listener ui ui-widget-content bg-light`);
		$("body").on("duet_connection_status", (event, response) => {
			this.removeStartupSettings();
			if (response.status === "connected") {
				let configs = this.config_file_preference.slice(0);
				this.getConfig(configs);
			}
		});

		if (this.settings.duet_polling_enabled == 1) {
			this.connect();
		} else {
			this.showStartupSettings();
		}
	}
}
var dueui = new DueUI();
