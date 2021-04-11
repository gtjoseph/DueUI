
class DueuiWidget extends DueuiElement {
	constructor(html_element, config, parent){
		super(html_element, config, parent);

		if (this.tolerance) {
			if (this.tolerance.tolerances) {
				this.tolerance.last = -1;
				if (!this.tolerance.default_style) {
					let style_keys = {};
					for (let t of this.tolerance.tolerances) {
						$.extend(style_keys, t.style);
					}
					style_keys = Object.keys(style_keys);
					this.tolerance.default_style = this.jq.css(style_keys);
				}

				if (this.tolerance.tolerances[0].classes) {
					this.tolerance.merged_classes = [];
					for (let t of this.tolerance.tolerances) {
						let sc = t.classes;
						for (let c of sc.split(" ")) {
							if (!this.tolerance.merged_classes.includes(c)) {
								this.tolerance.merged_classes.push(c);
							}
						}
					}
				}

				if (!this.onstatus) {
					this.onstatus = (status) => {
						this.processTolerance(status);
					};
				}
			}
		}

		if (this.state) {
			this.state.last = -2;
			this.state.current = 0;
			this.state.merged_classes = [];
			for (let s of this.state.states) {
				if (s.classes) {
					for (let c of s.classes.split(" ")) {
						if (!this.state.merged_classes.includes(c)) {
							this.state.merged_classes.push(c);
						}
					}
				}
			}
		}

		if (((this.value && typeof(this.value) === 'string' && this.value.indexOf("${") >= 0)
				|| (this.state && this.state.field) || this.onstatus)) {

			this.addClasses("state-poll-listener");

			this.jq.on("duet_poll_response", (event, status) => {
				this.current_status = status;
				if (this.value.indexOf("${") >= 0) {
					var val = DueUI.evalStatus(status, this.value, this);
					this.val(val);
				}
				if (this.state && this.state.field) {
					this.state.current = DueUI.evalStatus(status, this.state.field);
					this.applyState(this.state.current);
				}
				if (this.onstatus) {
					this.onstatus(status);
				}
			});
		}
	}

	clearTolerance() {
		if (this.tolerance.default_style) {
			this.css(this.tolerance.default_style);
		}
		if (this.tolerance.merged_classes) {
			this.removeClasses(this.tolerance.merged_classes);
		}

	}

	processTolerance(status, val) {
		if (typeof(val) === 'undefined') {
			var val = (typeof(this.tolerance.field) === 'undefined' ? this.val() : this.tolerance.field);
		}
		if (typeof(val) === 'string') {
			val = DueUI.evalStatus(status, val, this);
		}
		let ix = 0;
		for (let t of this.tolerance.tolerances) {
			if (val <= t.limit) {
				if (ix != this.tolerance.last) {
					if (t.style) {
						this.jq.css(t.style);
					}
					if (t.classes) {
						this.removeClasses(this.tolerance.merged_classes);
						this.addClasses(t.classes);
					}
					this.tolerance.last = ix;
				}
				break;
			}
			ix++;
		}
	}

	val(val, skipcheck) {
		var value_object = this.value_object || this.jq;
		if (typeof(val) === 'undefined') {
			if (typeof(this.value_function) === 'string') {
				return 	value_object[this.value_function]();
			} else {
				return this.value_function();
			}
		}

		if (skipcheck || val !== this.last_value) {

			if (typeof(this.value_function) === 'string') {
				value_object[this.value_function](val);
			} else {
				this.value_function(val);
			}
			this.last_value = val;
		}
	}
	label(label, skipcheck) {
		var label_object = this.label_object || this.jq;
		if (typeof(label) === 'undefined' && this.label_function) {
			if (typeof(this.label_function) === 'string') {
				return 	label_object[this.label_function]();
			} else {
				return this.label_function();
			}
		}
	}
}

class DueuiButtonWidget extends DueuiWidget {
	constructor(config, parent){
		if (config.actions_chooser) {
			super("div", $.extend(true,
			{
				"initial_value": "",
				"value": "",
				"style": {
					"pointer-events": config.read_only ? "none" : null
				}
			}, config, {"style": {}, "classes": "btn-group dropright"}), parent);

			this.jq_btn_id = `${this.id}_btn`;
			this.jq_btn = $(
			`<button id='${this.jq_btn_id}' class="btn dropdown-toggle" data-toggle="dropdown" href="#" aria-haspopup="true" aria-expanded="false">${this.value}</button>`);
			this.css_object = this.jq_btn;
			this.value_function = "html";
			this.value_object = this.jq_btn;
			this.jq.append(this.jq_btn);
			DueuiElement.updateClasses(this.jq_btn, config.classes || "");
			this.jq_btn.css(config.style || {});
			this.jq_drop = $(`<div class="dropdown-menu" aria-labelledby='${this.jq_btn_id}'/>`);
			this.jq.append(this.jq_drop);
			for (let a of this.actions_chooser) {
				let l = Array.isArray(a) ? a[0].label : a.label;
				let a_jq = $(`<a class="dropdown-item" href="#">${l}</a>`);
				this.jq_drop.append(a_jq);
				a_jq.on('click', (event) =>{
					this.runActions(a, false);
				});
			}
		} else {
			let classes = "btn " + (config.state_classes ? "" : " btn-primary ") + (config.classes || "");
			delete config.classes;

			super("button", $.extend(true,
			{
				"initial_value": "",
				"value": "",
				"style": {
					"pointer-events": config.read_only ? "none" : null
				}
			}, config, { "classes": classes}), parent);
			this.value_function = "html";
			this.value_object = this.jq;

			this.setupEvents("click", true);
		}

		var value = this.value;
		if (value.indexOf("${") >= 0) {
			value = this.initial_value;
		}
		this.last_value = "";
		this.last_state = "";

		let v = "";

		if (this.icon && this.icon.length > 0 && this.icon_position !== 'right') {
			v = `<i class="material-icons">${this.icon}</i>`;
		}
		if (value && value.length > 0) {
			v += value;
		}
		if (this.icon && this.icon.length > 0 && this.icon_position === 'right') {
			v += `<i class="material-icons">${this.icon}</i>`;
		}

		this.val(v);

		if (this.icon_style) {
			let x = this.jq.children().filter(".material-icons");
			x.css(this.icon_style);
		}
	}
}
DueuiElement.addElementType('button', DueuiButtonWidget);

