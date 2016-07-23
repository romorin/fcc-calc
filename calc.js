var CALC_RATIO = 0.898;
var CALC_BORDER_SIZE = 0;

var _operatorsList = {
	'*' : {'priority': 10, 'run':function (lhs, rhs) {return lhs*rhs;}},
	'/' : {'priority': 10, 'run':function (lhs, rhs) {return lhs/rhs;}},
	'+' : {'priority': 20, 'run':function (lhs, rhs) {return lhs+rhs;}},
	'-' : {'priority': 20, 'run':function (lhs, rhs) {return lhs-rhs;}}
};

function LList (node) {
	this._first = node;
	this._last = node;

	// a node cannot be in two lists at the same time
	if (node !== null) {
		if (node._prev !== null || node._next !== null) {
			node.remove();
		}
	}
}
LList.prototype = {
	first : function () {
		return this._first;
	},
	last : function () {
		return this._last;
	},

	forEach : function (callback) {
		var current = this._first;
		while (current !== this._last) {
			var next = current._next;
			callback(current);
			current = next;
		}
		callback(this._last);
	},
};

function Node (data) {
	this._data = data;
	this._prev = null;
	this._next = null;
	this._bounds = new LList(this);
}
Node.prototype = {
	insertAfter : function (data) {
		var newNode = new Node(data);

		newNode._bounds = this._bounds;
		newNode._next = this._next;
		newNode._prev = this;
		this._next = newNode;

		if (newNode._next !== null) {
			newNode._next._prev = newNode;
		} else {
			this._bounds._last = newNode;
		}

		return newNode;
	},

	insertBefore : function (data) {
		var newNode = new Node(data);

		newNode._bounds = this._bounds;
		newNode._prev = this._prev;
		newNode._next = this;
		this._prev = newNode;

		if (newNode._prev !== null) {
			newNode._prev._next = newNode;
		} else {
			this._bounds._first = newNode;
		}

		return newNode;
	},

	remove : function () {
		var prev = this._prev;
		var next = this._next;

		if (next !== null && prev !== null) {
			next._prev = prev;
			prev._next = next;
		}else {
			if (prev !== null) {
				prev._next = null;
				this._bounds._last = prev;
			}
			if (next !== null) {
				next._prev = null;
				this._bounds._first = next;
			}
			if (next === null && prev === null) {
				this._bounds._first = null;
				this._bounds._last = null;
			}
		}

		this._prev = null;
		this._next = null;
		this._data = null;
		this._bounds = null;
	},

	data : function () {
		return this._data;
	},

	prev : function () {
		return this._prev;
	},

	next : function () {
		return this._next;
	},

	getList : function () {
		return this._bounds;
	}
};

// todo validate expression
function Expression() {
	this._list = null;
	this._operators = {};
}

function reduce(op) {
	var lhs = op.prev();
	var rhs = op.next();

	var result = op.data().run(lhs.data(), rhs.data());

	lhs.insertBefore(result);
	lhs.remove();
	op.remove();
	rhs.remove();
}

function pushNode(data, list) {
	if (list) {
		return list.last().insertAfter(data).getList();
	} else {
		return new Node(data).getList();
	}
}

Expression.prototype = {
	addNumber : function (num) {
		this._list = pushNode(num , this._list);
	},

	addOperator : function (op) {
		this._list = pushNode(op , this._list);
		this._operators[op.priority] = pushNode(this._list.last(), this._operators[op.priority]);
	},

	run : function () {
		Object.keys(this._operators).forEach(function (key) {
			this._operators[key].forEach(function (opNode) {
				reduce(opNode.data());
				opNode.remove();
			});
			this._operators[key] = null;
		}, this);

		return this._list.last().data();
	}
};

function NumberHandler() {
	this._numberStr = '';
	this._isFloat = false;
	this._isPositive = true;
}

NumberHandler.prototype = {
	insertDigitDot : function () {
		if (!this._isFloat) {
			this._numberStr += ',';
			this._isFloat = true;
		}
	},

	changeDigitSign: function () {
		this._isPositive = !this._isPositive;
	},

	insertDigit : function (digit) {
		this._numberStr += digit;
	},

	pop : function () {
		var num = this.toNum();

		this._numberStr = '';
		this._isFloat = false;
		this._isPositive = true;

		return num;
	},

	toString : function (signChar) {
		if (!signChar) { signChar = '-';}

		var result = this._isPositive ? '' : signChar;
		result += this._numberStr;

		return result;
	},

	toScreen : function() {
		return this.toString('¯');
	},

	toNum : function () {
		var str = this.toString();

		if (this._isFloat) {
			return parseFloat(str);
		} else {
			return parseInt(str);
		}
	},

	isEmpty : function () {
		return this._numberStr === '';
	}
};

