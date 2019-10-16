class DueuiPanel extends DueuiElement {
	constructor(config, parent){
		super("div", $.extend(true, {
			"style": {
				"width": "auto"
			},
		}, config, {
			"classes": "bg-light "
				+ (config.classes || "")
			}), parent);

		if (!this.skip_population) {
			this.populate();
		}
	}
	populate() {
		let ix = 0;
		for (let ec of this.element_configs) {
			ec = $.extend(true, {
				"id": `${this.id}_e_${ix}`,
			}, this.element_defaults, ec);
			if (typeof(ec.enabled) === 'boolean' && !ec.enabled) {
				continue;
			}
			let e = new (DueuiElement.getElementClass(ec.type))(ec, this);
			++ix;
			if (this.max_elements && ix >= this.max_elements) {
				break;
			}
			if (e.type === "tab_panel") {
				e.makeTabbed(`#${this.parent.menubar_widget.id}`, e.menu_button);
			}
		}
	}
	makeTabbed(addTo, config) {
		let c;
		this.jq.hide();
		let menu = $(addTo).data();
		if (!config) {
			c = $.extend({
				"id": `${this.id}_menubar_button}`,
				"value": this.menubar_label,
				"icon": this.menubar_icon,
				"style": {"width": "12ch"}
			}, menu.button_defaults);
		} else {
			c = $.extend({}, config, menu.button_defaults);
		}
		if (!c.actions) {
			c.actions = [
				{"type": "ui", "action": "tab_change", "panel": this.jq}
			];
		}
		this.menubar_button_widget = new DueuiButtonWidget(c, menu.jq);
	}
}
DueuiElement.addElementType("panel", DueuiPanel);

class DueuiTabPanel extends DueuiPanel {
	constructor(config, parent) {
		super($.extend(true, {}, config, { "classes": (config.classes || "") + " dueui-panel-tab" }), parent);
	}
}
DueuiElement.addElementType("tab_panel", DueuiTabPanel);

class DueuiTabbedPanel extends DueuiPanel {
	constructor(config, parent) {
		super(config, parent);
	}
	populate() {
		if (this.header_panel) {
			this.header_panel_widget = new DueuiPanel($.extend(true, {
				"id": "dueui_header_main",
				"style": {
					"border": "1px", "border-color": "black"
				}
			}, this.header_panel, {"classes": "dueui-header " + (this.header_panel.classes || "")}), this);
		}

		this.panel_area_widget = new DueuiPanel({
			"id": "dueui_panel_area",
			"style": {
				"border": "1px", "border-color": "black", "height": "calc(100% - 6em)"
			},
			"element_configs": this.element_configs,
			"skip_population": true
		}, this);

		this.menubar_widget = new DueuiPanel($.extend(true, {
			"id": `${this.id}_menubar`,
			"style": {
				"border": "1px", "border-color": "black"
			}
		}, this.menubar || {}, {"classes": "nav "
			+ (this.menubar ? (this.menubar.classes || "") : "")}), this);

		this.panel_area_widget.populate();

		this.menubar_widget.append($(`<span class='ml-auto'></span>`));

		this.refresh_button = new DueuiButtonWidget(
		$.extend(
		{
			"id": `${this.id}_refresh_button`,
			"icon": "aspect_ratio",
			"actions": {"type": "ui", "action": "fullscreen_toggle"}
		}, this.menubar_widget.button_defaults), this.menubar_widget);

		this.fullscreen_button = new DueuiButtonWidget(
		$.extend(
		{
			"id": `${this.id}_fullscreen_button`,
			"icon": "autorenew",
			"actions": {"type": "ui", "action": "refresh"}
		}, this.menubar_widget.button_defaults), this.menubar_widget);

		this.settings_panel = new DueuiSettingsPanel(
		$.extend(
		{
			"id": "settings_panel",
			"type": "settings_panel",
			"classes": "dueui-panel-tab",
			"enabled": true
		}, this.menubar_widget.button_defaults), this.panel_area_widget);
		this.settings_panel.makeTabbed(`#${this.menubar_widget.id}`, this.settings_panel.menu_button);

		$(".dueui-panel-tab:eq(0)").show();
	}
}
DueuiElement.addElementType("tabbed_panel", DueuiTabbedPanel);

class DueuiSettingsPanel extends DueuiTabPanel {