class DueuiLabelWidget extends DueuiWidget {
	constructor(config, parent) {
		super("div", config, parent);

		var value = this.value;
		if (value.indexOf("${") >= 0) {
			value = this.initial_value;
		}
		this.last_value = "";
		this.last_state = "";
		this.jq.html(this.value);
		this.value_function = "html";
		this.value_object = this.jq;
		this.val(value);
	}
}
DueuiElement.addElementType('label', DueuiLabelWidget);

class DueuiInputFieldWidget extends DueuiWidget {
	constructor(config, parent) {
		let classes = "form-control form-control-sm " + (config.classes || "");
		delete config.classes;
		super("input", $.extend(true, {
			"style": Object.assign({"height": "2.5em"}, config.style),
			"attr": {
				"type": config.field_type
			}
		}, config, {"classes": classes}), parent);
		this.value_function = "val";
		this.value_object = this.jq;

		this.setupEvents("keypress", true);

		if (this.autocomplete_key) {
			this.jq.on("dueui-submit", (event) => {
				let val = this.jq.val();
				let ac = getLocalSetting(`ac_${this.autocomplete_key}`, []);
				if (!Array.isArray(ac)) {
					ac = ac.split(',');
				}
				if (!ac.includes(val)) {
					ac.push(val);
					setLocalSetting(`ac_${this.autocomplete_key}`, ac);
				}
			});

			this.jq.autoComplete({
				"minLength": 2,
				"resolver": "custom",
				"events": {
					"search": (query, callback) => {
						let ac = getLocalSetting(`ac_${this.autocomplete_key}`, []);
						if (!Array.isArray(ac)) {
							ac = ac.split(',');
						}
						let filtered = ac.filter(c => c.toLowerCase().startsWith(query.toLowerCase()));
						callback(filtered);
					}
				}
			});
		}

		if (this.value) {
			if (typeof this.value === 'string' && this.value.indexOf("${") >= 0) {
				this.jq.addClass("state-poll-listener");
				this.delay_update = false;
				this.jq.on("duet_poll_response", (event, status) =>	 {
					if (this.jq.is(":focus")) {
						if (!this.delay_update) {
							this.delay_update = true;
							setTimeout(() => { this.delay_update = false; }, 500);
						}
						return;
					}
					if (this.delay_update) {
						return;
					}
					if (this.value && this.value.indexOf("${") >= 0) {
						var val = DueUI.evalStatus(status, this.value);
						this.jq.val(val);
					}
					if (this.state_field) {
						var state = DueUI.evalStatus(status, this.state_field);
						if (this.state_styles && this.state_styles[state]) {
							this.jq.css(this.state_styles[state]);
						}
					}
				});

			} else {
				let v = DueUI.evalValue(this.value, "");
				this.jq.val(v);
			}
		}
	}
}
DueuiElement.addElementType('input_field', DueuiInputFieldWidget);

class DueuiInputWidget extends DueuiWidget {
	constructor(config, parent){
		super("div", $.extend(true,
			{
				"style": {
					"display": "flex",
					"flex-direction": "column",
				}
			}, config), parent);
		var _this = this;

		if (this.label) {
			this.label_widget = new DueuiLabelWidget($.extend(true, {
				"id": `${this.id}_label`,
				"value": (typeof(this.label) === 'string' ? this.label : ""),
				"for": `#${this.input.id || this.id + "_input"}`,
			}, (typeof(this.label) !== 'string' ? this.label : {})), this);
		}

		this.jqib = $("<div/>");
		this.jqib.css({
			"margin-top": "2px",
			"margin-bottom": "2px",
			"padding-top": "2px",
			"padding-bottom": "2px",
			"display": "flex",
			"vertical-align": "middle",
			"flex-direction": "row"
		});

		this.input_widget = new DueuiInputFieldWidget($.extend(true, {
			"id": `${this.id}_input`,
			"field_type": "text",
			"style": {"height": "100%"}
		}, this.input));
		this.jqib.append(this.input_widget.jq);
		this.value_function = this.input_widget.value_function;
		this.value_object = this.input_widget.value_object;

		if (this.button) {
			this.button_widget = new DueuiButtonWidget($.extend(true, {
				"id": `${this.id}_button`,
				"style": {"height": "100%"}
			}, this.button));
			this.jqib.append(this.button_widget.jq);
			this.input_widget.jq.width(this.jq.width() - this.button_widget.jq.outerWidth())
		}
		this.jq.append(this.jqib);

	}
}
DueuiElement.addElementType('input', DueuiInputWidget);

class DueuiSelectWidget extends DueuiWidget {
	constructor(config, parent) {
		let classes = "form-control form-control-sm " + (config.classes || "");
		delete config.classes;
		super("select", $.extend(true,
		{
			"options": []
		}, config, {"classes": classes}), parent);

		this.value_function = "val";
		this.label_function = "html";
		this.label_object = this.jq;
		this.value_object = this.jq;
		for (let option of this.options) {
			if (typeof(option) === 'string' || typeof(option) === 'number') {
				var v = {"label": option, "value": option};
			} else {
				var v = option;
			}
			this.jq.append(`<option value="${v.value}">${v.label}</option>`);
		}
		if (this.initial_value) {
			var v = DueUI.evalValue(this.initial_value, "");
			this.jq.val(v);
		}
		this.setupEvents("change", true);
	}
}
DueuiElement.addElementType('select', DueuiSelectWidget);

class DueuiTextAreaWidget extends DueuiWidget {
	constructor(config, parent) {
		let classes = "form-control form-control-sm " + (config.classes || "");
		delete config.classes;
		super("textarea", $.extend(true, {
			"new_entries_at_top": false,
			"attr": {
				"readonly": config.read_only
			}
		}, config, {"classes": classes}), parent);
		this.value_function = "val";
		this.value_object = this.jq;
		if (this.wrap) {
			this.jq.attr("wrap", this.wrap);
		}

		this.jq.on("append", (event, data) => {
			this.append(data);
		});

		if (this.show_gcode_replies) {
			this.jq.addClass("gcode-reply-listener");
			this.jq.on("gcode_reply", (event, reply) => {
				if (this.show_gcode_in_replies) {
					this.append(`${reply.gcode}: ${reply.response}`, reply.timestamp);
				} else {
					this.append(`${reply.response}`, reply.timestamp);
				}
			});
		}
		if (this.show_log_messages) {
			this.jq.addClass("log-message-listener");
			this.jq.on("log_message", (event, log) => {
				this.append(`(${log.severity}) ${log.message}`, log.timestamp);
			});
		}
		if (this.show_gcode_sent) {
			this.jq.addClass("gcode-sent-listener");
			this.jq.on("gcode_sent", (event, sent) => {
				this.append(`${sent.gcode}`, sent.timestamp);
			});
		}
	}

