
class DueuiWidget extends DueuiElement {
	constructor(html_element, config, parent){
		super(html_element, config, parent);
		
		if (this.actions && this.actions.length > 1 && this.actions_type === "choose") {
			this.setupMultiActionDialog();
		}
		
		if (this.tolerances && !this.onstatus) {
			this.last_tolerance = -1;
			if (!this.default_tolerance_style) {
				let style_keys = {};
				for (let t of config.tolerances) {
					$.extend(style_keys, t.style);
				}
				style_keys = Object.keys(style_keys);
				this.default_tolerance_style = this.jq.css(style_keys);
			}
			this.onstatus = (status) => {
				let val = (typeof(this.tolerance_value) === 'undefined' ? this.val() : this.tolerance_value);
				val = DueUI.evalStatus(status, val, this);
				let ix = 0;
				for (let t of config.tolerances) {
					if (val <= t.limit) {
						if (ix != this.last_tolerance) {
							this.jq.css(t.style);
							this.last_tolerance = ix;
						}
						break;
					}
					ix++;
				}
			};
		}
		
		if (this.status_level 
				&& ((this.value && typeof(this.value) === 'string' && this.value.indexOf("${") >= 0)
				|| this.state_field || this.onstatus)) {
			this.jq.addClass(`status-poll-listener-${this.status_level || 1}`);
			this.jq.on("duet_poll_response", (event, status) => {
				if (this.value.indexOf("${") >= 0) {
					var val = DueUI.evalStatus(status, this.value, this);
					this.val(val);
				}
				if (this.state_field) {
					var state = DueUI.evalStatus(status, this.state_field);
					if (state !== this.last_state) {
						if (this.state_styles && this.state_styles[state]) {
							this.css($.extend(true, {}, this.style, this.state_styles[state]));
						}
						this.last_state = state;
					}
				}
				if (this.onstatus) {
					this.onstatus(status);
				}
			});
		}
	}
	setupMultiActionDialog() {
		this.setOnEvent("click", () => {
			this.jq.append(`<div id='${this.id}_dialog' title='${this.value}'/>`);
			let jq_dialog = $(`#${this.id}_dialog`);
			let buttons = [];
			let width = 0;
			for (let action of this.actions) {
				var a = $.extend(true, {}, action);
				buttons.push({
					"value": a.label || a.action,
					"type": "button",
					"style": {
						"height": "2.5em"
					},
					"actions": [ $.extend(true, {}, a, {"fire_on_startup": false}) ],
					"onsubmit": () => {
						jq_dialog.dialog("close");
					}
				});
				width = Math.max(width, action.label ? action.label.length : action.action.length);
			};
			width += 5;
			let bgdialog = new DueuiPanel({
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
				"position": {"my": "center", "at": "center", "of": this.jq},
				"width": width * 15,
				"height": buttons.length * 64
			})
			jq_dialog.dialog({"close": () => {
					jq_dialog.dialog("destroy");
					jq_dialog.remove();
				}
			});
		});
	}

	css(style) {
		let css_object = this.css_object || this.jq;
		if (style.content) {
			this.val(style.content);
		}
		return css_object.css(style);
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
		if (skipcheck || val != this.last_value) {
			if (typeof(this.value_function) === 'string') {
				value_object[this.value_function](val);
			} else {
				this.value_function(val);
			}
			this.last_value = val;
		}
	}
}

class DueuiButtonWidget extends DueuiWidget {
	constructor(config, parent){
		super("button", $.extend(true,
			{
				"classes": "dueui-widget-button",
				"initial_value": "",
				"value": "",
				"style": {
					"pointer-events": config.read_only ? "none" : null
				}
			}, config), parent);
		var value = this.value;
		if (value.indexOf("${") >= 0) {
			value = this.initial_value;
		}
		this.last_value = "";
		this.last_state = "";

		this.value_function = "html";
		this.value_object = this.jq;
		var options = {};
		if (this.value) {
			options.label = value;
		}
		if (this.icon) {
			options.icon = this.icon;
			options.iconPosition = this.icon_position || "right";
		}
		this.jq.button(options);
		if (this.icon_style) {
			let x = this.jq.children().filter(".ui-icon");
			x.css(this.icon_style);
		}

		this.setupEvents("click", true);

	}
}
DueuiElement.addElementType('button', DueuiButtonWidget);

