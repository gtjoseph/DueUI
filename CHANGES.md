# Change Log

## 1.0.0-beta2

### [Bootstrap](https://getbootstrap.com/) is now used as the styling backend instead of jQuery-UI

This changes the classes you can use to style elements to the Bootstrap standard
ones.  The advantages over jQuery-UI include the availability of more themes and
easier ways for you to customize elements in your dueui_config.json file.
For eample, instead of specitying `{"background": "red", "color": "black:}`
for the button that does a "Stop" or "Reset", you can specify classes of
`"btn btn-danger"` which will automatically apply the "danger" button colors
appropriate for the current theme.  

The standard themes included in DueUI are all from [Thomas Park](http://thomaspark.co/)'s
[Bootswatch](https://bootswatch.com/) site.  The default theme is [Cerulean](https://bootswatch.com/cerulean/).
When you hover over any element example on the individual
[Bootswatch](https://bootswatch.com/) theme pages, you'll see a `<>` button appear
to the right which, when clicked, will show you the classes used to achieve
the effect.

**You may have to adjust the positioning of some elements due to the switch**

### Icons

Since jQuery-UI is no longer included, the source for icons had to change.
One of the best selections out there is [Google's Material Icons](https://material.io/tools/icons/?style=baseline)
 set.  The selection is much larger than jQuery's and the icons scale much
better.  This change will require you to change the icon names in your
dueui_config.json file to those found in the [Material Icon](https://material.io/tools/icons/?style=baseline) set. 
Click the link to see the icons you can now use.

### Changes related to state styles.

In prior releases, the `state_style` parameter was used to apply styles to 
elements based on their state.  With the change to Bootstrap, a way was needed
to also apply CSS classes based on state.  Rather than create a new `state_classes`
parameter, it seemed better to consolidate the state related parameters into a
new `state` parameter.  Here's an example of the new parameter:

Old:
```
"state_field": "${status.params.atxPower}",
"state_styles": [
	{"background": "red", "content": "ATX Off"},
	{"background": "lightgreen", "content": "ATX On"}
]
```
New:
```
"state": {
	"field": "${status.params.atxPower}",
	"classes": [
		"btn btn-danger",
		"btn btn-success"
	],
	"contents": [
		"ATX Off",
		"ATX On"
	]
}
```
You _can_ continue to use styles instead of classes if you want:
```
"state": {
	"field": "${status.params.atxPower}",
	"styles": [
		{"background": "red"},
		{"background": "lightgreen"}
	],
	"contents": [
		"ATX Off",
		"ATX On"
	]
}
```

### Changes related to tolerances.

You can now specify `classes` when defining tolerances:

Old:
```
"tolerances": [
	{"limit": 2, "style": {"background": "lightgreen"}},
	{"limit": 5, "style": {"background": "yellow"}},
	{"limit": 999, "style": {"background": "red"}}
]
```
New:
```
"tolerances": [
	{"limit": 2, "classes": "btn btn-success"},
	{"limit": 5, "classes": "btn btn-warning"},
	{"limit": 999, "classes": "btn btn-danger"}
]
```

 




 
    