	append(data, timestamp) {
		var v = this.jq.val();
		var d = timestamp;
		if (this.new_entries_at_top) {
			v = timestamp ? `${DueUI.formatTime(d)} ${data}\n${v}` : `${data}\n${v}`;
		} else {
			v = timestamp ? `${v}\n${DueUI.formatTime(d)} ${data}` : `${v}\n${data}`;
		}
		this.jq.val(v);
		if (!this.new_entries_at_top) {
			this.jq.scrollTop(this.jq[0].scrollHeight);
		}
	}
}
DueuiElement.addElementType('textarea', DueuiTextAreaWidget);

class DueuiStatusWidget extends DueuiButtonWidget {
	constructor(config, parent){
		super(Object.assign(
			{
				"style": {"height": "3.0em"},
				"noclick": true
			}, config), parent);
		this.last_status = "unknown";
		if (dueui.connected) {
			this.update("connected");
		} else {
			this.update("disconnected");
		}

		this.jq.addClass(`status-change-listener`);
		this.jq.on("duet_status_change", (event, status) =>	 {
			this.update(status);
		});

		this.jq.addClass(`connection-listener`);
		this.jq.on("duet_connection_change", (event, status) =>	 {
			this.update(status.status);
		});
	}
	update(status) {
		if (status != this.last_status) {
			this.removeClasses(dueui.status_map[this.last_status].classes);
			this.addClasses(dueui.status_map[status].classes);
			this.val(dueui.status_map[status].label);
			this.last_status = status;
		}
	}
}
DueuiElement.addElementType('status', DueuiStatusWidget);

class DueuiFileSelectWidget extends DueuiPanel {
	constructor(config, parent){
		super($.extend(true,
		{
			"skip_population": true,
			"directory": "/gcodes",
			"action_type": "print",
			"refresh_event": DUEUI.EVENTS.REFRESH,
			"print_event": DUEUI.EVENTS.PRINT,
			"clear_event": DUEUI.EVENTS.CLEAR,
			"strip_prefix": true,
			"strip_suffix": true,
			"show_refresh_button": true,
			"show_action_button": true,
			"sort": "label",
			"submit_on_change": false,
			"style": {
				"position": "absolute"
			}
		}, config), parent);

		this.element_configs = [];

		let dropdown = $.extend(true, config, {
			"id": config.id + "_select",
			"type": "file_dropdown",
			"style": {
				"position": "absolute",
				"height": "2.5em",
				"width": "35ch",
			},
			"position": {
				"my": "left center",
				"at": "left+5 center",
				"of": "#" + this.id
			}
		});
		this.element_configs.push(dropdown);

		let refresh;
		if (this.show_refresh_button) {
			refresh = $.extend(true, {
				"id": config.id + "_refresh",
				"type": "button",
				"icon": "replay",
				"style": {
					"position": "absolute",
					"height": "2.5em",
					"width": "5ch",
				},
				"classes": "btn-success",
				"position": {
					"my": "left center",
					"at": "right+20 center",
					"of": "#" + dropdown.id,
				},
				"actions":
					{"type": "event", "event": DUEUI.EVENTS.REFRESH, "target": "#" + dropdown.id}
			}, config.refresh_button);
			this.element_configs.push(refresh);
		}

		if (this.show_action_button) {

			let defaults = {
				"position": {},
				"actions": {}
			};
			if (config.action_type === "print") {
				defaults.value = "Print";
				defaults.actions.event = DUEUI.EVENTS.PRINT;
			} else if (config.action_type === "run") {
				defaults.value = "Run";
				defaults.actions.event = DUEUI.EVENTS.RUN;
			}
			if (this.show_refresh_button) {
				defaults.position.of = "#" + refresh.id;
			} else {
				defaults.position.of = "#" + dropdown.id;
			}

			let action = $.extend(true, {
				"id": config.id + "_action",
				"type": "button",
				"style": {
					"position": "absolute",
					"height": "2.5em",
					"width": "10ch",
				},
				"classes": "btn-success",
				"position": {
					"my": "left center",
					"at": "right+20 center",
					"of": "#" + refresh.id
				},
				"actions":
					{"type": "event", "event": DUEUI.EVENTS.RUN, "target": "#" + dropdown.id}
			}, defaults, config.action_button);

			this.element_configs.push(action);
		}
		this.populate();
	}
}
DueuiElement.addElementType('file_select', DueuiFileSelectWidget);

class DueuiFileDropdownWidget extends DueuiSelectWidget {
	constructor(config, parent){
		super($.extend(true, {
		}, config), parent);
		this.refresh();

		this.jq.on(DUEUI.EVENTS.REFRESH, (ea, data, event) => {
			this.refresh();
		});

		this.jq.on(DUEUI.EVENTS.PRINT, (ea, data, event) => {
			let v = this.val();
			if (v === "#####") {
				dueui.logMessage("E", "You must select a file.");
				return;
			}
			dueui.printFile(`${this.directory}/${v}`);
		});

		this.jq.on(DUEUI.EVENTS.RUN, (ea, data, event) => {
			let v = this.val();
			if (v === "#####") {
				dueui.logMessage("E", "You must select a file.");
				return;
			}
			dueui.sendGcode({"gcode": `M98 P"${this.directory}/${v}"`});
		});
	}

	async refresh() {
		this.jq.empty();
		let files = await dueui.getFileList(this.directory);
		let options = [];
		this.jq.append(`<option value="#####">Select a file...</option>`)
		for (let fe of files) {
			options.push({"value": fe.name, "label": this.formatName(fe.name), "date": fe.date});
		}
		if (this.sort) {
			let sortkey;
			if (this.sort.match("label")) {
				sortkey = "label";
			} else if (this.sort.match("file")) {
				sortkey = "value";
			} else if (this.sort.startsWith("date")) {
				sortkey = "date";
			}
			options.sort((a, b) => {
				return a[sortkey].localeCompare(b[sortkey]);
			});
		} else {
			options.sort();
		}
		if (this.sort.match("desc")) {
			options.reverse();
		}
		for (let o of options) {
			this.jq.append(`<option value="${o.value}">${o.label}</option>`);
		}
	}

