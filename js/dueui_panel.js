
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

		if (!resolvedSettings.hide_settings) {
			this.settings_panel = new DueuiSettingsPanel(
				$.extend(
					{
						"id": "settings_panel",
						"type": "settings_panel",
						"classes": "dueui-panel-tab",
						"enabled": true
					}, this.menubar_widget.button_defaults), this.panel_area_widget);
			this.settings_panel.makeTabbed(`#${this.menubar_widget.id}`, this.settings_panel.menu_button);
		}
		
		this.save_settings_button = new DueuiButtonWidget(
		$.extend(
		{
			"id": "save_settings_button",
			"icon": "save",
			"classes": "btn-secondary save_settings_button",
			"onsubmit": () => {
				saveLocalSettings(resolvedSettings);
			}
		}, this.menubar_widget.button_defaults), this.menubar_widget);
		
		$(".state-poll-listener").trigger("duet_poll_response", dueui.model);

		$(".dueui-panel-tab:eq(0)").show();
	}
}
DueuiElement.addElementType("tabbed_panel", DueuiTabbedPanel);

class DueuiSettingsPanel extends DueuiTabPanel {

	async getThemes() {
		let t = $("#dueui_theme");
		let themes = themeList;
		for (let theme of themes) {
			t.append(`<option value="${theme.value}">${theme.label}</option>`);
		}
		t.val(resolvedSettings.theme_path);
	}

	constructor(config, parent){
		super(Object.assign(config,
			{
				"id": "dueui_settings",
				"classes": "dueui-setting-listener",
				"skip_population": true,
				"menu_button":  {
					"id": "dueui_settings_icon",
					"icon": "settings",
				}
			}), parent);

		this.localSettings = {};
		this.jq.on("dueui-setting-change", (event, setting) => {
				this.localSettings[setting.name] = setting.value;
				if (setting.name === 'theme_path') {
					let theme_name = "";
					let theme = themeList.find(t => t.value === setting.value);
					if (theme) {
						this.localSettings["theme_name"] = theme.label;
						theme_name = theme.label;
					}
					setTheme(theme_name, setting.value); 
				}
				console.log(event, setting);
			});
			
		this.element_configs = [
			{
				"id": "duet_url",
				"type": "input",
				"label": "Duet or DSF hostname or IP address:",
				"style": {"width": "50ch"},
				"position": {"my": "left top", "at": "left+5 top+5", "of": "#dueui_settings"},
				"input": {
					"id": `${this.id}_url_input`,
					"classes": "dueui-settings-field",
					"field_type": "url",
					"placeholder": "myduet",
					"style": {"height": "2.5em", "width": "100%", "text-align": "left"},
					"submit_on_event": "change",
					"value": resolvedSettings.duet_host,
					"actions": [
						{"type": "setting", "setting": "duet_host"}
					]
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
					"submit_on_event": "change",
					"actions": [
						{"type": "setting", "setting": "duet_password", "fire_on_startup": true},
						{"type": "setting", "setting": "duet_password"}
					]
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
					"placeholder": defaultSettings.dueui_config_url,
					"style": {"height": "2.5em", "width": "100%", "text-align": "left"},
					"submit_on_event": "change",
					"actions": [
						{"type": "setting", "setting": "dueui_config_url", "fire_on_startup": true},
						{"type": "setting", "setting": "dueui_config_url"}
					]
				}
			},
			{
				"id": "dueui_poll_interval_1",
				"type": "input",
				"label": "Status poll interval (ms): (Standalone Duets only)",
				"style": { "width": "50ch" },
				"position": { "my": "left top", "at": "left bottom+5", "of": "#dueui_config_url" },
				"input": {
					"id": `${this.id}_poll_interval_1`,
					"classes": "dueui-settings-field",
					"field_type": "number",
					"placeholder": defaultSettings.duet_poll_interval_1,
					"style": { "height": "2.5em", "width": "10ch", "text-align": "left" },
					"submit_on_event": "change",
					"value": resolvedSettings.duet_poll_interval_1,
					"actions": [
						{ "type": "setting", "setting": "duet_poll_interval_1" }
					]
				}
			},
			{
				"id": "dueui_theme_label",
				"type": "label",
				"style": {"position": "fixed"},
				"position": {
					"my": "left top",
					"at": "right+40 top",
					"of": "#duet_url"
				},
				"value": "Theme:"
			},
			{
				"id": "dueui_theme",
				"type": "select",
				"enabled": true,
				"position": {"my": "left top", "at": "left bottom+5", "of": "#dueui_theme_label"},
				"style": {"width": "25ch", "height": "2.5em"},
				"options": [],
				"classes": "dueui-settings-field",
					"actions": [
						{ "type": "setting", "setting": "theme_path" }
					]
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
				"classes": "dueui-settings-field",
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
				"classes": "dueui-settings-field",
				"position": {"my": "left top", "at": "left bottom+15", "of": "#dueui_settings_debug_polling"},
			},
			{
				"id": "dueui_settings_test_mode",
				"type": "button",
				"style": {"height": "2.5em", "width": "25ch"},
				"state": {
					"states": [
						{ "state": 0, "classes": "btn-danger", "value": "Turn Test Mode On",
							"actions": {"type": "setting", "setting": "dueui_test_mode", "value": 1, "fire_on_startup": true}
						},
						{ "state": 1, "classes": "btn-success", "value": "Turn Test Mode Off",
							"actions": {"type": "setting", "setting": "dueui_test_mode", "value": 0}
						}
					]
				},
				"value": "Test Mode",
				"classes": "dueui-settings-field",
				"position": {"my": "left top", "at": "left bottom+15", "of": "#dueui_settings_dont_send_gcode"},
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
				"classes": "dueui-settings-field",
				"position": {"my": "left top", "at": "left bottom+15", "of": "#dueui_settings_test_mode"},
			},
			{
				"id": "dueui_settings_warning",
				"type": "label",
				"style": {"width": "50ch", "height": "7em"},
				"position": {"my": "left top", "at": "left bottom+5", "of": "#dueui_poll_interval_1"},
				"value": "<b>All settings are automatically saved across tab refreshes (sessionStorage) but" 
				+ " if you want to save them permanently to browser storage (localStorage), be sure to click"
				+ " the Save button.  You can clear the saved settings at any time by clearing the 'cookies'"
				+ " for the site</b>"
			},
			{
				"id": "dueui_settings_submit",
				"type": "button",
				"style": {"text-align": "middle", "height": "4.0em", "width": "12ch"},
				"classes": "btn-secondary save_settings_button",
				"value": "Save",
				"icon": "save",
				"position": {"my": "left center", "at": "right+40 center", "of": "#dueui_settings_warning"},
				"onsubmit": () => {
					Object.assign(resolvedSettings, this.localSettings);
					saveLocalSettings(resolvedSettings);
				}
			},
			{
				"id": "dueui_settings_refresh",
				"type": "button",
				"style": {"height": "4.0em", "width": "12ch"},
				"value": "Refresh Tab",
				"position": {"my": "left top", "at": "right+10 top", "of": "#dueui_settings_submit"},
				"actions": {"type": "ui", "action": "refresh"}
			},
		];

		this.populate();
		this.getThemes();
	}
}
DueuiElement.addElementType("settings_panel", DueuiSettingsPanel);
