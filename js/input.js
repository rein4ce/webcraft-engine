/*
 * Copyright (c) 2012 Michael Domanski
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

var Input =
{
	bindings:    {},
	actions:     {},
	presses:     {},
	locks:       {},
	delayedKeyup:[],

	mouse:               {x:0, y:0},

	initMouse:function ()
	{
		var mouseWheelBound = this.mousewheel.bind(this);
		var el =  $("#content")[0];
		el.addEventListener('mousewheel', mouseWheelBound, false);
		el.addEventListener('DOMMouseScroll', mouseWheelBound, false);
		el.addEventListener('contextmenu', this.contextmenu.bind(this), false);
		el.addEventListener('mousedown', this.keydown.bind(this), false);
		el.addEventListener('mouseup', this.keyup.bind(this), false);
		el.addEventListener('mousemove', this.mousemove.bind(this), false);
	},


	initKeyboard:function ()
	{
		window.addEventListener('keydown', this.keydown.bind(this), false);
		window.addEventListener('keyup', this.keyup.bind(this), false);
	},

	mousewheel:function (event)
	{
		var delta = event.wheelDelta ? event.wheelDelta : (event.detail * -1);
		var code = delta > 0 ? Keys.MWHEEL_UP : Keys.MWHEEL_DOWN;
		var action = this.bindings[code];
		if (action)
		{
			this.actions[action] = true;
			this.presses[action] = true;
			this.delayedKeyup[action] = true;
			event.stopPropagation();
			event.preventDefault();
		}
	},


	mousemove:function (event)
	{
		var el = $("#content")[0];
		var pos = {left:0, top:0};
		while (el != null)
		{
			pos.left += el.offsetLeft;
			pos.top += el.offsetTop;
			el = el.offsetParent;
		}
		var tx = event.pageX;
		var ty = event.pageY;

		this.mouse.x = (tx - pos.left);
		this.mouse.y = (ty - pos.top);
	},


	contextmenu:function (event)
	{
		if (this.bindings[Keys.MOUSE2])
		{
			event.stopPropagation();
			event.preventDefault();
		}
	},


	keydown:function (event)
	{
		if (event.target.type == 'text')
		{
			return;
		}

		var code = event.type == 'keydown'
			? event.keyCode
			: (event.button == 2 ? Keys.MOUSE2 : Keys.MOUSE1);

		if (event.type == 'touchstart' || event.type == 'mousedown')
		{
			this.mousemove(event);
		}

		var action = this.bindings[code];
		if (action)
		{
			this.actions[action] = true;
			if (!this.locks[action])
			{
				this.presses[action] = true;
				this.locks[action] = true;
			}
			event.stopPropagation();
			event.preventDefault();
		}
	},


	keyup:function (event)
	{
		if (event.target.type == 'text')
		{
			return;
		}

		var code = event.type == 'keyup'
			? event.keyCode
			: (event.button == 2 ? Keys.MOUSE2 : Keys.MOUSE1);

		var action = this.bindings[code];
		if (action)
		{
			this.delayedKeyup.push(action);
			event.stopPropagation();
			event.preventDefault();
		}
	},

	bind:function (key, action)
	{
		if (key < 0)
		{
			this.initMouse();
		}
		else if (key > 0)
		{
			this.initKeyboard();
		}
		this.bindings[key] = action;
	},

	unbind:function (key)
	{
		this.bindings[key] = null;
	},


	unbindAll:function ()
	{
		this.bindings = [];
	},


	state:function (action)
	{
		return this.actions[action];
	},


	pressed:function (action)
	{
		return this.presses[action];
	},


	clearPressed:function ()
	{
		for (var i = 0; i < this.delayedKeyup.length; i++)
		{
			var action = this.delayedKeyup[i];
			this.actions[action] = false;
			this.locks[action] = false;
		}
		this.delayedKeyup = [];
		this.presses = {};
	}
};

var Keys =
{
	'MOUSE1':     -1,
	'MOUSE2':     -3,
	'MWHEEL_UP':  -4,
	'MWHEEL_DOWN':-5,

	'BACKSPACE':  8,
	'TAB':        9,
	'ENTER':      13,
	'PAUSE':      19,
	'CAPS':       20,
	'ESC':        27,
	'SPACE':      32,
	'PAGE_UP':    33,
	'PAGE_DOWN':  34,
	'END':        35,
	'HOME':       36,
	'LEFT_ARROW': 37,
	'UP_ARROW':   38,
	'RIGHT_ARROW':39,
	'DOWN_ARROW': 40,
	'INSERT':     45,
	'DELETE':     46,
	'_0':         48,
	'_1':         49,
	'_2':         50,
	'_3':         51,
	'_4':         52,
	'_5':         53,
	'_6':         54,
	'_7':         55,
	'_8':         56,
	'_9':         57,
	'A':          65,
	'B':          66,
	'C':          67,
	'D':          68,
	'E':          69,
	'F':          70,
	'G':          71,
	'H':          72,
	'I':          73,
	'J':          74,
	'K':          75,
	'L':          76,
	'M':          77,
	'N':          78,
	'O':          79,
	'P':          80,
	'Q':          81,
	'R':          82,
	'S':          83,
	'T':          84,
	'U':          85,
	'V':          86,
	'W':          87,
	'X':          88,
	'Y':          89,
	'Z':          90,
	'NUMPAD_0':   96,
	'NUMPAD_1':   97,
	'NUMPAD_2':   98,
	'NUMPAD_3':   99,
	'NUMPAD_4':   100,
	'NUMPAD_5':   101,
	'NUMPAD_6':   102,
	'NUMPAD_7':   103,
	'NUMPAD_8':   104,
	'NUMPAD_9':   105,
	'MULTIPLY':   106,
	'ADD':        107,
	'SUBSTRACT':  109,
	'DECIMAL':    110,
	'DIVIDE':     111,
	'F1':         112,
	'F2':         113,
	'F3':         114,
	'F4':         115,
	'F5':         116,
	'F6':         117,
	'F7':         118,
	'F8':         119,
	'F9':         120,
	'F10':        121,
	'F11':        122,
	'F12':        123,
	'SHIFT':      16,
	'CTRL':       17,
	'ALT':        18,
	'PLUS':       187,
	'COMMA':      188,
	'MINUS':      189,
	'PERIOD':     190
};