	formatName(name){
		if (this.strip_directory) {
			name = name.replace(/.+[/]([^/]+)$/, "$1");
		}
		if (this.strip_prefix) {
			name = name.replace(/^[0-9]+_/, "");
		}
		if (this.strip_suffix) {
			name = name.replace(/[.][^.]+$/, "");
		}
		return name;
	}
}
DueuiElement.addElementType('file_dropdown', DueuiFileDropdownWidget);

class DueuiFileListWidget extends DueuiPanel {
	constructor(config, parent){
		let classes = "list-group " + (config.classes || "");
		delete config.classes;
		super($.extend(true,
		{
			"skip_population": true,
			"directory": "/gcodes",
			"action_type": "print",
			"rows": 999,
			"refresh_event": DUEUI.EVENTS.REFRESH,
			"print_event": DUEUI.EVENTS.PRINT,
			"clear_event": DUEUI.EVENTS.CLEAR,
			"element_defaults": {
				"classes": "btn btn-primary",
				"selected_classes": "btn-success",
				"unselected_classes": "btn-primary"
			},
			"print_button": {
				"selected_label": "Print ${value}?",
				"unselected_label": "Select file to print",
				"selected_classes": "btn-warning",
				"unselected_classes": "disabled"
			}
		}, config, {"classes": classes, "element_defaults": config.button_defaults}), parent);

		this.refresh();

		if (this.refresh_event) {
			this.jq.on(this.refresh_event, (ea, data, event) => {
				this.refresh();
			});
		}
		if (this.print_event && this.print_button.id) {
			this.jq.on(this.print_event, (ea, data, event) => {
				let pbjq = $(`${this.print_button.id} > button`);
				let selected_file = pbjq.attr("selected_file");
				if (!selected_file || selected_file.length == 0) {
					dueui.logMessage("E", "No file selected for printing");
					return;
				}
				dueui.printFile(`${this.directory}/${selected_file}`);
				pbjq.removeAttr("selected_file");
				pbjq.addClass(this.print_button.unselected_classes);
				pbjq.removeClass(this.print_button.selected_classes);
				pbjq.html("Select file to print");
			});
		}
		if (this.clear_event && this.print_button.id) {
			this.jq.on(this.clear_event, (ea, data, event) => {
				let pbjq = $(`${this.print_button.id} > button`);
				pbjq.removeAttr("selected_file");
				pbjq.removeClass(this.print_button.selected_classes);
				pbjq.addClass(this.print_button.unselected_classes);
				pbjq.html("Select file to print");
			});
		}
	}

	async refresh() {
		this.jq.empty();
		this.element_configs = [];
		this.jq.append("<span>Loading...</span>");
		let files = await dueui.getFileList(this.directory);

		let pbjq;
		if (this.print_button && this.print_button.id) {
			pbjq = $(`${this.print_button.id} > button`);
			pbjq.addClass(this.print_button.unselected_classes);
		}

		for (let fe of files) {
			if (fe.type === "f") {
				let b = {
					"type": "button",
					"enabled": true,
					"value": this.formatName(fe.name),
					"label": this.formatName(fe.name),
					"file": fe.name,
					"classes": "-btn -btn-primary list-group-item list-group-item-action",
					"actions": []
				};
				if (this.tap_action !== "select") {
					if (this.confirm_message) {
						b.actions_chooser.push({"type": this.action_type, "file": `${this.directory}/${fe.name}`,
							"label": DueUI.evalValue(this.confirm_message, b.value)});
					} else {
						b.actions = {"type": this.action_type, "file": `${this.directory}/${fe.name}`};
					}
				} else if (pbjq) {
					b.onsubmit = (event) => {
						pbjq.html(DueUI.evalValue(this.print_button.selected_label, fe.name));
						pbjq.attr("selected_file", fe.name);
						pbjq.removeClass(this.print_button.unselected_classes);
						pbjq.addClass(this.print_button.selected_classes);
					};
				}
				this.element_configs.push(b);
			}
		}
		if (this.sort_autofill &&
			(this.sort_autofill === "label" || this.sort_autofill === "file")) {
			this.element_configs.sort((a, b) => {
				return a[this.sort_autofill].localeCompare(b[this.sort_autofill]);
			});
		}
		this.jq.empty();
		super.populate();
	}
	formatName(macro){
		name = (typeof macro === 'number' ? this.macros[macro] : macro);
		if (this.strip_directory) {
			name = name.replace(/.+[/]([^/]+)$/, "$1");
		}
		if (this.strip_prefix) {
			name = name.replace(/^[0-9]+_/, "");
		}
		if (this.strip_suffix) {
			name = name.replace(/[.][^.]+$/, "");
		}
		return name;
	}
}
DueuiElement.addElementType('file_list', DueuiFileListWidget);

class DueuiGridWidget extends DueuiPanel {
	constructor(config, parent){
		super($.extend(true,
			{
				"style": {
					"display": "grid",
					"border": "0px",
					"grid-template-rows": `repeat(${config.rows}, 1fr)`,
					"grid-template-columns": `repeat(${config.cols}, 1fr)`,
					"grid-auto-flow": config.direction + " dense"
				},
				"element_defaults": {
					"type": "button"
				},
				"max_elements": (config.rows && config.rows > 0 ? (config.rows * config.cols) : 0)
			}, config), parent);
	}
	populate() {
		super.populate();
		this.jq.width($(`#${this.id}`).children().filter(":eq(0)").width() * this.cols);
	}
}
DueuiElement.addElementType('grid', DueuiGridWidget);

class DueuiFileGridWidget extends DueuiGridWidget {
	constructor(config, parent){
		super($.extend(true,
		{
			"skip_population": true,
			"directory": "/gcodes",
			"action_type": "print",
			"rows": 999,
			"refresh_event": "refresh_list",
			"element_defaults": {
				"classes": "btn btn-primary"
			}
		}, config, {"element_defaults": config.button_defaults}), parent);

		this.refresh();

		if (this.refresh_event) {
			this.jq.on(this.refresh_event, (ea, data, event) => {
				this.refresh();
			});
		}
	}
	async refresh() {
		this.jq.empty();
		this.element_configs = [];
		this.jq.append("<span>Loading...</span>");
		let files = await dueui.getFileList(this.directory);

		for (let fe of files) {
			if (fe.type === "f") {
				let b = {
					"type": "button",
					"enabled": true,
					"value": this.formatName(fe.name),
					"label": this.formatName(fe.name),
					"file": fe.name,
					"actions": []
				};
				if (this.confirm_message) {
					b.actions_chooser.push({"type": this.action_type, "file": `${this.directory}/${fe.name}`, "label": this.confirm_message});
				} else {
					b.actions = {"type": this.action_type, "file": `${this.directory}/${fe.name}`};
				}
				this.element_configs.push(b);
			}
		}
		if (this.sort_autofill &&
			(this.sort_autofill === "label" || this.sort_autofill === "file")) {
			this.element_configs.sort((a, b) => {
				return a[this.sort_autofill].localeCompare(b[this.sort_autofill]);
			});
		}
		this.jq.empty();
		super.populate();
	}
	formatName(macro){
		name = (typeof macro === 'number' ? this.macros[macro] : macro);
		if (this.strip_directory) {
			name = name.replace(/.+[/]([^/]+)$/, "$1");
		}
		if (this.strip_prefix) {
			name = name.replace(/^[0-9]+_/, "");
		}
		if (this.strip_suffix) {
			name = name.replace(/[.][^.]+$/, "");
		}
		return name;
	}
}
DueuiElement.addElementType('file_grid', DueuiFileGridWidget);

