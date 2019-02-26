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
			"classes": "",
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
		this.jq.addClass(this.classes);
		
		if (parent && parent.hasClass("dueui-panel-tab")) {
			this.style = $.extend(true, {"position": "absolute"}, this.style);
		}
		
		this.jq.css(this.style);
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
		if (this instanceof jQuery) {
			return this.hasClass(classname);
		}
		return this.jq.hasClass(classname);
	}
	
	updateId(new_id) {
		this.id = new_id;
		if (this.jq) {
			this.jq.attr("id", new_id);
		}
	}

	append(e) {
		e.parent_element = this;
		this.jq.append(e.jq);
		if (e.position) {
			e.jq.position(e.position);
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
			if (this.actions) {
				this.runActions(this.actions, false);
			}
		});
		if (this.actions && run_startup_actions) {
			this.runActions(this.actions, true);
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
		loop:
		for(let a of actions) {
			if (run_on_startup && !a.fire_on_startup) {
				continue;
			}
			let a2 = $.extend(true, {}, a);
			switch(a.type) {
			case "confirm":
				let b = {
					"type": "button",
					"value": a2.message,
					"actions": actions.filter((action) => action.type !== "confirm")
				};
				this.createDialog([ b ]);
				break loop;
			case "gcode":
				a2.gcode = DueUI.evalValue(a2.gcode, this.val());
				dueui.sendGcode(a2);
				break;
			case "macro":
				dueui.sendGcode({"gcode": `M98 P${a2.file}`, "get_reply": true});
				break;
			case "print":
				dueui.sendGcode({"gcode": `M23 ${a2.file} ; M24`, "get_reply": true});
				break;
			case "setting": {
				if (run_on_startup) {
					this.val(dueui.getSetting(a2.setting));
				} else {
					let val = (a2.value ? DueUI.evalValue(a2.value, this.val()) : this.val());
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
				default:
					console.log(`Invalid UI action: ${a.action}`);
				}
				break;
			default:
				console.log(`Invalid action: ${a.type}`);
			}
		}
	}
	createDialog(buttons) {
		this.jq.append(`<div id='${this.id}_dialog' title='${this.value}'/>`);
		var jq_dialog = $(`#${this.id}_dialog`);
		var width = 0;
		var te = this.target_element;
		for (let b of buttons) {
			b.onsubmit = () => {
				jq_dialog.dialog("close");
			};
			width = Math.max(width, b.value);
			$.extend(true, b.actions, {"fire_on_startup": false});
			
		}
		width += 5;
		
		var bgdialog = new DueuiPanel({
			"id": `${this.id}_dialog_buttons`,
			"style": {
				"display": "flex",
				"flex-direction": "column"
			},
			"element_configs": buttons
		});
		jq_dialog.append(bgdialog.jq);

		jq_dialog.dialog({
			"autoOpen": true,
			"modal": true,
			"position": {"my": "center", "at": "center", "of": this.jq}
		})
		jq_dialog.dialog({"close": () => {
				jq_dialog.dialog("destroy");
				jq_dialog.remove();
			}
		});
	}
}
DueuiElement.registry = {};

class DueUI{
	static getCurrentTheme() {
		var c = $("link[href$='jquery-ui.css']").attr("href");
		var ca = c.split("/");
		return ca[ca.length-2];
	}

