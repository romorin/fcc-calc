var CALC_RATIO = 0.898;
var CALC_BORDER_SIZE = 0;


var NEGATIVE_CHAR = '¯';
var FLOAT_CHAR = ',';

var OPERATOR_TYPE = 'Op';
var VALUE_TYPE = 'Value';

function OpNode(priority, screen, run) {
	this._priority = priority;
	this._screen = screen;
	this._run = run;
	this.TYPE = OPERATOR_TYPE;
}

OpNode.prototype = {
	priority : function () {
		return this._priority;
	},
	screen : function () {
		return this._screen;
	},
	run : function (lhs, rhs) {
		return this._run(lhs, rhs);
	},
	canAdd : function (prev) {
		return prev.TYPE === VALUE_TYPE;
	},
	validEnding : function () {
		return false;
	}
};
function NumberNode(value) {
	this._value = value;
	this.TYPE = VALUE_TYPE;
}

NumberNode.prototype = {
	getValue : function () {
		return this._value;
	},
	canAdd : function (prev) {
		return prev === null  || prev.TYPE === OPERATOR_TYPE;
	},
	validEnding : function () {
		return true;
	}
};

var _operatorsList = {
	'*' : new OpNode(10, '*', function (lhs, rhs) {return lhs*rhs;}),
	'/' : new OpNode(10, '/', function (lhs, rhs) {return lhs/rhs;}),
	'+' : new OpNode(20, '+', function (lhs, rhs) {return lhs+rhs;}),
	'-' : new OpNode(20, '-', function (lhs, rhs) {return lhs-rhs;})
};

function Expression() {
	this._list = null;
	this._operators = {};
	this._screenText = '';
	this._newResult = false;
}

function reduce(op) {
	var lhs = op.prev();
	var rhs = op.next();

	var result = op.data().run(lhs.data().getValue(), rhs.data().getValue());

	lhs.insertBefore(new NumberNode(result));
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

function numberToScreen(num) {
	return numStrToScreen(num.toString());
}
function numStrToScreen(numStr) {
	return numStr.replace('-' ,NEGATIVE_CHAR).replace('.', FLOAT_CHAR);
}

Expression.prototype = {
	addOperator : function (op) {
		var opNode = _operatorsList[op];
		var prev = this._list ? this._list.last().data() : null;
		if (opNode && opNode.canAdd(prev)) {
			this._list = pushNode(opNode , this._list);
			this._operators[opNode.priority()] = pushNode(this._list.last(), this._operators[opNode.priority()]);
			this._screenText += opNode.screen();
			this._newResult = false;
			return true;
		}
		return false;
	},

	addNumber : function (value) {
		if (jQuery.isNumeric(value)) {
			var nNode = new NumberNode(value);
			var prev = this._list ? this._list.last().data() : null;
			if (nNode.canAdd(prev)) {
				this._list = pushNode(nNode , this._list);
				this._screenText += numberToScreen(nNode.getValue());
				this._newResult = false;
				return true;
			}
		}
		return false;
	},

	run : function () {
		if (!this._list.last().data().validEnding()) {
			return null;
		}

		Object.keys(this._operators).forEach(function (key) {
			this._operators[key].forEach(function (opNode) {
				reduce(opNode.data());
				opNode.remove();
			});
			delete this._operators[key];
		}, this);

		var result = this._list.last().data().getValue();
		this._screenText = numberToScreen(result);
		this._newResult = true;
		return result;
	},

	screenText : function () {
		return this._screenText;
	},

	// todo find more elegant way
	flushNewResult : function () {
		if (this._newResult) {
			this._list = null;
			this._screenText = '';
		}
	},

	pop : function () {
		var last = this._list.last();
		if (this._list.first() === last) {
			this._list = null;
			this._operators = {};
		} else {
			if (last.data().TYPE === OPERATOR_TYPE) {
				var opRow = this._operators[last.data().priority()];

				if (opRow.first() === opRow.last()) {
					delete this._operators[last.data().priority()];
				} else {
					opRow.last().remove();
				}
			}
			last.remove();
		}
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
			this._numberStr += '.';
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

	toString : function () {
		var result = this._isPositive ? '' : '-';
		result += this._numberStr;
		return result;
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


function OffCalcHandler() {}

OffCalcHandler.prototype = {
	addBinaryOp : function () {},
	calculate : function () {},
	insertDigitDot : function () {},
	changeDigitSign : function () {},
	insertDigit : function () {},
	onOff : function () {},
	onOn : function () {
		_calcHandler = _onCalcHandler;
	},
	getDisplay : function () {
		return '';
	}
};

function CalcHandler() {
	this._expr = new Expression();
	this._numberHandler = new NumberHandler();
	this._lastAnswer = null;
}

CalcHandler.prototype = {
	addBinaryOp : function(op) {
		var addedNumber = false;
		if (!this._numberHandler.isEmpty()) {
			this._expr.addNumber(this._numberHandler.toNum());
		}
		if (this._expr.addOperator(op)) {
			this._numberHandler.pop();
		} else {
			this._expr.pop();
		}
	},

	calculate : function () {
		// add the last number
		var addedNumber = false;
		if (!this._numberHandler.isEmpty()) {
			if(this._expr.addNumber(this._numberHandler.toNum())) {
				addedNumber = true;
			} else {
				return false;
			}
		}

		// run and save the result
		var answer = this._expr.run();
		if (answer !== null) {
			this._lastAnswer = answer;
			this._numberHandler.pop();

			return true;
		} else if (addedNumber) {
			this._expr.pop();
		}
		return false;
	},

	insertDigitDot : function () {
		this._numberHandler.insertDigitDot();
		this._expr.flushNewResult();
	},

	changeDigitSign: function () {
		this._numberHandler.changeDigitSign();
		this._expr.flushNewResult();
	},

	insertDigit : function (digit) {
		this._numberHandler.insertDigit(digit);
		this._expr.flushNewResult();
	},
	onOff : function () {
		_calcHandler = _offCalcHandler;
	},
	onOn : function () {
		this._numberHandler.pop();
	},

	getDisplay : function() {
		return this._expr.screenText() + numStrToScreen(this._numberHandler.toString());
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
	cc : function() {_calcHandler.onOn();},
	cce : function() {_calcHandler.addToScreen('E');},
	csqrt : function() {_calcHandler.addToScreen('S');},
	cpercent : function() {_calcHandler.addToScreen('%');},
	coff : function() {_calcHandler.onOff();},
	csign : function() {_calcHandler.changeDigitSign();},
	cmc : function() {_calcHandler.addToScreen('MC');},
	cmr : function() {_calcHandler.addToScreen('MR');},
	cmminus : function() {_calcHandler.addToScreen('M-');},
	cmplus : function() {_calcHandler.addToScreen('M+');}
};

function onBtnClick(id) {
	if (id in _cButtons) {
		_cButtons[id]();
		jQuery('#cscreen').html(_calcHandler.getDisplay());
	}
}

// to be done when the page is ready
jQuery(document).ready(function() {
	resizeCalc();

	// call the appropriate handler when a button is clicked
	jQuery(".cbutton").click(function (event) {
		onBtnClick(jQuery(event.currentTarget).attr('id'));
	});

	// handle credits
	jQuery(".ccredits").click(function (event) {
		window.location.href = "http://www.freecodecamp.com/romorin";
	});
});

var _onCalcHandler = new CalcHandler();
var _offCalcHandler = new OffCalcHandler();
var _calcHandler = _onCalcHandler;

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