class DueuiLabelWidget extends DueuiWidget {
	constructor(config, parent) {
		super("div", $.extend(true, {
			"classes": "ui-widget"
		}, config), parent);
		this.jq.html(this.value);
		this.value_function = "html";
		this.value_object = this.jq; 
	}
}
DueuiElement.addElementType('label', DueuiLabelWidget);

class DueuiInputFieldWidget extends DueuiWidget {
	constructor(config, parent) {
		super("input", $.extend(true, {
			"classes": "dueui-widget-input-field",
			"style": Object.assign({"height": "2.5em"}, config.style),
			"attr": {
				"type": config.field_type
			}
		}, config), parent);
		this.value_function = "val";
		this.value_object = this.jq;

		this.setupEvents("keypress", true);

		if (this.autocomplete_key) {
			this.jq.on("dueui-submit", (event) => {
				let val = this.jq.val();
				let ac = dueui.getSetting(`ac_${this.jq.autocomplete_key}`) || [];
				if (!ac.includes(val)) {
					ac.push(val);
					ac.sort();
					dueui.setSetting(`ac_${this.jq.autocomplete_key}`, ac);
				}
			});

			this.jq.autocomplete({
				source: (req, resp) => {
					let ac = dueui.getSetting(`ac_${this.jq.autocomplete_key}`) || [];
					let search = $.ui.autocomplete.escapeRegex(req.term);
					let r = new RegExp(`^${search}`);
					resp(ac.filter((term) => {
						return r.test(term);
					}));
				}
			})
		}

		if (this.status_level) {
			this.jq.addClass(`status-poll-listener-${this.status_level}`);
			this.jq.on("duet_poll_response", (event, status) =>	 {
				if (this.jq.is(":focus")) {
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
			if (this.value) {
				var v = DueUI.evalValue(this.value, "");
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
				"classes": "dueui-widget-input",
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
				"target_element": this.input_widget,
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
		super("select", $.extend(true,
		{
			"options": []
		}, config), parent);
		this.value_function = "val";
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
		super("textarea", $.extend(true, {
			"classes": "dueui-widget-textarea",
			"new_entries_at_top": false,
			"attr": {
				"readonly": config.read_only
			}
		}, config), parent);
		this.value_function = "val";
		this.value_object = this.jq;
		if (this.wrap) {
			this.jq.attr("wrap", this.wrap);
		}

		if (this.show_gcode_replies) {
			this.jq.addClass("gcode-reply-listener");
			this.jq.on("gcode_reply", (event, reply) => {
				var v = this.jq.val();
				var d = reply.timestamp;
				if (this.new_entries_at_top) {
					v = `${DueUI.formatTime(d)} ${reply.gcode}: ${reply.response}\n` + v;
				} else {
					v += `\n${DueUI.formatTime(d)} ${reply.gcode}: ${reply.response}`;
				}
				this.jq.val(v);
				if (!this.new_entries_at_top) {
					this.jq.scrollTop(this.jq[0].scrollHeight);
				}
			});
		}
		if (this.show_log_messages) {
			this.jq.addClass("log-message-listener");
			this.jq.on("log_message", (event, log) => {
				var v = this.jq.val();
				var d = log.timestamp;
				if (this.new_entries_at_top) {
					v = `${DueUI.formatTime(d)} ${log.severity}: ${log.message}\n` + v;
				} else {
					v += `\n${DueUI.formatTime(d)} ${log.severity}: ${log.message}`;
				}
				this.jq.val(v);
				if (!this.new_entries_at_top) {
					this.jq.scrollTop(this.jq[0].scrollHeight);
				}
			});
		}
	}
}
DueuiElement.addElementType('textarea', DueuiTextAreaWidget);

class DueuiStatusWidget extends DueuiButtonWidget {
	constructor(config, parent){
		super(Object.assign(
			{
				"classes": "dueui-widget-status",
				"style": {"height": "3.0em"},
				"noclick": true
			}, config), parent);
		this.last_status = "";
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
			this.update(response.status);
		});
	}
	update(status) {
		if (status != this.last_status) {
			this.css(dueui.status_map[status].style);
			this.val(dueui.status_map[status].label);
			this.last_status = status;
		}
	}
}
DueuiElement.addElementType('status', DueuiStatusWidget);

class DueuiGridWidget extends DueuiPanel {
	constructor(config, parent){
		super($.extend(true,
			{
				"classes": "dueui-widget-grid",
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
			"classes": "dueui-widget-button-grid",
			"skip_population": true,
			"directory": "/gcodes",
			"action_type": "print",
			"rows": 999,
			"refresh_event": "refresh_list"
		}, config, {"element_defaults": config.button_defaults}), parent);

		this.refresh();
		
		if (this.refresh_event) {
			this.jq.on(this.refresh_event, (ea, data, event) => {
				this.refresh();
			});
		}
	}
	refresh() {
		this.jq.empty();
		this.element_configs = [];
		this.jq.append("<span>Loading...</span>");
		dueui.getJSON(`/rr_filelist?dir=0:${this.directory}`).then((data) => {
			for (let fe of data.files) {
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
						b.actions.push({"type": "confirm", "message": this.confirm_message}) 
					}
					b.actions.push({"type": this.action_type, "file": `${this.directory}/${fe.name}`});
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
		});
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
			"action_type": "macro"
		}, config, {"element_defaults": config.button_defaults}), parent);
	}
}
DueuiElement.addElementType('macro_grid', DueuiMacroGridWidget);

