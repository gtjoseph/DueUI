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
					this.runActions(cs.actions, false, event);
					this.applyState();
				}
			}
			if (this.actions) {
				this.runActions(this.actions, false, event);
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

	runActions(action, run_on_startup, event = {}) {
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
					let val = resolvedSettings[a2.setting];
					if (keyExistsOn(this, "state.states[0].actions")) {
						this.state.current = val;
					} else {
						this.val(val);
					}
					$(".dueui-setting-listener").trigger(a2.setting, val);
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
					setSetting(a2.setting, val);
					$(".dueui-setting-listener").trigger(a2.setting, val);
				}
				break;
			}
			case "theme": {
				resolvedSettings.theme_path = event.target.selectedOptions[0].value;
				resolvedSettings.theme_name = event.target.selectedOptions[0].label;
				setTheme();
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