class DueuiMacroGridWidget extends DueuiFileGridWidget {
	constructor(config, parent){
		super($.extend(true,
		{
			"directory": "/macros",
			"action_type": "macro",
		}, config, {"element_defaults": config.button_defaults}),parent);
	}
}
DueuiElement.addElementType('macro_grid', DueuiMacroGridWidget);

class DueuiHeaterWidget extends DueuiPanel {
	constructor(config, parent){
		super($.extend(true,
			{
				"style": {
					"width": "100px",
					"display": "flex",
					"flex-direction": "column",
					"border": "0px"
				},
				"element_defaults": {
					"style": {
						"width": "100%",
						"margin": "1px",
						"vertical-align": "middle"
					}
				},
				"state": {
					"states": [
						{"state": "off", "classes": "btn-secondary"},
						{"state": "standby", "classes": "btn-warning"},
						{"state": "on", "classes": "btn-success"},
						{"state": "fault", "classes": "btn-danger"},
						{"state": "tuning", "classes": "btn-info"},
					],
				},
				"show_set_fields": true,
				"actions_chooser": [
					{"type": "log", "severity": "E", "value": "The 'Off' command for heater '${this.value}' is not configured", "label": "Off (not configued)"},
					{"type": "log", "severity": "E", "value": "The 'Standby' command for heater '${this.value}' is not configured", "label": "Standby (not configued)"},
					{"type": "log", "severity": "E", "value": "The 'On' command for heater '${this.value}' is not configured", "label": "On (not configued)"},
					{"type": "log", "severity": "E", "value": "The 'Reset' command for heater '${this.value}' is not configured", "label": "Reset (not configued)"},
					{"type": "log", "severity": "E", "value": "The 'Tune' command for heater '${this.value}' is not configured", "label": "Tune (not configued)"},
				]
			}, config, {"element_defaults": config.button_defaults}
		), parent);

		let _this = this;
			let state_button = {
				"value": this.label,
				"icon": this.icon,
				"icon_position": this.icon_position,
				"type": "button",
				"state": this.state,
				"onstatus": function(status) { _this.current_state = this.state.current; },
				"actions_chooser": this.actions_chooser
			};

			let temp_button = {
				"type": "button",
				"value": this.temp_fields.current,
				"initial_value": 0,
				"read_only": true,
				"classes": "btn",
				"tolerance": this.tolerance,
				"onstatus": this.tolerance ? function(status) {
					_this.current_temp = Number(this.val());
					_this.standby_temp = DueUI.evalStatus(status, _this.temp_fields.standby, _this);
					_this.active_temp = DueUI.evalStatus(status, _this.temp_fields.active, _this);
					if (_this.current_state == "standby" || _this.current_state == "active") {
						let set_temp = _this.current_state == "standby" ? _this.standby_temp : _this.active_temp;
						let diff = Math.abs(set_temp - _this.current_temp);
						this.processTolerance(status, diff);
					} else {
						this.clearTolerance();
					}
				} : false
			};

			let active_input = {
				"type": "input",
				"input": {
					"id": `${this.id}_input_active`,
					"field_type": "number",
					"value": this.temp_fields.active,
					"style": {"text-align": "right"},
					"actions": {"type": "gcode", "gcode": keyExistsOn(this, "set_temp_commands.active")
						? this.set_temp_commands.active
						: `M117 "'set_temp_commands.active' is not set for heater ${config.label}"`, "get_reply": true}
				},
				"button": {
					"style": {"width": "50px"},
					"icon": "done",
					"actions": {"type": "event", "event": "dueui-submit", "target": `#${this.id}_input_active`}
				}
			};

			let standby_input = {
				"type": "input",
				"input": {
					"id": `${this.id}_input_standby`,
					"field_type": "number",
					"value": this.temp_fields.standby,
					"style": {"text-align": "right"},
					"actions": {"type": "gcode", "gcode": keyExistsOn(this, "set_temp_commands.standby")
						? this.set_temp_commands.standby
						: `M117 "'set_temp_commands.standby' is not set for heater ${config.label}"`, "get_reply": true}
				},
				"button": {
					"style": {"width": "50px"},
					"icon": "done",
					"actions": {"type": "event", "event": "dueui-submit", "target": `#${this.id}_input_standby`}
				}
			};

		this.element_configs = [
			state_button,
			temp_button,
		];
		if (this.show_set_fields) {
			this.element_configs.push(active_input);
			this.element_configs.push(standby_input);
		}

		this.populate();
	}
}
DueuiElement.addElementType('heater', DueuiHeaterWidget);

class DueuiHeaterLabelsWidget extends DueuiPanel {
	constructor(config, parent){
		super($.extend(true,
			{
				"style": {
					"border": "0px",
					"display": "flex",
					"flex-direction": "column",
				},
                "element_defaults": {
                	"type": "label",
                	"read_only": true,
                	"style": {
    					"margin": "1px",
    					"width": "9ch",
                    	"padding-right": "5px",
                    	"text-align": "right",
                    	"vertical-align": "middle"
                	},
                },
				"element_configs": [
					{"value": "Name:"},
					{"value": "Current:"},
					{"value": "Active:"},
					{"value": "Standby:"}
				]
			}, config, {"element_defaults": config.button_defaults}
		), parent);
	}
}
DueuiElement.addElementType('heater_labels', DueuiHeaterLabelsWidget);