class DueuiHeaterWidget extends DueuiPanel {
	constructor(config, parent){
		super($.extend(true,
			{
				"classes": "dueui-widget-heater",
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
				}
			}, config, {"element_defaults": config.button_defaults}
		), parent);

			let state_button = {
				"value": this.label,
				"type": "button",
				"status_level": this.status_level || 1,
				"state_styles": this.state_styles || [
	            	{ "background": "gray", "color": "white" },
	            	{ "background": "green", "color": "white" },
	            	{ "background": "lightgreen", "color": "black" },
	            	{ "background": "red", "color": "black" },
	            	{ "background": "voilet", "color": "black" }
	            ],
				"state_field": "${status.temps.state["+this.heater_index+"]}",
				"actions_type": "choose",
				"actions": [
					{"type": "gcode", "label": "Off", "gcode":
						(this.state_commands && this.state_commands.off)
						? this.state_commands.off
						: `M308 P${this.heater_index} T0`, "get_reply": true},
					{"type": "gcode", "label": "Standby", "gcode":
						(this.state_commands && this.state_commands.standby)
						? this.state_commands.standby
						: `M308 P${this.heater_index} T1`, "get_reply": true},
					{"type": "gcode", "label": "On", "gcode":
						(this.state_commands && this.state_commands.on)
						? this.state_commands.on
						: `M308 P${this.heater_index} T2`, "get_reply": true}
				]
			};

			let temp_button = {
				"type": "button",
				"value": this.current_temp_field || "${status.temps.current["+this.heater_index+"]}",
				"initial_value": 0,
				"status_level": this.status_level || 1,
				"read_only": true,
				"tolerances": this.tolerances,
				"onstatus": this.tolerances ? function(status) {
					var state = status.temps.state[config.heater_index];
					let current_temp = this.val();

					if (!this.default_tolerance_style) {
						let style_keys = {};
						for (let t of config.tolerances) {
							$.extend(style_keys, t.style);
						}
						style_keys = Object.keys(style_keys);
						this.default_tolerance_style = this.jq.css(style_keys);
					}
					if (0 < state && state < 3) {
						let active_temp = (config.active_temp_field 
								? DueUI.evalStatus(status, config.active_temp_field, this)
								: status.temps.active[config.heater_index]);
						let standby_temp = (config.standby_temp_field 
								? DueUI.evalStatus(status, config.standby_temp_field, this)
								: status.temps.standby[config.heater_index]);
						
						let set_temp = state == 1 ? standby_temp : active_temp;
						var ix;
						for (ix = 0; ix < this.tolerances.length; ix++) {
							let l = this.tolerances[ix].limit;
							if ((set_temp - l) <= current_temp && current_temp <= (set_temp + l)) {
								break;
							}
						}
						if (ix != this.last_tolerance && ix < this.tolerances.length) {
							this.jq.css(this.tolerances[ix].style);
							this.last_tolerance = ix;
						}
					} else {
						if (this.last_tolerance != -1) {
							this.jq.css(this.default_tolerance_style);
							this.last_tolerance = -1;
						}
					}
				} : false
			};

