BagiChoose
===========

BagiChoose is a plugin for mootools. 
This plugin is simply customize basic HTML Dropdown or Select to have a skin, or even a multi select

![Screenshot](http://code.bagide.com/BagiChoose/sshoot1.jpg)

How to use
----------

To use BagiChoose is simple, just add mootools-core and bagichoose.js
and add bagichoose or bagichoosemulti at the control you want to mask.

	<select class="bagichoose" id="ddlSingleSelect">
		<option>Please Select</option>
		<option>Option One</option>
		<option>Option Two</option>
	</select>

or you may add create new instance by:
	window._bagichooses = new BagiChoose({ 
		classId: '.bagichoosemulti', 
		baseClass: 'ms', 
		splitSelected: false, 
		multiSelection: true 
	});
Screenshots
-----------


Arbitrary section
-----------------

if you have a question, 
please contact us code@bagide.com