class DueuiCheckboxWidget extends DueuiButtonWidget {
	constructor(config, parent){
		super($.extend(true,
		{
			"onsubmit": function() {
				this.val(!this.current_state);
			}

		}, config), parent);
	}
	val(val) {
		if (typeof(val) === 'undefined') {
			return this.current_state;
		}
		this.current_state = val;
		if (val) {
//			this.jq.html(`${this.label}: On`);
			if (this.on_style) {
				this.jq.css(this.on_style);
			}
		} else {
//			this.jq.html(`${this.label}: Off`);
			if (this.off_style) {
				this.jq.css(this.off_style);
			}
		}
	}
}
DueuiElement.addElementType('checkbox', DueuiCheckboxWidget);

class DueuiPositionWidget extends DueuiPanel {
	constructor(config, parent){
		super($.extend(true,
		{
			"skip_population": true,
			"style": {
				"display": "flex",
				"flex-direction": config.direction
			},
            "element_defaults": {
                "style": {"width": "100%", "font-size": "100%", "margin": "0px", "padding": "0px"},
				"state": {
					"states": [
						{"state": false, "classes": "btn-warning"},
						{"state": true, "classes": "btn-success"}
					]
				}
            }
		}, config, {"element_defaults": config.button_defaults}), parent);
		this.axes = this.axes || [];
		for (var ix = 0; ix < this.axes.length; ix++) {
			this.element_configs.push({
				"value": this.axes[ix].label + " " + this.axes[ix].position_field,
				"initial_value": `${this.axes[ix].label} 0.000`,
				"type": "button",
//				"title": this.axes[ix].title || "Home " + this.axes[ix].gcode_axis,
				"state": {
					"field": this.axes[ix].state_field,
				},
				"actions": {"type": "gcode", "gcode": "G28 " + this.axes[ix].gcode_axis, "get_reply": true }
			});
		}
		this.populate();
	}
}
DueuiElement.addElementType('position', DueuiPositionWidget);

class DueuiJogWidget extends DueuiPanel {
	constructor(config, parent){
		super($.extend(true,
		{
			"skip_population": true,
			"initial_scale": 0,
			"style": {"border": "0px", "display": "flex", "flex-direction": config.direction ? config.direction : "row"},
			"speed_change_event": DUEUI.EVENTS.JOG_SPEED,
			"scale_change_event": DUEUI.EVENTS.JOG_SCALE,
			"sense_change_event": DUEUI.EVENTS.JOG_SENSE,
			"jog_command": "M120;G91;G1 ${axis}${position} F${speed} ${sense};M121",
			"element_defaults": config.button_defaults
		}, config), parent);
		var _this = this;
		this.current_scale = 0;
		this.current_speed = 0;
		this.current_sense = "";
		this.scales = this.values.length;
		this.value_count = this.values[this.current_scale].length;

		for (let ix = 0; ix < this.value_count; ix++) {
			let val = this.values[this.current_scale][ix];
			let bc;

			if (typeof(val) === 'object' && typeof(val.type) === 'string') {
				bc = $.extend(true, {
					"style": {"position": "relative"},
				}, val);
			} else {
				bc = {
					"value": `${val}`,
					"type": "button",
					"is_value": true,
					"style": {"position": "relative"},
//					"read_only": (typeof(val) === 'string'),
					"val": function(val) {
						if (typeof(val) === 'undefined') {
							let position = parseFloat(_this.values[_this.current_scale][ix]);
							let speed = _this.current_speed;
							let axis = _this.axis;
							let sense = _this.current_sense;
							let gc = eval("`" + _this.jog_command + "`");
							return gc;
						} else {
							this.value_object[this.value_function](val);
						}
					},
					"actions": {"type": "gcode", "gcode": "${value}", "get_reply": true, "no_echo": true}
				};
			}

			this.element_configs.push(bc);
		}
		this.populate();

		if (this.scale_change_event) {
			this.jq.on(this.scale_change_event, (ea, data, event) => {
				this.toggleScale(data);
			});
		}

		if (this.speed_change_event) {
			this.jq.on(this.speed_change_event, (ea, data, event) => {
				this.current_speed = data;
			});
		}

		if (this.sense_change_event) {
			this.jq.on(this.sense_change_event, (ea, data, event) => {
				this.current_sense = data;
			});
		}
	}
	toggleScale(scale) {
		if (typeof(scale) === 'number' && scale < this.scales) {
			this.current_scale = scale;
		} else {
			if (++this.current_scale >= this.scales) {
				this.current_scale = 0;
			}
		}
		this.jq.children().each((ix, b) => {
			b.innerHTML = this.values[this.current_scale][ix];
		});
	}
}
DueuiElement.addElementType('jog', DueuiJogWidget);

class DueuiHtmlWidget extends DueuiWidget {
	constructor(config, parent) {
		super("div", $.extend(true, {
		}, config), parent);
		this.jq.append(this.html);
	}
}
DueuiElement.addElementType('html', DueuiHtmlWidget);

class DueuiImageWidget extends DueuiWidget {
	constructor(config, parent) {
		super("div", $.extend(true, {
		}, config), parent);
		this.jq_img = $(`<img>`);
		if (this.src) {
			 this.jq_img.prop("src", this.src);
		}
		this.jq_img.css(this.style);
		if (this.alt) {
			this.jq_img.prop("alt", this.alt);
		}
		this.jq.append(this.jq_img);
		if (this.refresh_seconds) {
			setInterval(() => {
				let src = this.src;
				if (src.indexOf("?") > -1) {
					src += `&_date=${new Date().getTime()}`;
				} else {
					src += `?_date=${new Date().getTime()}`;
				}
			    this.jq_img.attr("src", src);
			},this.refresh_seconds * 1000);
		}
	}
}
DueuiElement.addElementType('image', DueuiImageWidget);

