var CALC_RATIO = 0.898;
var CALC_BORDER_SIZE = 0;

var NEGATIVE_CHAR = '¯';
var FLOAT_CHAR = ',';
var MAX_PRECISION = 15;

var TOO_MANY_MESSAGES = "Digits limit met";
var MISPLACED_OPERATOR = "Misplaced operator";
var TOO_MANY_DOTS = "Invalid Number";

function numStrToScreen(numStr) {
	return numStr.replace('-' ,NEGATIVE_CHAR).replace('.', FLOAT_CHAR);
}
function numToScreen(num) {
	return numStrToScreen((num.toPrecision(MAX_PRECISION)/1).toString());
}

/* src : http://stackoverflow.com/questions/464359/custom-exceptions-in-javascript */
function CalcErrorException(message) {
    this.message = message;
    // Use V8's native method if available, otherwise fallback
    if ("captureStackTrace" in Error)
        Error.captureStackTrace(this, CalcErrorException);
    else
        this.stack = (new Error()).stack;
}

CalcErrorException.prototype = Object.create(Error.prototype);
CalcErrorException.prototype.name = "CalcErrorException";
CalcErrorException.prototype.constructor = CalcErrorException;

function getTooManyDigitsException() {
	return new CalcErrorException(TOO_MANY_MESSAGES);
}
function getMisplacedOperatorException() {
	return new CalcErrorException(MISPLACED_OPERATOR);
}
function getTooManyDotsException() {
	return new CalcErrorException(TOO_MANY_DOTS);
}

function Op(priority, screen, run) {
	this._priority = priority;
	this._screen = screen;
	this._run = run;
}

Op.prototype.priority = function () { return this._priority; };
Op.prototype.screen = function () { return this._screen; };
Op.prototype.valid = function () { return true; };

function BinaryOp(priority, screen, run) {
	Op.call(this, priority, screen, run);
}

BinaryOp.prototype = Object.create(Op.prototype);
BinaryOp.prototype.constructor = BinaryOp;

BinaryOp.prototype.validEnding = function () { return false; };

BinaryOp.prototype.canAdd = function (prev) {
	return (prev instanceof NumberNode || prev instanceof PostOp) && prev.valid();
};

BinaryOp.prototype.reduce = function (node) {
	var lhs = node.prev();
	var rhs = node.next();

	var result = this._run(lhs.data().toNum(), rhs.data().toNum());

	lhs.insertBefore(buildNumberNode(result));
	lhs.remove();
	node.remove();
	rhs.remove();
};

function PostOp(priority, screen, run) {
	Op.call(this, priority, screen, run);
}
PostOp.prototype = Object.create(Op.prototype);
PostOp.prototype.constructor = PostOp;

PostOp.prototype.canAdd = function (prev) { return prev instanceof NumberNode && prev.valid(); };
PostOp.prototype.validEnding = function () { return true; };

PostOp.prototype.reduce = function (node) {
	var valueNode = node.prev();

	var result = this._run(valueNode.data().toNum());

	valueNode.insertBefore(buildNumberNode(result));
	valueNode.remove();
	node.remove();
};

function buildNumberNode(value) {
	var valueStr = value.toString();
	if (validForNumberAccumulator(value)) {
		return new NumberAccumulator(value);
	} else {
		return new FixedNumberNode(value);
	}
}

function NumberNode() {}
NumberNode.prototype.insertDigitDot = function () { return false; };
NumberNode.prototype.changeDigitSign  = function () { return false; };
NumberNode.prototype.insertDigit = function () { return false; };
NumberNode.prototype.valid = function () { return true; };
NumberNode.prototype.validEnding = function () { return true; };

NumberNode.prototype.canAdd = function (prev) {
	return prev === null  || (prev instanceof BinaryOp && prev.valid());
};

function FixedNumberNode(num) {
	this._value = num;
}

FixedNumberNode.prototype = Object.create(NumberNode.prototype);
FixedNumberNode.prototype.constructor = FixedNumberNode;
FixedNumberNode.prototype.toNum = function () { return this._value; };
FixedNumberNode.prototype.screen = function () { return numToScreen(this._value); };