// todo check
function CalcHandler() {
	this._lastExpression = '';
	this._expr = new Expression();
	this._numberHandler = new NumberHandler();
	this._lastAnswer = null;
	this._newAnswer = false;
}

CalcHandler.prototype = {
	onBtnClick : function (id) {
		if (id in _cButtons) {
			_cButtons[id]();
			this._updateDisplay();
		}
	},

	addToScreen : function(text) {},

	addBinaryOp : function(op) {
		var number = null;
		if (this._newAnswer) {
			number = this._lastAnswer;
		} else if (!this._numberHandler.isEmpty()) {
			number = this._numberHandler.pop();
		}
		if (number !== null && op in _operatorsList) {
			this._expr.addNumber(number);
			this._expr.addOperator(_operatorsList[op]);

			this._lastExpression += number + op;

			this._newAnswer = false;
		}
	},

	calculate : function () {
		// add the last number
		this._expr.addNumber(this._numberHandler.toNum());

		// run and save the result
		this._lastAnswer = this._expr.run();
		this._newAnswer = true;

		// flush old expression
		this._expr = new Expression();
		this._lastExpression = '';
		this._numberHandler.pop();
	},

	insertDigitDot : function () {
		this._numberHandler.insertDigitDot();
		this._newAnswer = false;
	},

	changeDigitSign: function () {
		this._numberHandler.changeDigitSign();
		this._newAnswer = false;
	},

	insertDigit : function (digit) {
		this._numberHandler.insertDigit(digit);
		this._newAnswer = false;
	},

	_updateDisplay : function() {
		var display;
		if (this._newAnswer === true) {
			display = this._lastAnswer.toScreen();
		} else {
			display = this._lastExpression + this._numberHandler.toScreen();
		}
		jQuery('#cscreen').html(display);
	}
};

var _cButtons = {
	c0 : function() {_calcHandler.insertDigit('0');},
	c1 : function() {_calcHandler.insertDigit('1');},
	c2 : function() {_calcHandler.insertDigit('2');},
	c3 : function() {_calcHandler.insertDigit('3');},
	c4 : function() {_calcHandler.insertDigit('4');},
	c5 : function() {_calcHandler.insertDigit('5');},
	c6 : function() {_calcHandler.insertDigit('6');},
	c7 : function() {_calcHandler.insertDigit('7');},
	c8 : function() {_calcHandler.insertDigit('8');},
	c9 : function() {_calcHandler.insertDigit('9');},
	cdot : function() {_calcHandler.insertDigitDot();},
	cplus : function() {_calcHandler.addBinaryOp('+');},
	cminus : function() {_calcHandler.addBinaryOp('-');},
	cmult : function() {_calcHandler.addBinaryOp('*');},
	cdiv : function() {_calcHandler.addBinaryOp('/');},
	cequal : function() {_calcHandler.calculate();},
	cc : function() {_calcHandler.clearCurrentNumber();},
	cce : function() {_calcHandler.addToScreen('E');},
	csqrt : function() {_calcHandler.addToScreen('S');},
	cpercent : function() {_calcHandler.addToScreen('%');},
	coff : function() {_calcHandler.addToScreen('F');},
	csign : function() {_calcHandler.changeDigitSign();},
	cmc : function() {_calcHandler.addToScreen('MC');},
	cmr : function() {_calcHandler.addToScreen('MR');},
	cmminus : function() {_calcHandler.addToScreen('M-');},
	cmplus : function() {_calcHandler.addToScreen('M+');}
};

// to be done when the page is ready
jQuery(document).ready(function() {
	resizeCalc();

	// call the appropriate handler when a button is clicked
	jQuery(".cbutton").click(function (event) {
		_calcHandler.onBtnClick(jQuery(event.currentTarget).attr('id'));
	});

	// handle credits
	jQuery(".ccredits").click(function (event) {
		window.location.href = "http://www.freecodecamp.com/romorin";
	});
});

var _calcHandler = new CalcHandler();

function resizeCalc() {
	// get available space
	var bodyBorders = jQuery('body').outerWidth(true) - jQuery('body').innerWidth();

	var wHeight = jQuery(window).height() - CALC_BORDER_SIZE - bodyBorders;
	var wWidth = jQuery(window).width() - CALC_BORDER_SIZE - bodyBorders;

	// calculate available space ratio
	var wRatio = wWidth / wHeight;

	var cWidth = wWidth ;
	var cHeight = wHeight;

	// adjust calc size to ratio
	if (wRatio < CALC_RATIO) {
		cHeight = wWidth / CALC_RATIO;
	}
	else if (wRatio > CALC_RATIO) {
		cWidth = wHeight * CALC_RATIO;
	}

	// set calc size
	var calc = jQuery(".calc");
	calc.width(cWidth);
	calc.height(cHeight);
}
jQuery(window).resize(resizeCalc);