	static setCurrentTheme(new_theme) {
		var c = $("link[href$='jquery-ui.css']").attr("href");
		var current_theme = DueUI.getCurrentTheme();
		var newurl = c.replace(`/${current_theme}/`,`/${new_theme}/`);
		$("link[href$='jquery-ui.css']").attr("href", newurl);
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
		this.settings = Cookies.getJSON("dueui_settings");
		if (!this.settings) {
			this.settings = {};
			this.settings.theme = "base";
			this.settings.duet_url = `http://${document.location.host}`;
			this.settings.duet_password = "reprap";
			this.settings.dueui_config_url = `${this.settings.duet_url}/rr_download?name=/sys/dueui_config.json`;
			this.settings.duet_poll_interval_1 = 2000;
			this.settings.duet_poll_interval_2 = 5000;
			this.settings.duet_poll_interval_3 = 10000;
			this.settings.show_tooltips = true;
			Cookies.set("dueui_settings", this.settings, {"expires": 3650});
		}
		this.settings.theme = this.settings.theme || "base";
		this.settings.duet_url = this.settings.duet_url || document.location.host;
		this.settings.duet_password = this.settings.duet_password || "reprap";
		this.settings.dueui_config_url = this.settings.dueui_config_url || `${this.settings.duet_url}/rr_download?name=/sys/dueui_config.json`;
		this.settings.duet_poll_interval_1 = this.settings.duet_poll_interval_1 || 2000;
		this.settings.duet_poll_interval_2 = this.settings.duet_poll_interval_2 || 5000;
		this.settings.duet_poll_interval_3 = this.settings.duet_poll_interval_3 || 10000;
		
		this.current_status = "";
		this.poll_ids = [];
		this.connected = false;
		this.connect_retry = 0;

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

	}

	logMessage(severity, message) {
		var d = new Date();
		var msg = {"timestamp": d, "severity": severity, "message": message.trim()};
		console.log(msg);
		$(".log-message-listener").trigger("log_message", msg);
	}

	getSetting(setting) {
		return this.settings[setting];
	}
	setSetting(setting, value) {
		this.settings[setting] = value;
		console.log(`Saving setting: ${setting} : ${value}`);
		if (setting === "theme") {
			DueUI.setCurrentTheme(value);
		}
		Cookies.set("dueui_settings", this.settings, {"expires": 3650});
	}

	getJSON(url) {
		return $.getJSON(dueui.getSetting("duet_url") + url);
	}

	startPolling(poll_level) {
		if (!this.connected) {
			return;
		}
		if (typeof poll_level === 'undefined') {
			for (var i = 1; i <= 3; i++) {
				this.startPolling(i);
			}
			return;
		}
		if (typeof this.poll_ids[poll_level] !== 'undefined') {
			console.log(`Polling already enabled for level ${poll_level}`);
			return;
		}
		var _this = this;
		let interval = this.settings[`duet_poll_interval_${poll_level}`]; 

		if ( interval > 0) {
			this.poll_ids[poll_level] = setInterval(() => {
				if (!this.settings.duet_polling_enabled) {
					return;
				}
				if (this.settings.duet_debug_polling_enabled) {
					console.log(`Polling type ${poll_level}`);
				}
				$.getJSON(`${this.settings.duet_url}/rr_status?type=${poll_level}`).then((response) => {
					if (this.settings.duet_debug_polling_enabled) {
						console.log(response);
					}
					if (response.status !== this.current_status) {
						this.logMessage("(I)", `Status change: ${this.status_map[response.status].label}`);
						$(`.status-change-listener`).trigger("duet_status_change", response.status);
						this.current_status = response.status;
					}
					$(`.status-poll-listener-${poll_level}`).trigger("duet_poll_response", response);
				}).fail((xhr, reason, error) => {
					this.logMessage("(W)", `Poll type ${poll_level} failed`);
				});
			}, interval);
			console.log(`Polling enabled for level ${poll_level} at interval ${interval}`);
		} else {
			console.log(`Polling not enabled for level ${poll_level}`);
		}
	}