class DueuiSliderWidget extends DueuiWidget {
	constructor(config, parent) {

		if (config.orientation === "vertical") {
			config.style.height = config.style.height || "30ch";
			config.style.width = config.style.width || "3ch";
		} else {
			config.style.height = config.style.height || "3ch";
			config.style.width = config.style.width || "30ch";
		}

		super("input", $.extend(true, {
			"attr": {
				"type": "range",
				"min": config.min || 0,
				"max": config.max || 100,
				"step": config.step || 5
			},
			"classes": "custom-range"
		}, config), parent);

		if (this.orientation === "vertical") {
			let s = {
				"height": this.style.width,
				"width": this.style.height,
				"transform": "rotate(-90deg)",
				"transform-origin": "50% 500%"
			}
			this.jq.css(s);
		}

		this.value_object = this.jq;
		this.value_function = (val) => {
			if (typeof(val) === 'undefined') {
				return this.jq.val();
			} else {
				this.jq.val(val);
			}
		};

		var value = this.value;
		if (value.indexOf("${") >= 0) {
			value = this.initial_value;
		}
		this.val(value);

		this.last_value = "";
		this.last_state = "";

		this.jq.addClass("state-poll-listener");
		this.jq.on("duet_poll_response", (event, state) => {
			var val = DueUI.evalStatus(state, this.value, this);
			this.val(val);
		});
		this.obsubmit = (event) => {
			console.log(event);
		};

		this.setupEvents("change", false);
	}
}
DueuiElement.addElementType('slider', DueuiSliderWidget);

class DueuiProgressWidget extends DueuiWidget {
	constructor(config, parent) {
		let classes = "progress " + (config.classes || "");
		delete config.classes;
		super("div", $.extend( true, {
		}, config, {"classes": classes}),parent);

		this.jq.append(`<div class="progress-bar" role="progressbar"></div>`);
		this.jq_pb = $(`#${this.id} .progress-bar`);
		if (config.classes) {
			this.jq_pb.addClass(config.classes);
		}
		this.jq_pb.attr({
			 "aria-valuenow": this.initial_value || 0,
			 "aria-valuemin": this.min || 0,
			 "aria-valuemax": this.max || 100
		});
		if (this.initial_value) {
			this.jq_pb.width( this.jq.width() * (this.initial_value / 100.0))
		}

		this.value_function = (val) => {
			if (typeof(val) === 'undefined') {
				return this.jq_pb.attr("aria-valuenow");
			} else {
				this.jq_pb.width( this.jq.width() * (parseInt(val) / 100.0));
				this.jq_pb.attr("aria-valuenow", parseInt(val));
			}
		};
	}
}
DueuiElement.addElementType('progress', DueuiProgressWidget);

class DueuiHeightmapWidget extends DueuiWidget {
	constructor(config, parent) {
		super("table", $.extend( true, {
			"high_point_char": "&and;",
			"low_point_char": "&or;",
			"zero_point_char": "&radic;",
			"point_style": {
				"width": "15px",
				"height": "10px",
				"font-size": "10px"
			}
		}, config, {"classes": ""}),parent);

		this.refresh();

		if (this.refresh_event) {
			this.jq.on(this.refresh_event, (ea, data, event) => {
				this.refresh();
			});
		}

		this.jq.addClass("gcode-reply-listener");
		this.jq.on("gcode_reply", (event, reply) => {
			if (reply.response.indexOf("Height map saved to file") >= 0) {
				this.refresh();
			}
		});
	}

	async refresh() {
		this.jq.empty();
		this.jq.append(`
				<tr>
				<td><table id="${this.id}_map" border=0></table></td>
				<td><table id="${this.id}_legend" style='margin-left: 20px;' border=0></table></td>
				</tr>
				<tr><td id="${this.id}_stats" style='padding-left: 0ch; height: 4em; vertical-align: bottom;'/></tr>
				`.trim());

		this.jq_map = $(`#${this.id}_map`);
		this.jq_legend = $(`#${this.id}_legend`);
		let resp = await getTextFromDuet("/sys/heightmap.csv", {normalize: true});
		if (resp.ok) {
			let rows = resp.data.split('\n');
			this.local_hm(rows);
		}
	}

	generateColorGradient(len){
		let colors = { "high": [], "low": []};
		let break_point = Math.floor(len / 2);
		let inc = Math.floor(256 / (len / 2));

		for (let i = 0; i < len; i++) {
			let ch = [];
			let cl = [];
			cl[0] = 0x00;
			if (i < break_point) {
				ch[0] = i * inc;
				ch[1] = 0xff;
				cl[1] = ch[1];
				cl[2] = i * inc;
			} else {
				ch[0] = 0xff;
				ch[1] = 255 - ((i - break_point) * inc);
				cl[1] = ch[1];
				cl[2] = 0xff;
			}
			ch[2] = 0x00;
			colors.high.push(DueUI.rgb2hex(ch));
			colors.low.push(DueUI.rgb2hex(cl));
		}
		return colors;
	}