			let active_input = {
				"type": "input",
				"input": {
					"id": `${this.id}_input_active`,
					"field_type": "number",
					"value": config.active_temp_field || "${status.temps.active["+config.heater_index+"]}",
					"style": {"text-align": "right"},
					"status_level": config.status_level || 1,
					"actions": [
						{"type": "gcode", "gcode": (config.set_temp_commands && config.set_temp_commands.active)
						? config.set_temp_commands.active
						: "M308 P" + config.heater_index + " S${value}", "get_reply": true}
					]
				},
				"button": {
					"style": {"width": "50px"},
					"icon": "ui-icon-check",
					"icon-position": "left",
					"icon_style": {"zoom": "150%"},
					"actions": [
						{"type": "event", "event": "dueui-submit", "target": `#${this.id}_input_active`}
					]
				}
			};
			
			let standby_input = {
				"type": "input",
				"input": {
					"id": `${this.id}_input_standby`,
					"field_type": "number",
					"value": config.standby_temp_field || "${status.temps.standby["+config.heater_index+"]}",
					"style": {"text-align": "right"},
					"status_level": config.status_level || 1,
					"actions": [
						{"type": "gcode", "gcode": (config.set_temp_commands && config.set_temp_commands.standby)
						? config.set_temp_commands.standby
						: "M308 P" + config.heater_index + " R${value}", "get_reply": true}
					]
				},
				"button": {
					"style": {"width": "50px"},
					"icon": "ui-icon-check",
					"icon-position": "left",
					"icon_style": {"zoom": "150%"},
					"actions": [
						{"type": "event", "event": "dueui-submit", "target": `#${this.id}_input_standby`}
					]
				}
			};
			
		this.element_configs = [
			state_button,
			temp_button,
			active_input,
			standby_input
		];
		
		
		this.populate();
	}
}
DueuiElement.addElementType('heater', DueuiHeaterWidget);