	stopPolling(poll_type) {
		if (typeof poll_type === 'undefined') {
			var l;
			while ((l = this.poll_ids.pop())) {
				clearInterval(l);
				console.log(`Polling stopped for level ${l}`);
			}
			return;
		}
		if (typeof this.poll_ids[poll_type] === 'undefined') {
			console.log(`Polling already stopped for level ${poll_type}`);
			return;
		}
		clearInterval(this.poll_ids[poll_type]);
		delete this.poll_ids[poll_type];
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
		}).fail(function(xhr, reason, error){
			console.log({xhr, reason, error})
			this.connected = false;
			if (this.connect_retry < this.duet_connect_retries.number) {
				this.connect_retry++;
				this.reconnect_timer = setTimeout(function(){
					this.logMessage("(W)", `Attempting reconnection ${_this.connect_retry} of ${_this.duet_connect_retries.number}`);
					this.connect();
				}, this.duet_connect_retries.interval);
				$(".connection-listener").trigger("duet_connection_status", { "status": "retrying", "retry": _this.connect_retry });
				this.logMessage("(W)", `Connection attempt ${_this.connect_retry} of ${_this.duet_connect_retries.number} failed`);
			} else {
				$(".connection-listener").trigger("duet_connection_status", { "status": "failed", "reason": reason });
				this.logMessage("(E)", `Final connection attempt failed.  Refresh to restart.`);
			}
		});
	}

	disconnect() {
		this.connect_retry = 0;
		if (this.reconnect_timer) {
			cancelTimeout(this.reconnect_timer);
			delete this.reconnect_timer;
		}
		this.stopPolling();
		this.connected = false;
		$(".connection-listener").trigger("duet_connection_status", {"status": "disconnected"});
		$.getJSON(`${this.settings.duet_url}/rr_disconnect`).then((response) => {
			console.log(response);
		});
	}

	getGcodeReply(gc) {
		var uri = `${this.settings.duet_url}/rr_reply`;
		console.log(`Getting gcode reply`);
		$.get(uri, (response) => {
			console.log(`Sent ${uri}   Response: ${response.trim()}`);
			let d = new Date();
			let r = response.trim();
			if (r.startsWith("Error")) {
				this.logMessage("E", r);
			} else {
				$(".gcode-reply-listener").trigger("gcode_reply", {
					"timestamp": d,
					"gcode": (gc.no_echo ? "" : gc.gcode),
					"response": response.trim()
					}
				);
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
		console.log(`Sending gcode: ${uri}`);
		if (this.settings.dueui_settings_dont_send_gcode) {
			this.logMessage("(D)", `GCode: ${gc.gcode}`);
			return;
		}
		$.getJSON(uri).then((response) => {
			console.log(uri, response);
			if (gc.get_reply) {
				this.getGcodeReply(gc);
			}
			if (more) {
				this.sendGcode(gcode.slice(1));
			}
		}).fail((xhr, reason, error) => {
			console.log({xhr, reason, error})
		});
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
			dataType: "jsonp",
			jsonp: "callback",
			jsonpCallback: "DueUIConfig"
		}).done((config_data) => {
			this.logMessage("(I)", `Retrieved config from ${config}`);
			this.configured = true;
			console.log(config_data);
			this.populate(config_data);
			this.startPolling();
		}).fail((data, reason, xhr) => {
			console.log(`Unable to retrieve config from ${config}`);
			if (configs.length > 1) {
				setTimeout(() => {
					this.getConfig(configs.slice(1));
				});
			} else {
				this.logMessage("(E)", `Final configuration attempt failed.  Refresh to restart.`);
			}
		});
	}

	startup() {
		$("#dueui_startup").remove();
		DueUI.setCurrentTheme(this.settings.theme);
		this.id = "dueui";
		this.jq = $("#dueui");
		$(document).tooltip({"disabled": !this.settings.show_tooltips});

		$("body").addClass(`connection-listener`);
		$("body").on("duet_connection_status", (event, response) => {
			this.removeStartupSettings();
			if (response.status === "connected") {
				let configs = this.config_file_preference.slice(0);
				this.getConfig(configs);
			}
		});

		if (this.settings.duet_polling_enabled) {
			this.connect();
		} else {
			this.showStartupSettings();
		}
	}
}
var dueui = new DueUI();