function validForNumberAccumulator(value) {
	return -1000000000000000 <= value || value <= 1000000000000000 || valueStr.indexOf('e') !== -1;
}

function NumberAccumulator(value) {
	if ((value || value === 0) && validForNumberAccumulator(value)) {
		var valueStr = value.toString();
		var dotPos = valueStr.indexOf('.');

		this._number = Math.abs(value);
		this._floatOffset = dotPos === -1 ? null : Math.pow(10, valueStr.length - 1 - dotPos);
		this._negative = value < 0;
		this._digits = valueStr.length - (dotPos === -1 ? 0 : 1);
	} else {
		this._number = 0;
		this._floatOffset = null;
		this._negative = false;
		this._digits = 0;
	}
}

NumberAccumulator.prototype = Object.create(NumberNode.prototype);
NumberAccumulator.prototype.constructor = NumberAccumulator;
NumberAccumulator.prototype.validEnding = function () { return this.valid(); };

NumberAccumulator.prototype.insertDigitDot = function () {
	if (this._floatOffset === null) {
		this._floatOffset = 1;
		return true;
	} else {
		throw getTooManyDotsException();
	}
};

NumberAccumulator.prototype.changeDigitSign = function () {
	this._negative = !this._negative;
	return true;
};

NumberAccumulator.prototype.insertDigit = function (digit) {
	if (this._digits >= MAX_PRECISION) {
		throw getTooManyDigitsException();
	}
	if (this._floatOffset === null) {
		this._number = this._number*10 + (+digit);
	} else {
		this._floatOffset *= 10;
		this._number = this._number + (+digit) / this._floatOffset;
	}
	if (this._number !== 0) {
		this._digits++;
	}

	return true;
};

NumberAccumulator.prototype.screen = function () {
	var str = this._negative ? '-' : '';
	if (this._digits > 0) {
		str += this._absNum().toString();
	} else if (this._floatOffset === 1) {
		str += '0';
	}
	if (this._floatOffset === 1) {
		str += '.';
	}
	return numStrToScreen(str);
};

NumberAccumulator.prototype.toNum = function () {
	var num = this._absNum();
	if (this._negative) {
		num = - this._number;
	}
	return num;
};

NumberAccumulator.prototype.valid = function () {
	return this._digits > 0 && this._floatOffset !== 1;
};

NumberAccumulator.prototype._absNum = function () {
	if (this._digits === 0) {
		return 0;
	}
	return parseFloat(this._number.toPrecision(this._digits > 1 ? this._digits : 1));
};

var _operatorsList = {
	'*' : new BinaryOp(10, '*', function (lhs, rhs) {return lhs*rhs;}),
	'/' : new BinaryOp(10, '/', function (lhs, rhs) {return lhs/rhs;}),
	'%' : new BinaryOp(10, '%', function (lhs, rhs) {return lhs%rhs;}),
	'+' : new BinaryOp(20, '+', function (lhs, rhs) {return lhs+rhs;}),
	'-' : new BinaryOp(20, '-', function (lhs, rhs) {return lhs-rhs;}),
	// the calculator considers sqrt like calculate everything then do it, so hacking like
	// a low priority op is enough for now
	'SQRT' : new PostOp(30, 'SQRT', function (value) {return  Math.sqrt(value);})
};

function pushNode(data, list) {
	if (list) {
		return list.last().insertAfter(data).getList();
	} else {
		return new Node(data).getList();
	}
}

function Expression() {
	this._list = null;
	this._operators = {};
	this._lastAnswer = buildNumberNode(0);
}

Expression.prototype.addOperator = function (opKey) {
	var op = _operatorsList[opKey];
	var prev = this._list ? this._list.last().data() : null;

	var canAdd = op && op.canAdd(prev);
	if (!canAdd && this._list === null && op.canAdd(this._lastAnswer)) {
		this._list = pushNode(this._lastAnswer , this._list);
		canAdd = true;
	}

	if (canAdd) {
		this._list = pushNode(op , this._list);
		this._operators[op.priority()] = pushNode(this._list.last(), this._operators[op.priority()]);
	} else {
		throw getMisplacedOperatorException();
	}
	return canAdd;
};

