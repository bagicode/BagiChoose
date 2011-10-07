/*
---
description: BagiChoose.

license: MIT-style

authors:
- Bagide Code Ei

requires:
- mootools-core 1.2 +
- mootools-more 1.2 +

...
*/

var BagiChoose = new Class({
    Implements: [Options, Events],
    options: {
        classId: '.dropchoose',
        baseClass: 'bc',
        multiSelection: false,
        textPaddingLeft: -1,
        splitSelected: false
    },
    initialize: function(options) {
        this.setOptions(options);

        this.dropdown = $$(this.options.classId);
        $$(this.options.classId).each(function(el, idx) {
            this.dropdown[idx] = new DropChoose({
                elementId: el,
                baseClass: this.options.baseClass,
                multiSelection: this.options.multiSelection,
                splitSelected: this.options.splitSelected,
                textPaddingLeft: this.options.textPaddingLeft
            });
        } .bind(this));
    },
    get: function(id) {
        var ddl;
        for (var i = 0; i < this.dropdown.length; i++) {
            if (this.dropdown[i].options.elementId == id) {
                ddl = this.dropdown[i];
                break;
            }
        }
        return ddl;
    },
    register: function(el) {
        if (el.retrieve('bagichoose')) return;
        if ($(el).id == '') $(el).id = String.uniqueID();
        this.dropdown.include(
            new DropChoose({
                elementId: el,
                baseClass: this.options.baseClass,
                multiSelection: this.options.multiSelection,
                splitSelected: this.options.splitSelected
            })
        );
    }
});
BagiChoose.bind = function(ddl, url, params, onSuccess) {
    if (typeof (url) == 'string') {
        var myRequest = new Callax({
            sender: ddl,
            loaderClass: 'ImageLoader',
            url: url,
            onSuccess: function(retObj, responseText, responseXML) {
                var data = retObj.data;

                if (data) {
                    ddl.options.length = 0;
                    if (data.length > 0 && typeof (data[0]) == 'object') {
                        for (var i = 0; i < data.length; i++) {
                            var opt = document.createElement("option");
                            opt.value = data[i].val;
                            opt.text = data[i].text;
                            ddl.options.add(opt);
                        }
                    } else {
                        for (var i = 0; i < data.length; i++) {
                            var opt = document.createElement("option");
                            opt.value = data[i][0];
                            opt.text = data[i][1];
                            ddl.options.add(opt);
                        }
                    }
                    if (ddl.retrieve('bagichoose')) {
                        ddl.retrieve('bagichoose').rebuildOptions();
                    }
                }

                if (onSuccess) onSuccess();
            },
            onError: function(retObj, responseText, responseXML) {

            }
        });
        myRequest.send(params);
    }
}
var DropChoose = new Class({
    Implements: [Options, Events],
    options: {
        elementId: undefined,
        baseClass: 'mc',
        textPaddingLeft: -1, 		// display text padding
        openerWidth: 20, 		// true width is 30, but we add the extra 10 as overlap
        openerFadeOverlap: 10, 	// I like the text to fade out as it reaches the opener
        optionHeight: 20, 		// height of each option, from your stylesheet (height+padding+margin+border)
        maxShowOptions: 10, 		// how many options to show max before scroll?
        optionsZIndex: 10, 		// You can also set this on each select prior to replacing
        optionsOffsetX: 0, 		// x offset from select
        optionsOffsetY: 3, 		// y offset from select
        optionsShadow: false, 	// for newer webkit/css3 browsers
        shadowBlur: 4,
        shadowOffset: 1,
        shadowColor: '#000',
        roundedOptionsCorners: true, // for newer webkit/css3 browsers
        optionsCornerRadius: 0,
        firstOptionClass: undefined,
        customItemPosition: 'after',
        customItem: undefined,
        //
        multiSelection: false,
        splitSelected: false
    },
    initialize: function(options) {
        this.setOptions(options);
		
        this.selector = $(this.options.elementId);
        if (this.selector.retrieve('bagichoose')) return;
        var selector_coords = this.selector.measure(function() {
            return this.getCoordinates(this.getParent());
        });
        this.display = new Element('a', {
            'id': this.selector.id + '_display',
            'class': this.options.baseClass + '_display',
            'tabindex': this.selector.getProperty('tabindex'),
            'rel': 'nofollow',
            'styles': {
                'width': (selector_coords.width - this.options.openerWidth < 0 ? 0 : selector_coords.width - this.options.openerWidth),
                'margin': this.selector.getStyle('margin'),
                'margin-top': (this.selector.get('disabled') && Browser.ie7 ? '-5px' : '0px'),
                'margin-right': (parseInt(this.selector.getStyle('margin-right')) + this.options.openerWidth)
            }
        })
        .addEvents({
            click: this.showPopUp.bind(this)
        }).inject(this.selector, 'before');

        // DISPLAY TEXT
        this.text = new Element('span', {
            'class': this.options.baseClass + '_text',
            'id': this.selector.id + '_text',
            'styles': {
                'margin-left': this.options.textPaddingLeft
            }
        }).inject(this.display);

        // OPENER
        this.opener = new Element('span', {
            'class': this.options.baseClass + '_opener',
            'id': this.selector.id + '_opener',
            'text': ' ',
            'styles': {
                'margin-top': (!this.selector.get('disabled') && Browser.ie7 ? '-3px' : '0px'),
                'margin-left': selector_coords.width - this.options.openerWidth - this.options.openerFadeOverlap
            }
        })
        //        .addEvents({
        //            click: this.showPopUp.bind(this)
        //        })
        .inject(this.display, 'top');


        if ($(this.selector.id + '_val')) {
            this.valueEl = $(this.selector.id + '_val');
            this.selectedValues = $(this.selector.id + '_val').get('value').split('|');
            this.selector.xvalue = $(this.selector.id + '_val').get('value');
        } else {
            this.valueEl = $(this.selector.id);
            this.selectedValues = $(this.selector.id).get('value');
            this.selector.xvalue = $(this.selector.id).get('value');
        }

        this.selectedElements = new Array();

        this.createPopUp();
        this.selector.store('bagichoose', this);



        this.NavFunc = this.Navigate.bindWithEvent(this);
        setTimeout(this.resizeZeroPx.bind(this), 500);
    },
    resizeZeroPx: function() {
        try {
            if (this.display.getStyle('width') == '0px') {
                //        if (this.display.style.width == '0px') {
                var selector_coords = this.selector.measure(function() {
                    return this.getCoordinates();
                });
                this.display.setStyles({
                    'width': (selector_coords.width - this.options.openerWidth < 0 ? 0 : selector_coords.width - this.options.openerWidth),
                    'margin': this.selector.getStyle('margin'),
                    'margin-top': (this.selector.get('disabled') && Browser.ie7 ? '-5px' : '0px'),
                    'margin-right': (parseInt(this.selector.getStyle('margin-right')) + this.options.openerWidth)
                });
                this.opener.setStyles({
                    'margin-left': selector_coords.width - this.options.openerWidth - this.options.openerFadeOverlap
                });
            }
            //this.selector.setStyle('display', 'none');
        }
        catch (ex) {

        }
    },
    createBackground: function() {
        var coord = this.display.getCoordinates();
        this.background = new Element('div').addClass(this.options.baseClass + '_background')
            .setStyles({
                position: 'absolute',
                background: 'white',
                top: '0',
                left: '0',
                zIndex: 99990
            })
            .setOpacity(0)
            .inject(document.body);
        this.background.addEvent('mousedown', this.hidePopUp.bind(this));
    },
    createPopUp: function() {
        this.createBackground();
        //var coord = this.selector.getCoordinates();
        this.popup = new Element('div').addClass(this.options.baseClass + '_popup')
            .setStyles({
                position: 'absolute',
                display: 'none',
                //'min-width': coord.width,
                zIndex: 99999
            })
            .inject(this.selector.form);
        this.searchText = new Element('div')
            .setStyles({
                position: 'absolute',
                display: 'none',
                background: 'white',
                //'min-width': coord.width,
                zIndex: 99999,
                opacity: 0.3
            })
            .inject(this.selector.form);
        this.createHeader();
        this.createOptions();
        this.createFooter();
        this.selector.setStyle('display', 'none');

    },
    showPopUp: function() {
        this.selector.fireEvent('focus');
        if (!this.selector.get('disabled')) {
            this.popup.setStyles({
                display: ''
            });
            var pSize = this.popup.getSize();
            //if(pSize.y == 0) return;
            //pSize.y = pSize.y < this.popup.getStyle('max-height')? parseInt(this.popup.getStyle('max-height')): pSize.y;
            var coord = this.display.getCoordinates();
            var winScroll = window.getScroll();
            var winSize = window.getSize();
            var winCoord = { x: winScroll.x + winSize.x, y: winScroll.y + winSize.y };
            //alert([winCoord.y, pSize.y]);
            var top = coord.top + coord.height;


            if (winCoord.y < pSize.y) {
                top = 0;
                var height = winCoord.y - 3;
            }
            else if (winCoord.y < top + pSize.y) {
                //alert(winCoord.y);
                top = winCoord.y - pSize.y - 3;
            }
            this.popup.setStyles({
                display: '',
                top: top,
                left: coord.left,
                'height': height,
                'min-width': parseInt(coord.width) + 20
            });
            this.searchText.setStyles({
                display: '',
                top: top - 15,
                left: coord.left,
                'min-width': parseInt(coord.width) + 20
            });
            this.searchText.set('text', '');
            this.background.setStyles({
                display: '',
                width: '100%',
                height: window.getScrollSize().y
            });
            this.keyWord = '';
            this.lastScroll = 0;
            document.addEvent('keydown', this.NavFunc);
        }
    },
    hidePopUp: function() {
        this.popup.setStyles({
            display: 'none'
        });
        this.background.setStyles({
            display: 'none'
        });
        this.searchText.setStyle('display', 'none');
        document.removeEvent('keydown', this.NavFunc);
        try {
            this.valueEl.fireEvent('blur');
        } catch (x) { }
    },
    Navigate: function(e) {
        var evt = new Event(e);

        if (e.key.length == 1) {
            this.keyWord = this.keyWord + e.key;
        } else if (e.key == 'backspace') {
            evt.stop();
            this.keyWord = this.keyWord.substr(0, this.keyWord.length - 1);
        } else if (e.key == 'space') {
            this.keyWord = this.keyWord + ' ';
            evt.stop();
        } else if (e.key == 'enter') {
            evt.stop();
        }

        //this.popup.scrollTo(0, 0);
        if (this.opts.getElement('.active')) { this.opts.getElement('.active').removeClass('active') };
        this.searchText.set('text', this.keyWord);
        for (var i = 0; i < this.optsEl.length; i++) {
            if (this.optsEl[i].getStyle('display') != 'none' && this.optsEl[i].get('text').trim().toLowerCase().startsWith(this.keyWord)) {
                var coord = this.optsEl[i].getPosition(this.optsBig);
                this.optsEl[i].addClass('active');
                //this.optsBig.scrollTo(0, coord.y);
                //this.opts.scrollTo(0, coord.y);
                //alert(coord.y);
                this.popup.scrollTo(0, coord.y);
                //this.lastScroll = this.popup.getScroll().y;
                break;
            }
        }
    },
    getRootWindow: function(win) {
        if (win.location == window.location) {
            return window;
        } else {
            return this.getRootWindow(win.parent);
        }
    },
    createHeader: function() {
        if (this.selector.get('headDiv') && $(this.selector.get('headDiv'))) {
            //$(this.selector.get('headDiv')).clone().cloneEvents($(this.selector.get('headDiv'))).setStyle('display', '').inject(this.popup);
            $(this.selector.get('headDiv')).setStyle('display', '').inject(this.popup);
        }
    },
    createOptions: function() {
        this.optsBig = new Element('div')
                .addClass(this.options.baseClass + '_options')
                .inject(this.popup);
        this.opts = new Element('div')
        //.addClass(this.options.baseClass + '_options')
                .inject(this.optsBig);

        this.buildOptions();
    },
    buildOptions: function(withoutTimeout) {
        this.opts.innerHTML = '';
        this.optsEl = new Array();
        
        if (this.selector.get('optDiv') && $(this.selector.get('optDiv'))) {
            var opts = $(this.selector.get('optDiv')).clone().setStyles({ 'display': '', 'width': '100%' });
            opts.inject(this.opts);
            this.optsEl = this.opts.getElements(".option");
        } else {
            var timeout = 0;
            if(this.selector.options.length>100) timeout = 500;
            if(withoutTimeout){
                var tbl = new Element('table', {style: 'width:100%', bagichoose:this.selector.id});
                for (var i = 0; i < this.selector.options.length; i++) {
                    var tr = new Element('tr', {'class': 'option', 'onclick':"$($(this).getParent('TABLE').bagichoose).retrieve('bagichoose').onOptionClick(event,$(this),"+i+");"});
                    tr.innerHTML = "<td><span class='text'>" + this.selector.options[i].text + "</span><span class='value' oriVal='" + this.selector.options[i].value + "' value='" + this.selector.options[i].value + "'></span></td>";
                    tr.inject(tbl);
                    this.optsEl.push(tr);
                    var val = this.selector.options[i].value;
                    if ((typeof (this.selectedValues) == 'string' && this.selectedValues == val) ||
                        (typeof (this.selectedValues) != 'string' && this.selectedValues.contains(val))) {
                        this.onOptionClick(null, tr, i);
                    }
                }
                tbl.inject(this.opts);
            }else{
                setTimeout(function(){
                    var tbl = new Element('table', {style: 'width:100%', bagichoose:this.selector.id});
                    for (var i = 0; i < this.selector.options.length; i++) {
                        var tr = new Element('tr', {'class': 'option', 'onclick':"$($(this).getParent('TABLE').get('bagichoose')).retrieve('bagichoose').onOptionClick(event,$(this),"+i+");"});
                        tr.innerHTML = "<td><span class='text'>" + this.selector.options[i].text + "</span><span class='value' oriVal='" + this.selector.options[i].value + "' value='" + this.selector.options[i].value + "'></span></td>";
                        tr.inject(tbl);
                        this.optsEl.push(tr);
                        var val = this.selector.options[i].value;
                        if ((typeof (this.selectedValues) == 'string' && this.selectedValues == val) ||
                            (typeof (this.selectedValues) != 'string' && this.selectedValues.contains(val))) {
                            this.onOptionClick(null, tr, i);
                        }
                    }
                    tbl.inject(this.opts);
                }.bind(this), timeout);
            }
        }


        this.textToDisplay = (this.optsEl.length > 0 && this.optsEl[0].getElement('.disp') ? '.disp' : '.text');

        if (this.options.splitSelected) {
            this.selecteds = opts.clone()
            //.addClass(this.options.baseClass + '_options')
                .setStyles({
                    'display': 'none',
                    'width': '100%'
                });
            this.selectedsEl = this.selecteds.getElements(".option");
            this.selectedsEl.each(function(el, idx) {
                el.setStyle('display', 'none');
                el.addEvents({
                    click: this.onSelectedClick.bindWithEvent(this, [el, idx])
                });
            } .bind(this));

            //            this.separator = new Element('div').setStyles({
            //                'border-top': 'solid 1px gray'
            //            });

            if (this.options.splitSelected == 'top') {
                this.selecteds.inject(this.opts, 'before');
            } else if (this.options.splitSelected == 'right') {

            }
            this.options.multiSelection = true;
        } else {
        
        }
        if (this.selector.get('optDiv') && $(this.selector.get('optDiv'))){
            this.optsEl.each(function(el, idx) {
                var item = el.getElement('.value');
                var val = (item.get('oriVal') ? item.get('oriVal') : item.get('value'));
                if ((typeof (this.selectedValues) == 'string' && this.selectedValues == val) ||
                    (typeof (this.selectedValues) != 'string' && this.selectedValues.contains(val))) {
                    this.onOptionClick(null, el, idx);
                }
                el.addEvents({
                    click: this.onOptionClick.bindWithEvent(this, [el, idx])
                });
            } .bind(this));
        }
    },
    rebuildOptions: function() {
        this.selectedElements = new Array();
        if ($(this.selector.id + '_val')) {
            this.valueEl = $(this.selector.id + '_val');
            this.selectedValues = $(this.selector.id + '_val').get('value').split('|');
        } else {
            this.valueEl = $(this.selector.id);
            this.selectedValues = $(this.selector.id).get('value');
        }
        this.buildOptions(true);
        this.storeTextValue();
    },
    createFooter: function() {
        if (this.selector.get('footDiv') && $(this.selector.get('footDiv'))) {
            //$(this.selector.get('footDiv')).clone().cloneEvents($(this.selector.get('footDiv'))).setStyle('display', '').inject(this.popup);
            $(this.selector.get('footDiv')).setStyle('display', '').inject(this.popup);
        }
    },
    SelectAll: function(ev, sender){
        if(this.options.multiSelection){
            for(var i=0;i<this.optsEl.length;i++){
                this.onOptionClick(ev, this.optsEl[i], i);
            }
        }
    },
    DeselectAll: function(ev, sender){
        if(this.options.splitSelected){
            for(var i=0;i<this.selectedsEl.length;i++){
                this.onSelectedClick(ev, this.selectedsEl[i], i);
            }
        }else if(this.options.multiSelection){
            for(var i=0;i<this.optsEl.length;i++){
                this.onOptionClick(ev, this.optsEl[i], i);
            }
        }
    },
    onSelectedClick: function(ev, sender, idx) {
        ev = new Event(ev);

        if (sender.hasClass('value')) {
            alert('Not Implemented:' + sender.get('value'));
        } else {
            var val = this.getValue(sender);
            if (val.selected) return;

            if (this.options.splitSelected) {
                this.setValue(this.optsEl[idx], val);
                this.setValue(this.selectedsEl[idx], val);
                sender.setStyle('display', 'none');
                this.optsEl[idx].setStyle('display', '');
                if (this.selectedElements.length == 0) this.selecteds.setStyle('display', 'none');
            } else {
                this.setValue(this.optsEl[idx], val);
            }
        }
        this.storeTextValue();
        this.selector.clickedItem = sender;
        if (ev) this.fireEvent('itemclick', [sender, idx, val]);
        if (ev && this.selector.onchange && this.changed) this.selector.onchange();
    },
    onOptionClick: function(ev, sender, idx) {
        //ev = new Event(ev);

        if (sender.hasClass('value')) {
            alert('Not Implemented:' + sender.get('value'));
        } else {
            var val = this.getValue(sender);

            if (this.options.splitSelected) {
                if (ev == null) val.selected = true;
                if (!val.selected) return;
                
                sender.setStyle('display', 'none');
                this.selecteds.setStyle('display', '');
                this.selectedsEl[idx].setStyle('display', '');
                this.setValue(this.selectedsEl[idx], val);
            } else if(this.options.multiSelection){
                if (ev == null) val.selected = (!val.selected);                
                this.setValue(this.optsEl[idx], val);
            } else {
                if (ev == null) val.selected = true;
                if (!val.selected) return;
                
                this.setValue(this.optsEl[idx], val);
            }
        }
        this.storeTextValue();
        this.selector.clickedItem = sender;
        this.fireEvent('itemclick', [sender, idx, val]);
        if (ev) if (!this.options.multiSelection) this.hidePopUp();
        if (ev && this.selector.onchange && this.changed) this.selector.onchange();
    },
    getValue: function(sender) {
        sender = sender.getElement('.value');
        var retval = { value: sender.get('value'), selected: true };
        if (sender.type == 'checkbox') {
            retval.selected = sender.checked;
        }
        return retval;
    },
    setValue: function(sender, val) {
        if (!this.options.multiSelection) this.selectedElements.empty();
        if (val.selected) {
            this.selectedElements.include(sender);
        } else {
            this.selectedElements.erase(sender);
        }

        sender = sender.getElement('.value');
        if (sender.type == 'checkbox') {
            sender.checked = val.selected;
        }
    },
    storeTextValue: function() {
        var str = "";
        var val = "";
        if (this.selectedElements.length > 0) {
            this.selectedElements.each(function(el) {
                str += $(el).getElement(this.textToDisplay).get('text') + ", ";
                val += $(el).getElement('.value').get('value') + "|";
            } .bind(this));
            str = str.substring(0, str.length - 2);
            val = val.substring(0, val.length - 1);
        }
        $(this.text).set('text', str);
        if (this.valueEl.options && this.valueEl.options.length == 0)
            this.valueEl.options[0] = new Option(str, val);
        $(this.valueEl).set('value', val);

        this.changed = false;
        if (this.selector.get('xvalue') != val) {
            this.selector.set('xvalue', val);
            this.selector.xvalue = val;
            this.changed = true;
            this.selector.fireEvent('change');
        }

    },
    refresh: function() {
        var str = "";
        var val = "";
        if (this.selectedElements.length > 0) {
            this.selectedElements.each(function(el) {
                str += $(el).getElement(this.textToDisplay).get('text') + ", ";
                val += $(el).getElement('.value').get('value') + "|";
            } .bind(this));
            str = str.substring(0, str.length - 2);
            val = val.substring(0, val.length - 1);
        }
        $(this.text).set('text', str);
        if (this.valueEl.options && this.valueEl.options.length == 0)
            this.valueEl.options[0] = new Option(str, val);
        $(this.valueEl).set('value', val);
    },
    hide: function() {
        this.display.setStyle('display', 'none');
        this.text.setStyle('display', 'none');
        this.opener.setStyle('display', 'none');
    },
    show: function() {
        this.display.setStyle('display', '');
        this.text.setStyle('display', '');
        this.opener.setStyle('display', '');
    },
    //Keydown
    onKeyDown: function() {

    }
});

window.addEvent('domready', function() {
    window._bagichoose = new BagiChoose({ classId: '.bagichoose' });
    window._bagichooses = new BagiChoose({ classId: '.bagichoosemulti', baseClass: 'ms', splitSelected: false, multiSelection: true });
});