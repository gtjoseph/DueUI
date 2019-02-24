class DueuiPanel extends DueuiElement {
	constructor(config, parent){
		super("div", $.extend(true, {
			"style": {
				"width": "auto"
			},
		}, config, {
			"classes": "ui-widget-content dueui-panel " 
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
		let c = config;
		this.jq.hide();
		if (!c) {
			c = {
				"id": `${this.id}_menubar_button}`,
				"value": this.menubar_label,
				"icon": this.menubar_icon,
				"style": {"width": "12ch"}
			}
		}
		if (!c.actions) {
			c.actions = [
				{"type": "ui", "action": "tab_change", "panel": this.jq}
			];
		}
		let menu = $(addTo).data();
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
		super($.extend(true, {}, config, 
			{"classes": "dueui-tabbed-container ui-widget-content " + (config.classes || "")}), parent);
	}
	populate() {
		if (this.header_panel) {
			this.header_panel_widget = new DueuiPanel($.extend(true, {
				"id": "dueui_header_main",
				"style": {
					"border": "1px", "border-color": "black"
				}
			}, this.header_panel, {"classes": "dueui-header ui-widget-content " + (this.header_panel.classes || "")}), this);
		}
		
		this.panel_area_widget = new DueuiPanel({
			"id": "dueui_panel_area",
			"classes": "dueui-panel-area ui-widget-content",
			"style": {
				"border": "1px", "border-color": "black"
			},
			"element_configs": this.element_configs,
			"skip_population": true
		}, this);
			
		this.menubar_widget = new DueuiPanel($.extend(true, {
			"id": `${this.id}_menubar`,
			"style": {
				"border": "1px", "border-color": "black"
			}
		}, this.menubar || {}, {"classes": "dueui-menubar ui-widget-content "
			+ (this.menubar ? (this.menubar.classes || "") : "")}), this);

		
		this.panel_area_widget.populate();
		
		this.settings_panel = new DueuiSettingsPanel(
		{
			"id": "settings_panel",
			"type": "settings_panel",
			"classes": "dueui-panel-tab",
			"enabled": true
		}, this.panel_area_widget);
		this.settings_panel.makeTabbed(`#${this.menubar_widget.id}`, this.settings_panel.menu_button);

		$(".dueui-panel-tab:eq(0)").show();
		
		this.fullscreen_button = new DueuiButtonWidget(
		{
			"id": `${this.id}_fullscreen_button`,
			"icon": "ui-icon-arrow-4-diag",
			"icon_style": {"zoom": "150%"},
			"style": {
				"position": "relative",
				"padding": "0px",
				"width": "5ch",
				"height": "100%",
				"float": "right"
			},
			"actions": [
				{"type": "ui", "action": "fullscreen_toggle"}
			]
		}, this.menubar_widget);


	}
}
DueuiElement.addElementType("tabbed_panel", DueuiTabbedPanel);

class DueuiSettingsPanel extends DueuiTabPanel {
	constructor(config, parent){
		super(Object.assign(config,
			{
				"id": "dueui_settings",
				"skip_population": true,
				"menu_button":  {
					"icon": "ui-icon-gear",
					"icon_style": {"zoom": "150%"},
					"style": {
						"padding": "0px",
						"width": "5ch",
						"height": "100%",
						"float": "right"
					}
				}
			}), parent);
		
		this.element_configs = [
			{
				"id": "dueui_settings_warning",
				"type": "label",
				"style": {"width": "100%", "position": "fixed"},
				"position": {"my": "left top", "at": "left+10 top+10", "of": "#dueui_settings"},
				"value": `<b>Don't forget to click the Save button below to save the new values!
				You should also refresh the browser.
						</b>`
			},
			{
				"id": "duet_url",
				"type": "input",
				"label": "URL of the Duet that will be controlled:",
				"style": {"width": "50ch"},
				"position": {"my": "left top", "at": "left bottom+15", "of": "#dueui_settings_warning"},
				"input": {
					"id": `${this.id}_url_input`,
					"classes": "dueui-settings-field",
					"field_type": "url",
					"placeholder": "http://myduet",
					"style": {"height": "2.5em", "width": "100%", "text-align": "left"},
					"actions": [
						{"type": "setting", "setting": "duet_url", "fire_on_startup": true}
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
					"actions": [
						{"type": "setting", "setting": "duet_password", "fire_on_startup": true}
					]
				}
			},
			{
				"id": "dueui_config_url",
				"type": "input",
				"label": "URL of the DueUI JSON config file:",
				"style": {"width": "50ch"},
				"position": {"my": "left top", "at": "left bottom+5", "of": "#duet_password"},
				"input": {
					"id": `${this.id}_config_url_input`,
					"classes": "dueui-settings-field",
					"field_type": "url",
					"placeholder": "http://myduet/rr_download?name=/sys/dueui_config.json",
					"style": {"height": "2.5em", "width": "100%", "text-align": "left"},
					"actions": [
						{"type": "setting", "setting": "dueui_config_url", "fire_on_startup": true}
					]
				}
			},
			{
				"id": "dueui_settings_poll_intervals",
				"type": "label",
				"position": {"my": "left top", "at": "left bottom+5", "of": "#dueui_config_url"},
				"value": "Status poll intervals (ms):"
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
					"actions": [
						{"type": "setting", "setting": "duet_poll_interval_1", "fire_on_startup": true}
					]
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
					"actions": [
						{"type": "setting", "setting": "duet_poll_interval_2", "fire_on_startup": true}
					]
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
					"actions": [
						{"type": "setting", "setting": "duet_poll_interval_3", "fire_on_startup": true}
					]
				}
			},
			
			{
				"id": "dueui_settings_submit",
				"type": "button",
				"style": {"height": "2.5em", "width": "15ch"},
				"icon": "ui-icon-check",
				"icon-position": "left",
				"icon_style": {"zoom": "150%"},
				"value": "Save",
				"position": {"my": "left top", "at": "left bottom+15", "of": "#dueui_poll_interval_1"},
				"actions": [
					{"type": "event", "event": "dueui-submit", "target": ".dueui-settings-field"}
				]
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
				"options": [
					{"value": "base", "label": "Base"},
					{"value": "black-tie", "label": "Black Tie"},
					{"value": "blitzer", "label": "Blitzer"},
					{"value": "cupertino", "label": "Cupertino"},
					{"value": "dark-hive", "label": "Dark Hive"},
					{"value": "dot-luv", "label": "Dot Luv"},
					{"value": "eggplant", "label": "Eggplant"},
					{"value": "excite-bike", "label": "Excite Bike"},
					{"value": "flick", "label": "Flick"},
					{"value": "hot-sneaks", "label": "Hot Sneaks"},
					{"value": "humanity", "label": "Humanity"},
					{"value": "le-frog", "label": "Le Frog"},
					{"value": "mint-choc", "label": "Mint Chocolate"},
					{"value": "overcast", "label": "Overcast"},
					{"value": "pepper-grinder", "label": "Pepper Grinder"},
					{"value": "redmond", "label": "Redmond"},
					{"value": "smoothness", "label": "Smoothness"},
					{"value": "south-street", "label": "South Street"},
					{"value": "start", "label": "Start"},
					{"value": "sunny", "label": "Sunny"},
					{"value": "swanky-purse", "label": "Swanky Purse"},
					{"value": "trontastic", "label": "Trontastic"},
					{"value": "ui-darkness", "label": "UI Darkness"},
					{"value": "ui-lightness", "label": "UI Lightness"},
					{"value": "vader", "label": "Vader"},
				],
				"submit_on_change": true,
				"actions": [
					{"type": "setting", "setting": "theme", "fire_on_startup": true},
				]
			},
			{
				"id": "dueui_settings_debug_polling",
				"type": "checkbox",
				"style": {"height": "2.5em", "width": "20ch", "background": "red"},
				"on_style": {"background": "lightgreen"},
				"off_style": {"background": "red"},
				"value": "Debug Polling",
				"position": {"my": "left top", "at": "left bottom+15", "of": "#dueui_theme"},
				"actions": [
					{"type": "setting", "setting": "duet_debug_polling_enabled", "fire_on_startup": true}
				]
			},
			{
				"id": "dueui_settings_dont_send_gcode",
				"type": "checkbox",
				"style": {"height": "3.5em", "width": "20ch", "background": "red"},
				"on_style": {"background": "lightgreen"},
				"off_style": {"background": "red"},
				"value": "Don't Send GCode<br>Log Only",
				"position": {"my": "left top", "at": "left bottom+15", "of": "#dueui_settings_debug_polling"},
				"actions": [
					{"type": "setting", "setting": "dueui_settings_dont_send_gcode", "fire_on_startup": true}
				]
			},
			{
				"id": "dueui_settings_polling",
				"type": "checkbox",
				"style": {"height": "2.5em", "width": "20ch", "background": "red"},
				"on_style": {"background": "lightgreen"},
				"off_style": {"background": "red"},
				"value": "Polling",
				"position": {"my": "left top", "at": "left bottom+15", "of": "#dueui_settings_dont_send_gcode"},
				"actions": [
					{"type": "setting", "setting": "duet_polling_enabled", "fire_on_startup": true}
				]
			},
			{
				"id": "dueui_settings_tooltips",
				"type": "checkbox",
				"style": {"height": "2.5em", "width": "20ch"},
				"on_style": {"background": "lightgreen"},
				"off_style": {"background": "red"},
				"value": "Show Tooltips",
				"position": {"my": "left top", "at": "left bottom+15", "of": "#dueui_settings_polling"},
				"actions": [
					{"type": "setting", "setting": "show_tooltips", "fire_on_startup": true}
				]
			}
		];
		
		this.populate();
		
	}
}
DueuiElement.addElementType("settings_panel", DueuiSettingsPanel);