class DueuiHeaterLabelsWidget extends DueuiPanel {
	constructor(config, parent){
		super($.extend(true,
			{
				"classes": "dueui-widget-heater",
				"style": {
					"border": "0px",
					"display": "flex",
					"flex-direction": "column",
				},
                "element_defaults": {
                	"type": "button",
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
			"classes": "dueui-widget-checkbox",
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
			"classes": "dueui-widget-position",
			"skip_population": true,
			"style": {
				"display": "flex",
				"flex-direction": config.direction
			},
            "element_defaults": {
                "style": {"width": "100%", "font-size": "100%", "margin": "0px", "padding": "0px"},
				"status_level": 1,
				"state_styles": [
    				{ "background": "red", "color": "white" },
    				{ "background": "lightgreen", "color": "black" }
    			]
            }
		}, config, {"element_defaults": config.button_defaults}), parent);
		this.axes = this.axes || [];
		for (var ix = 0; ix < this.axes.length; ix++) {
			this.element_configs.push({
				"value": this.axes[ix].label + " ${status.coords.xyz["+ this.axes[ix].index+"].toFixed(3).padStart(7)}",
				"initial_value": `${this.axes[ix].label} 0.000`,
				"type": "button",
				"title": this.axes[ix].title || "Home " + this.axes[ix].gcode_axis,
				"state_field": "${status.coords.axesHomed["+this.axes[ix].index+"]}",
				"actions": [ {"type": "gcode", "gcode": "G28 " + this.axes[ix].gcode_axis, "get_reply": true } ]
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
			"classes": "dueui-widget-jog",
			"skip_population": true,
			"initial_scale": 0,
			"style": {"border": "0px", "display": "flex", "flex-direction": config.direction ? config.direction : "row"},
			"speed_change_event": "jog_speed",
			"scale_change_event": "jog_scale",
			"sense_change_event": "jog_sense",
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
			this.element_configs.push({
				"value": `${val}`,
				"type": "button",
				"is_value": true,
				"style": {"position": "relative"},
				"read_only": ((typeof(val) === 'string') || (typeof(val) === 'number' && val === 0)),
				"val": function(val) {
					if (typeof(val) === 'undefined') {
						let position = _this.values[_this.current_scale][ix];
						let speed = _this.current_speed;
						let axis = _this.axis;
						let sense = _this.current_sense;
						let gc = eval("`" + _this.jog_command + "`");
						console.log(gc);
						return gc;
					} else {
						this.value_object[this.value_function](val);
					}
				},
				"actions": [{"type": "gcode", "gcode": "${value}", "get_reply": true, "no_echo": true}]
			});
		}
		this.populate();

		if (this.scale_change_event) {
			this.jq.on(this.scale_change_event, (ea, data, event) => {
				this.toggleScale();
			});
		}

		if (this.speed_change_event) {
			this.jq.on(this.speed_change_event, (ea, data, event) => {
				console.log(`${this.axis} speed ${data}`);
				this.current_speed = data;
			});
		}

		if (this.sense_change_event) {
			this.jq.on(this.sense_change_event, (ea, data, event) => {
				console.log(`${this.axis} sense${data}`);
				this.current_sense = data;
			});
		}
	}
	toggleScale() {
		console.log(`Toggle ${this.axis} scale`);
		if (++this.current_scale >= this.scales) {
			this.current_scale = 0;
		}
		this.jq.children().each((ix, b) => {
			b.innerHTML = this.values[this.current_scale][ix];
		});
	}
}
DueuiElement.addElementType('jog', DueuiJogWidget);

class DueuiHtmlWidget extends DueuiWidget {
	constructor(config, parent) {
		super(config.html, $.extend(true, {
		}, config), parent);
	}
}
DueuiElement.addElementType('html', DueuiHtmlWidget);

class DueuiSliderWidget extends DueuiWidget {
	constructor(config, parent) {
		super("div", config, parent);
		this.jq.slider(this.slider);
		this.value_object = this.jq;
		this.value_function = (val) => {
			if (typeof(val) === 'undefined') {
				return this.jq.slider("value")
			} else {
				this.jq.slider("value", val);
			}
		};
		var value = this.value;
		if (value.indexOf("${") >= 0) {
			value = this.initial_value;
		}
		this.val(value);
		
		this.last_value = "";
		this.last_state = "";

		this.jq.addClass(`status-poll-listener-${this.status_level || 1}`);
		this.jq.on("duet_poll_response", (event, status) => {
			var val = DueUI.evalStatus(status, this.value, this);
			this.val(val);
		});		
		this.obsubmit = (event) => {
			console.log(event);
		};
		this.setupEvents("slidestop", false);

	}
}
DueuiElement.addElementType('slider', DueuiSliderWidget);

class DueuiProgressWidget extends DueuiWidget {
	constructor(config, parent) {
		super("div", $.extend(true, {
		}, config), parent);
		
		this.jq.progressbar({
			"value": (typeof(this.value) === 'string' ? this.initial_value || 0 : this.value),
			"max": this.max || 100
		});
		
		this.value_function = (val) => {
			if (typeof(val) === 'undefined') {
				return this.jq.progressbar("value");
			} else {
				this.jq.progressbar("value", parseInt(val));
			}
		};
	}
}
DueuiElement.addElementType('progress', DueuiProgressWidget);