Expression.prototype.addNumber = function (num) {
	var prev = prev ? this._list.last().data() : null;
	var node = jQuery.isNumeric(num) ? buildNumberNode(num) : null;
	if (node !== null && node.canAdd(prev)) {
		this._list = pushNode(node, this._list);
		return true;
	}
	return false;
};

Expression.prototype.insertDigitDot = function () {
	if (this._checkNumberAccumulator()) {
		return this._list.last().data().insertDigitDot();
	}
	return false;
};

Expression.prototype.changeDigitSign = function () {
	if (this._checkNumberAccumulator()) {
		return this._list.last().data().changeDigitSign();
	}
	return false;
};

Expression.prototype.insertDigit = function (digit) {
	if (this._checkNumberAccumulator()) {
		return this._list.last().data().insertDigit(digit);
	}
	return false;
};

Expression.prototype._checkNumberAccumulator = function () {
	var prev = this._list ? this._list.last().data() : null;
	if (prev !== null && prev instanceof NumberAccumulator) {
		return true;
	} else {
		var node = new NumberAccumulator();
	 	if (node.canAdd(prev)) {
			this._list = pushNode(node , this._list);
			return true;
		}
	}
	return false;
};

Expression.prototype.run = function () {
	if (this._list === null) {
		return true;
	}
	if (!this._list.last().data().validEnding()) {
		return false;
	}

	Object.keys(this._operators).forEach(function (key) {
		this._operators[key].forEach(function (opNode) {
			opNode.data().data().reduce(opNode.data());
			opNode.remove();
		});
		delete this._operators[key];
	}, this);

	this._lastAnswer = this._list.last().data();
	this._list = null;

	return true;
};

Expression.prototype.screenText = function () {
	var text = '';
	if (this._list !== null) {
		this._list.forEach(function (node) {
			text += node.data().screen();
		});
	}
	return text;
};

Expression.prototype.clear = function () {
	if (this._list !== null) {
		this._list = null;
		this._operators = {};
	} else {
		this._lastAnswer = buildNumberNode(0);
	}
};