	local_hm(rows) {

		let precision = 8;

		let colors = this.generateColorGradient(precision);

		let control = rows[2].split(',');
		let xMin = parseFloat(control[0]);
		let xMax = parseFloat(control[1]);
		let yMin = parseFloat(control[2]);
		let yMax = parseFloat(control[3]);
		let radius = parseFloat(control[4]);
		let xSpacing = parseFloat(control[5]);
		let ySpacing = parseFloat(control[6]);
		let xPoints = parseInt(control[7]);
		let yPoints = parseInt(control[8]);
		let zMin = 0;
		let zMax = 0;
		let int_rows = [];

		let points = 0;
		let mean_all = 0;
		let rms_all = 0;
		let std_dev_all = 0;
		let z_all = [];

		let points_high = 0;
		let mean_high = 0
		let rms_high = 0;
		let std_dev_high = 0;
		let z_high = [];

		let points_low = 0;
		let mean_low = 0
		let rms_low = 0;
		let std_dev_low = 0;
		let z_low = [];
		let zLow = 0;
		let zHigh = 0;

		for(let i=0; i < yPoints; i++)
		{
			let dr = rows[3 + i].split(',');
			for (let j = 0; j < xPoints; j++) {
				if (radius > 0 && dr[j] == 0) {
					if (!DueUI.pointInCircle(j, i, xPoints / 2, xPoints / 2, (xPoints - 1) / 2)) {
						dr[j] = NaN;
					}
				} else {
					dr[j] = parseFloat(dr[j]);
					points++;
					mean_all += dr[j];
					rms_all += (dr[j] * dr[j]);
					z_all.push(dr[j]);
					if (dr[j] > 0) {
						points_high++;
						z_high.push(dr[j]);
						mean_high += dr[j];
						rms_high += (dr[j] * dr[j]);
					} else if (dr[j] < 0) {
						points_low++;
						z_low.push(dr[j]);
						mean_low += dr[j];
						rms_low += (dr[j] * dr[j]);
					}
					dr[j] *= 1000.0;
					zMin = Math.min(zMin, dr[j]);
					zMax = Math.max(zMax, dr[j]);
				}
			}
			int_rows.push(dr);
		}

		zLow = zMin;
		zHigh = zMax;

		if (this.scale_min) {
	        zMin = this.scale_min * 1000.0;
		}

		if (this.scale_max) {
	        zMax = this.scale_max * 1000.0;
		}

		mean_all /= points;
		rms_all = Math.sqrt(rms_all / points);
		std_dev_all = z_all.reduce((acc, cv) => {
			return acc + ((cv - mean_high) * (cv - mean_all));
		});
		std_dev_all = Math.sqrt(std_dev_all / points);

		mean_high /= points_high;
		rms_high = Math.sqrt(rms_high / points_high);
		std_dev_high = z_high.reduce((acc, cv) => {
			return acc + ((cv - mean_high) * (cv - mean_high));
		});
		std_dev_high = Math.sqrt(std_dev_high / points_high);

		mean_low /= -points_low;
		rms_low = Math.sqrt(rms_low / points_low);
		std_dev_low = z_high.reduce((acc, cv) => {
			return acc + ((cv - mean_low) * (cv - mean_low));
		});
		std_dev_low = Math.sqrt(std_dev_low / points_low);

		let jq_tb = $('<tbody/>');

		for(let y = yPoints-1; y >= 0; y--) {
			let jq_row = $("<tr/>");
			let r = int_rows[y];
			let y_scale = (y % 2) == 0 ? ((y * ySpacing) + yMin).toFixed(0) : "";
			jq_row.append(`<td style='text-align: right; font-family: monospace;'>${y_scale}</td>`);

			for (let x = 0; x < xPoints; x++) {
				let z = r[x];
				let fgcolor = "#000000";
				let bgcolor = "#e0e0e0";
				let v = '&nbsp;';

				if (isNaN(z)) {
					bgcolor = "#e0e0e0";
				} else if (z < 0) {
					let cix = Math.abs( Math.floor((Math.max(z, zMin) / (zMin - 1)) * (precision) ));
					bgcolor = colors.low[ cix ];
					fgcolor = bgcolor;
					v = this.low_point_char;
					if (z <= zLow) {
						fgcolor = "#ffffff";
					}
				} else if (z == 0) {
					bgcolor = "#00ff00";
					fgcolor = "#000000";
					v = this.zero_point_char;
				} else {
					let cix = Math.abs( Math.floor((Math.min(z, zMax) / (zMax + 1)) * (precision) ));
					bgcolor = colors.high[ cix ];
					fgcolor = bgcolor;
					v = this.high_point_char;
					if (z >= zHigh) {
						fgcolor = "#ffffff";
					}
				}
				let tooltip = `X: ${((x * xSpacing) + xMin).toFixed(2)}<br>Y: ${((y * ySpacing) + yMin).toFixed(2)}<br>Z: ${(z / 1000.0).toFixed(3)}`;
				let jq_col = $(`<td data-toggle='tooltip' data-html='true' data-title='${tooltip}'
					style='text-align: center; vertical-align: middle; margin: 0px; padding: 0px; color: ${fgcolor}; background: ${bgcolor};'>${v}</td>`);
				jq_col.css(this.point_style);
				jq_row.append(jq_col);
			}
			jq_tb.append(jq_row);
		}
		let jq_row = $('<tr/>');
		jq_row.append('<td/>');
		for (let x = 0; x < xPoints; x++) {
			let v = ((xSpacing * x) + xMin).toFixed(0);
			jq_row.append(`<td><div style='width: 1ch; font-family: monospace; transform: rotate(90deg); transform-style: preserve-3d;'>${(x % 2 == 0) ? v : ""}</div></td>`);
		}
		jq_tb.append(jq_row);

		$(`#${this.id}_map`).append(jq_tb);
		this.jq_map.find("td").tooltip();

		$(`#${this.id}_stats`).append(`
<span style='font-family: monospace;'>
&nbsp;All Points: ${points.toString().padStart(4, ' ').replace(' ', '&nbsp;')} Mean: ${mean_all.toFixed(3)} RMS: ${rms_all.toFixed(3)} STDDEV: ${std_dev_all.toFixed(3)}<br>
High Points: ${points_high.toString().padStart(4, ' ').replace(' ', '&nbsp;')} Mean: ${mean_high.toFixed(3)} RMS: ${rms_high.toFixed(3)} STDDEV: ${std_dev_high.toFixed(3)}<br>
&nbsp;Low Points: ${points_low.toString().padStart(4, ' ').replace(' ', '&nbsp;')} Mean: ${mean_low.toFixed(3)} RMS: ${rms_low.toFixed(3)} STDDEV: ${std_dev_low.toFixed(3)}</span>
		`.trim());


		let inc = Math.ceil(zMax / precision);
		for (let i = precision - 1; i > 0; i--) {
			let vm = i * inc;
			let v = Math.ceil((vm / zMax) * precision);
			let c =  colors.high[v - 1];
			if (c === undefined) {
				continue;
			}
	 		vm += inc;
			let jq_row = $("<tr/>");
			this.jq_legend.append(jq_row);
			let q = "&nbsp;";
			if (i == precision - 1) {
				q = `&nbsp;${this.high_point_char}&nbsp;`;
			}
			jq_row.append(`<td style='width: 2ch; padding: 2px; color: #ffffff; background: ${c}'>${q}</td>`);
			jq_row.append(`<td style='text-align: right; font-family: monospace;'>${Math.min((zMax / 1000), (vm / 1000)).toFixed(3)}</td>`);
		}

		this.jq_legend.append(`<tr><td style='background: #00ff00;'>&nbsp;${this.zero_point_char}&nbsp;</td><td style='text-align: right; font-family: monospace;'>&nbsp;0.000</td></tr>`);

		inc = Math.floor(zMin / precision);
		for (let i = 1; i < precision; i++) {
			let vm = i * inc;
			let v = Math.round((vm / (zMin)) * precision);
			let c =  colors.low[v ];
			if (c === undefined) {
				continue;
			}
			vm += inc;
			let jq_row = $("<tr/>");
			this.jq_legend.append(jq_row);
			let q = "&nbsp;";
			if (i == precision - 1) {
				q = `&nbsp;${this.low_point_char}&nbsp;`;
			}
			jq_row.append(`<td style='width: 2ch; padding: 2px; color: #ffffff; background: ${c}'>${q}</td>`);
			jq_row.append(`<td style='text-align: right; font-family: monospace;'>${Math.max((zMin / 1000), (vm / 1000)).toFixed(3)}</td>`);
		}

	}

}
DueuiElement.addElementType('heightmap', DueuiHeightmapWidget);