	async getThemes(custom) {
		let t = $("#dueui_theme");
		let themes = await dueui.getThemeList(false);
		for (let theme of themes) {
			t.append(`<option value="${theme.value}">${theme.label}</option>`);
		}
		themes = await dueui.getThemeList(true);
		for (let theme of themes) {
			t.append(`<option value="${theme.value}">${theme.label}</option>`);
		}
		t.val(dueui.getSetting("theme"));
	}

	constructor(config, parent){
		super(Object.assign(config,
			{
				"id": "dueui_settings",
				"skip_population": true,
				"menu_button":  {
					"icon": "settings",
				}
			}), parent);

		this.element_configs = [
			{
				"id": "duet_url",
				"type": "input",
				"label": "Duet hostname or IP address:",
				"style": {"width": "50ch"},
				"input": {
					"id": `${this.id}_url_input`,
					"classes": "dueui-settings-field",
					"field_type": "url",
					"placeholder": "myduet",
					"style": {"height": "2.5em", "width": "100%", "text-align": "left"},
					"actions": {"type": "setting", "setting": "duet_host", "fire_on_startup": true}
				}
			},
			{
				"id": "duet_password",
				"type": "input",
				"label": "Duet password:",
				"style": {"width": "50ch"},
				"position": {"my": "left top", "at": "left bottom+5", "of": "#duet_url"},
				"input": {
					"id": `${this.id}_password_input`,
					"classes": "dueui-settings-field",
					"field_type": "text",
					"placeholder": "reprap",
					"style": {"height": "2.5em", "width": "100%", "text-align": "left"},
					"actions": {"type": "setting", "setting": "duet_password", "fire_on_startup": true}
				}
			},
			{
				"id": "dueui_config_url",
				"type": "input",
				"label": "DueUI config file URL:",
				"style": {"width": "50ch"},
				"position": {"my": "left top", "at": "left bottom+5", "of": "#duet_password"},
				"input": {
					"id": `${this.id}_config_url_input`,
					"classes": "dueui-settings-field",
					"field_type": "url",
					"style": {"height": "2.5em", "width": "100%", "text-align": "left"},
					"actions": {"type": "setting", "setting": "dueui_config_url", "fire_on_startup": true}
				}
			},
			{
				"id": "dueui_settings_poll_intervals",
				"type": "label",
				"position": {"my": "left top", "at": "left+150 bottom+5", "of": "#dueui_config_url"},
				"value": "Status poll intervals (ms): (NON-DSF only)"
			},
			{
				"id": "dueui_poll_interval_1",
				"type": "input",
				"label": "Level 1:",
				"style": {"width": "10ch"},
				"position": {"my": "left top", "at": "left bottom+5", "of": "#dueui_settings_poll_intervals"},
				"input": {
					"id": `${this.id}_poll_interval_1`,
					"classes": "dueui-settings-field",
					"field_type": "number",
					"placeholder": "1000",
					"style": {"height": "2.5em", "width": "100%", "text-align": "left"},
					"actions": {"type": "setting", "setting": "duet_poll_interval_1", "fire_on_startup": true}
				}
			},
			{
				"id": "dueui_poll_interval_2",
				"type": "input",
				"label": "Level 2:",
				"style": {"width": "10ch"},
				"position": {"my": "left top", "at": "right+10 top", "of": "#dueui_poll_interval_1"},
				"input": {
					"id": `${this.id}_poll_interval_2`,
					"classes": "dueui-settings-field",
					"field_type": "number",
					"placeholder": "1000",
					"style": {"height": "2.5em", "width": "100%", "text-align": "left"},
					"actions": {"type": "setting", "setting": "duet_poll_interval_2", "fire_on_startup": true}
				}
			},
			{
				"id": "dueui_poll_interval_3",
				"type": "input",
				"label": "Level 3:",
				"style": {"width": "10ch"},
				"position": {"my": "left top", "at": "right+10 top", "of": "#dueui_poll_interval_2"},
				"input": {
					"id": `${this.id}_poll_interval_3`,
					"classes": "dueui-settings-field",
					"field_type": "number",
					"placeholder": "1000",
					"style": {"height": "2.5em", "width": "100%", "text-align": "left"},
					"actions": {"type": "setting", "setting": "duet_poll_interval_3", "fire_on_startup": true}
				}
			},
			{
				"id": "dueui_settings_backend_type_label",
				"type": "label",
				"position": {"my": "right top", "at": "left-150 top", "of": "#dueui_poll_interval_1"},
				"value": "Backend Type"
			},
			{
				"id": "dueui_settings_backend_type",
				"type": "select",
				"enabled": true,
				"position": {"my": "left top", "at": "left bottom+5", "of": "#dueui_settings_backend_type_label"},
				"style": {"width": "15ch", "height": "2.5em"},
				"options": [
					{"label": "Non DSF", "value": DUEUI_BACKEND_NONDSF},
					{"label": "DSF", "value": DUEUI_BACKEND_DSF}
				],
				"submit_on_change": true,
				"actions": {"type": "setting", "setting": "backend_type", "fire_on_startup": true},
			},

			{
				"id": "dueui_settings_submit",
				"type": "button",
				"style": {"height": "2.5em", "width": "15ch"},
				"value": "Save",
				"position": {"my": "left top", "at": "left bottom+10", "of": "#dueui_settings_backend_type"},
				"actions": {"type": "event", "event": "dueui-submit", "target": ".dueui-settings-field"}
			},

			{
				"id": "dueui_settings_refresh",
				"type": "button",
				"style": {"height": "2.5em", "width": "15ch"},
				"value": "Refresh",
				"position": {"my": "left top", "at": "right+25 top", "of": "#dueui_settings_submit"},
				"actions": {"type": "ui", "action": "refresh"}
			},
			{
				"id": "dueui_settings_warning",
				"type": "label",
				"style": {"width": "98%"},
				"position": {"my": "left top", "at": "left bottom+10", "of": "#dueui_settings_submit"},
				"value": "<b>Don't forget to click the Save and Refresh buttons to save the new values!</b>"
			},
			{
				"id": "dueui_theme_label",
				"type": "label",
				"style": {"position": "fixed"},
				"position": {
					"my": "left top",
					"at": "right+20 top",
					"of": "#duet_url"
				},
				"value": "Theme:"
			},
			{
				"id": "dueui_theme",
				"type": "select",
				"enabled": true,
				"position": {"my": "left top", "at": "left bottom+10", "of": "#dueui_theme_label"},
				"style": {"width": "25ch", "height": "2.5em"},
				"options": [],
				"submit_on_change": true,
				"actions": {"type": "setting", "setting": "theme", "fire_on_startup": true},
			},
			{
				"id": "dueui_settings_debug_polling",
				"type": "button",
				"style": {"height": "2.5em", "width": "25ch"},
				"state": {
					"states": [
						{ "state": 0, "classes": "btn-danger", "value": "Turn Debug Polling On",
							"actions": {"type": "setting", "setting": "duet_debug_polling_enabled", "value": 1, "fire_on_startup": true}
						},
						{ "state": 1, "classes": "btn-success", "value": "Turn Debug Polling Off",
							"actions": {"type": "setting", "setting": "duet_debug_polling_enabled", "value": 0}
						}
					]
				},
				"value": "Debug Polling",
				"position": {"my": "left top", "at": "left bottom+15", "of": "#dueui_theme"},
			},
			{
				"id": "dueui_settings_dont_send_gcode",
				"type": "button",
				"style": {"height": "2.5em", "width": "25ch"},
				"state": {
					"states": [
						{ "state": 0, "classes": "btn-danger", "value": "Turn Simulate GCode On",
							"actions": {"type": "setting", "setting": "dueui_settings_dont_send_gcode", "value": 1, "fire_on_startup": true}
						},
						{ "state": 1, "classes": "btn-success", "value": "Turn Simulate GCode Off",
							"actions": {"type": "setting", "setting": "dueui_settings_dont_send_gcode", "value": 0}
						}
					]
				},
				"value": "Send GCode",
				"position": {"my": "left top", "at": "left bottom+15", "of": "#dueui_settings_debug_polling"},
			},
			{
				"id": "dueui_settings_polling",
				"type": "button",
				"style": {"height": "2.5em", "width": "25ch"},
				"state": {
					"states": [
						{ "state": 0, "classes": "btn-danger", "value": "Turn Polling On",
							"actions": {"type": "setting", "setting": "duet_polling_enabled", "value": 1, "fire_on_startup": true}
						},
						{ "state": 1, "classes": "btn-success", "value": "Turn Polling Off",
							"actions": {"type": "setting", "setting": "duet_polling_enabled", "value": 0}
						}
					]
				},
				"value": "Polling",
				"position": {"my": "left top", "at": "left bottom+15", "of": "#dueui_settings_dont_send_gcode"},
			},
		];

		this.populate();
		this.getThemes();
	}
}
DueuiElement.addElementType("settings_panel", DueuiSettingsPanel);