Expression.prototype.pop = function () {
	if (this._list !== null) {
		var last = this._list.last();
		if (this._list.first() === last) {
			this.clear();
		} else {
			if (last.data() instanceof Op) {
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
	if (this._list === null) {
		this._lastAnswer = buildNumberNode(0);
	}
};

Expression.prototype.lastAnswer = function () { return this._lastAnswer.toNum(); };

function Memory() {
	this._currentSum = 0;
}

Memory.prototype.get = function () { return this._currentSum; };
Memory.prototype.add = function (value) { this._currentSum += value; };
Memory.prototype.substract = function (value) { this._currentSum -= value; };
Memory.prototype.clear = function () { this._currentSum = 0; };

function OffCalcHandler() {}

OffCalcHandler.prototype.addOp =
OffCalcHandler.prototype.calculate =
OffCalcHandler.prototype.sqrt =
OffCalcHandler.prototype.insertDigitDot =
OffCalcHandler.prototype.changeDigitSign =
OffCalcHandler.prototype.insertDigit =
OffCalcHandler.prototype.onOff =
OffCalcHandler.prototype.clearAll =
OffCalcHandler.prototype.memoryRecall =
OffCalcHandler.prototype.memoryClear =
OffCalcHandler.prototype.memoryAdd =
OffCalcHandler.prototype.memorySubstract = function () { return true; };
OffCalcHandler.prototype.onOn = function () {
	_calcHandler = _onCalcHandler;
	return true;
};
OffCalcHandler.prototype.getDisplay = function () { return ''; };

function CalcHandler() {
	this._expr = new Expression();
	this._memory = new Memory();
}

CalcHandler.prototype.addOp = function(op) {
	return this._expr.addOperator(op);
};

CalcHandler.prototype.sqrt = function () {
	if (this._expr.addOperator("SQRT")) {
		if(this._expr.run()){
			return true;
		} else {
			this._expr.pop();
		}
	}
	return false;
};

CalcHandler.prototype.calculate = function () {
	return this._expr.run();
};

CalcHandler.prototype.insertDigitDot = function () {
	return this._expr.insertDigitDot();
};

CalcHandler.prototype.changeDigitSign = function () {
	return this._expr.changeDigitSign();
};

CalcHandler.prototype.insertDigit = function (digit) {
	return this._expr.insertDigit(digit);
};

CalcHandler.prototype.onOff = function () {
	_calcHandler = _offCalcHandler;
	return true;
};

CalcHandler.prototype.onOn = function () {
	this._expr.pop();
	return true;
};

CalcHandler.prototype.clearAll = function () {
	this._expr.clear();
	return true;
};

CalcHandler.prototype.memoryRecall = function () {
	this._expr.addNumber(this._memory.get());
	return true;
};

CalcHandler.prototype.memoryClear = function () {
	this._memory.clear();
	return true;
};

CalcHandler.prototype.memoryAdd = function () {
	this._memory.add(this._expr.lastAnswer());
	return true;
};

CalcHandler.prototype.memorySubstract = function () {
	this._memory.substract(this._expr.lastAnswer());
	return true;
};

CalcHandler.prototype.getDisplay = function() {
	var text = this._expr.screenText();
	if (text === '' && this._expr.lastAnswer() !== null){
		text = numToScreen(this._expr.lastAnswer());
	}
	return text;
};

var _cButtons = {
	c0 : function() { return _calcHandler.insertDigit('0');},
	c1 : function() { return _calcHandler.insertDigit('1');},
	c2 : function() { return _calcHandler.insertDigit('2');},
	c3 : function() { return _calcHandler.insertDigit('3');},
	c4 : function() { return _calcHandler.insertDigit('4');},
	c5 : function() { return _calcHandler.insertDigit('5');},
	c6 : function() { return _calcHandler.insertDigit('6');},
	c7 : function() { return _calcHandler.insertDigit('7');},
	c8 : function() { return _calcHandler.insertDigit('8');},
	c9 : function() { return _calcHandler.insertDigit('9');},
	cdot : function() { return _calcHandler.insertDigitDot();},
	cplus : function() { return _calcHandler.addOp('+');},
	cminus : function() { return _calcHandler.addOp('-');},
	cmult : function() { return _calcHandler.addOp('*');},
	cdiv : function() { return _calcHandler.addOp('/');},
	cequal : function() { return _calcHandler.calculate();},
	cc : function() { return _calcHandler.onOn();},
	cce : function() { return _calcHandler.clearAll();},
	csqrt : function() { return _calcHandler.sqrt();},
	cpercent : function() { return _calcHandler.addOp('%');},
	coff : function() { return _calcHandler.onOff();},
	csign : function() { return _calcHandler.changeDigitSign();},
	cmc : function() { return _calcHandler.memoryClear();},
	cmr : function() { return _calcHandler.memoryRecall();},
	cmminus : function() { return _calcHandler.memorySubstract();},
	cmplus : function() { return _calcHandler.memoryAdd();}
};

function updateScreen() {
	jQuery('#cscreen').html(_calcHandler.getDisplay());
}

function onError() {
	jQuery("#cspec").animate({
			opacity: 0.5
		}, 100, 'swing', function () {
			jQuery("#cspec").animate({
				opacity: 0
			}, 100, 'swing');
	});
}

function onBtnClick(id) {
	if (id in _cButtons) {
		try {
			if(!_cButtons[id]()) {
				onError();
			}
			updateScreen();
		} catch (e) {
			if (e instanceof CalcErrorException) {
				jQuery('#cscreen').html(e.message);
				onError();
				window.setTimeout(updateScreen, 3000);
			} else {
				throw e;
			}
		}
	}
}

// to be done when the page is ready
jQuery(document).ready(function() {
	resizeCalc();
	updateScreen();

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