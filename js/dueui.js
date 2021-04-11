var dueui;

class DueUI {

	static rgb2hex(c) {
		return `rgb(${c[0]},${c[1]},${c[2]})`;
	}

	static pointInCircle(x, y, cx, cy, radius) {
		let dsq = (x - cx) * (x - cx) + (y - cy) * (y - cy);
		return dsq < (radius * radius);
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

	static evalValue(str, value) {
		if (typeof str === 'string' && str.indexOf("${") >= 0) {
			if (!str.startsWith("`")) {
				str = "`" + str + "`";
			}
			try {
				let ev = eval(str);
				return nativeFromString(ev);
			} catch (error) {
				dueui.logMessage("E", error.message + ": " + value);
				return Number.NaN;
			}
		}
		return str;
	}

	static evalValueStatus(str, value, state) {
		if (typeof str === 'string' && str.indexOf("${") >= 0) {
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

	static async startup(configLoaded) {
		
		if (configLoaded && resolvedSettings.backend_type == DUEUI.BACKENDS.DSF) {
			console.log("Initializing with existing backend type DSF");
			dueui = new DueUI_DSF(resolvedSettings);
		} else if (configLoaded && resolvedSettings.backend_type == DUEUI.BACKENDS.STANDALONE) {
			console.log("Initializing with existing backend type STANDALONE");
			dueui = new DueUI_Standalone(resolvedSettings);
		} else {
			alert("No config file could be loaded or a Duet/DSF could not be found");
			console.log("Unknown backend.  Showing settings");
			new DueuiSettingsPanel(
					{ "position": "left top+64" }, $("body"));
			return;
		}
		dueui.startup();
		return;
	}

	constructor() {
		this.lastLogMessage = "";
		this.model = this.initializeModel({});
		this.connected = false;
		this.connect_retry = 0;
		this.duet_connect_retries = {
			"number": 10,
			"interval": 5000
		};
		
		this.configured = true;
		this.dueui_config = new DueUIConfig();
		this.status_map = this.dueui_config.status_map;
		this.dueui_content = this.dueui_config.dueui_content;

		$("head > title").html(`DueUI - ${resolvedSettings.duet_host}`);
	}

	patchModel(model, change) {
		return $.extend(true, model, change);
	}

	initializeModel(model) {
		this.patchModel(model, {
			"meta": {
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
		let resp = await tryFetch(`http://${resolvedSettings.duet_host}${rawpath}`, {
			"method": "POST",
			"headers": {
				"Content-Type": "text/plain",
			},
			"body": data
		});
		if (!resp.ok) {
			this.logMessage("W", `POST of data failed: ${resp.status} ${resp.statusText}`);
		}
		return resp;
	}

	async connect(url) {
		let resp = {};
		this.connect_retry = 0;

		if (!resolvedSettings.dueui_test_mode) {

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

			if (resolvedSettings.duet_polling_enabled) {
				resp = await this.startPolling();
				if (!resp.ok) {
					dueui.logMessage("E", resp.error);
				}
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

		this.populate(this.dueui_content);
		this.logMessage("I", `DueUI Version ${dueui_version}`);

		if (!resolvedSettings.dueui_test_mode) {
			this.sendGcode({ "gcode": "M115", "no_echo": true });
		}

		return resp;
	}

	disconnect() {
		this.connect_retry = 0;
		this.connected = false;
		$(".connection-listener").trigger("duet_connection_change", { "status": "disconnected" });
	}

	async removeOldVersion() {
		let resp = await this.getFileList("/www");
		let need_cleanup = resp.find(element => element.name === "dueui.html.gz");
		if (need_cleanup) {
			await this.deleteFile("/www/dueui.html.gz");
		}
		resp = await this.getFileList("/www/js");
		let oldfiles = ["dueui-bundle.js.gz", "dueui-vendor-bundle.js.gz",
		"dueui-loader.js.gz", "dueui_element.js.gz"];
		for (let f of oldfiles.values()) {
			need_cleanup = resp.find(element => element.name === f);
			if (need_cleanup) {
				await this.deleteFile("/www/js/" + f);
			}
		}
	}

	async startup() {
		$("#dueui_startup").remove();
		this.id = "dueui";
		this.jq = $("#dueui");
		$("body").addClass(`connection-listener ui ui-widget-content bg-light`);

		if (resolvedSettings.duet_polling_enabled != 1) {
			this.showStartupSettings();
			return;
		}

		let resp = await this.connect(resolvedSettings.duet_host);
		if (!resp.ok) {
			alert(`Could not connect to ${resolvedSettings.duet_host} or retrieve any config files`);
			this.showStartupSettings();
			return;
		}

		await this.removeOldVersion();

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
		let resp = await getJSONFromDuet("/machine/status");
		if (!resp.ok) {
			this.logMessage("W", `Initial connect failed: ${resp.status} ${resp.statusText}`);
			this.connected = false;
			return resp;
		}
		
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
	
	async removeOldVersion() {
		await super.removeOldVersion();
		let resp = await this.getFileList("/www/dueui");
		if (resp.length == 0) {
			return;
		}
		await this.deleteFile("/www/dueui/index.html");
		
		for (let d of ["css", "fonts", "js"].values()) {
			resp = await this.getFileList("/www/dueui/" + d);
			for (let f of resp.values()) {
				await this.deleteFile("/www/dueui/" + d + "/" + f.name);
			}
			await this.deleteFile("/www/dueui/" + d);
		}
			
		await this.deleteFile("/www/dueui");
	}
	
	async deleteFile(path) {
		let resp = await tryFetch(`http://${resolvedSettings.duet_host}/machine/file/${path}`, {
			"method": "DELETE"
		});
		console.log({ action: "DeleteFile", path: path, resp, respText: await resp.text()});
		
		if (!resp.ok) {
			this.logMessage("W", `DELETE of '${path}' failed: ${resp.status} ${resp.statusText}`);
		}
		
		return resp;
	}

	async getFileList(directory) {
		let resp = await getJSONFromDuet(`/machine/directory${directory}`);
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
			if (resolvedSettings.dueui_settings_dont_send_gcode == 1) {
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
		if (resolvedSettings.duet_debug_polling_enabled) {
			console.log(data);
		}

		if (keyExistsOn(data, "messages")) {
			for (let m of data.messages) {
				this.logMessage(m.type, m.content);
			}
			delete data.messages;
		}

		$.extend(true, this.model, data);
		if (resolvedSettings.duet_debug_polling_enabled) {
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

	async pollOnce(notify, lock) {

	}

	stopPolling() {
		this.websocket.close();
	}

	async startPolling() {
		let _this = this;
		let resp = {};
		resp.ok = true;

		let ws_url = `ws://${resolvedSettings.duet_host}/machine`;
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
				if (resolvedSettings.duet_polling_enabled) {
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
		let resp = await getJSONFromDuet(`/rr_connect?password=${encodeURI(resolvedSettings.duet_password)}`);
		if (!resp.ok) {
			this.logMessage("W", `Initial connect failed: ${resp.status} ${resp.statusText}`);
			this.connected = false;
			return resp;
		}

		resp = await getJSONFromDuet("/rr_model");
		console.log("rr_model resp: ", resp);
		if (!resp.ok) {
			this.logMessage("W", `Model retrieve failed: ${resp.status} ${resp.statusText}`);
			this.connected = false;
			return resp;
		}

		let keys = Object.keys(resp.data.result);
		this.model = resp.data.result;
		for (let name of keys) {
			let resp2 = await getJSONFromDuet(`/rr_model?key=${name}&flags=nvd10`);
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

	constructor(settings) {
		super(settings);
		this.last_poll = 0;
		this.current_poll_response = {};
		this.poll_in_flight = false;
		this.pollOnce(false, true);
	}

	normalizePath(path) {
		if (path[0] === '/') {
			return "/rr_download?name=" + path;
		} else {
			return "/rr_download?name=/" + path;
		}
	}

	async deleteFile(path) {
		let resp = await getJSONFromDuet(`/rr_delete?name=${path}`);
		console.log({ action: "DeleteFile", path: path, resp, respText: await resp.data});
		
		if (!resp.ok) {
			this.logMessage("W", `DELETE of '${path}' failed: ${resp.status} ${resp.statusText}`);
		}
		
		return resp;
	}
	
	async getFileList(directory) {
		let first = -1;
		let files = [];

		while (first != 0) {
			let resp = await getJSONFromDuet(`/rr_filelist?dir=${directory}` + (first > -1 ? `&first=${first}` : ""));
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

	async pollOnce(notify, lock) {
		if (!this.connected) {
			return { "ok": false, "error": "not connected" };
		}
		if (lock) {
			if (this.poll_in_flight) {
				if (resolvedSettings.duet_debug_polling_enabled == 1) {
					console.log("Poll already in progress");
				}
				return { "ok": false, "error": "locked" };
			}
			this.poll_in_flight = true;
		}

		$.extend(true, this.model.last, this.model.current);

		let resp = await getJSONFromDuet("/rr_model?flags=fnd10");
		// Silly workaround for Eclipse's context highlighting...'
		if (!resp.ok) this.logMessage("W", `Poll failed: ${resp.status} ${resp.statusText}`);
		if (!resp.ok) {
			this.poll_in_flight = false;
			return resp;
		}

		let newseq = resp.data.result.seqs;
		let keys = Object.keys(newseq);
		for (let key of keys) {
			if (newseq[key] != this.model.seqs[key]) {
				let resp2 = await getJSONFromDuet(`/rr_model?key=${key}&flags=nvd10`);
				if (!resp2.ok) {
					this.logMessage("W", `Poll failed: ${resp.status} ${resp.statusText}`);
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
		let pi_1 = resolvedSettings.duet_poll_interval_1;
		let dpi = resolvedSettings.duet_polling_enabled;;


		let interval = Math.max(
			250,
			pi_1,
		);

		let resp = await this.pollOnce(false, true);
		if (!resp.ok) {
			return resp;
		}

		this.pollerIntervalId = setInterval(async () => {
			if (!this.connected || !this.configured || dpi != 1) {
				return;
			}
			let now = Date.now();
			if (now - this.last_poll >= pi_1) {
				this.last_poll = now;
			}

			if (this.connected && dpi == 1) {
				this.pollOnce(true, true);
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
		let mseq = this.model.seqs.reply;

		while (this.model.last.reply_seq < this.model.current.reply_seq) {
			let tempresp = await getTextFromDuet("/rr_reply");
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

			if (resolvedSettings.dueui_settings_dont_send_gcode == 1) {
				this.logMessage("D", `GCode: ${gc}`);
				continue;
			}

			let uri = `/rr_gcode?gcode=${encodeURIComponent(gc)}`;
			let single_resp = await getJSONFromDuet(uri);
			if (!single_resp.ok) {
				this.logMessage("E", `GCode: ${gc}  Error: ${single_resp.error.responseText}`);
				return single_resp;
			} else {
				let pollresp = await this.pollOnce(false, false);
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
