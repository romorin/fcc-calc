var CALC_RATIO = 0.898;
var CALC_BORDER_SIZE = 0;

var NEGATIVE_CHAR = '¯';
var FLOAT_CHAR = ',';
var MAX_PRECISION = 15;

function numStrToScreen(numStr) {
	return numStr.replace('-' ,NEGATIVE_CHAR).replace('.', FLOAT_CHAR);
}
function numToScreen(num) {
	return numStrToScreen((num.toPrecision(MAX_PRECISION)/1).toString());
}

function Op(priority, screen, run) {
	this._priority = priority;
	this._screen = screen;
	this._run = run;
}

Op.prototype.priority = function () { return this._priority; };
Op.prototype.screen = function () { return this._screen; };

function BinaryOp(priority, screen, run) {
	Op.call(this, priority, screen, run);
}

BinaryOp.prototype = Object.create(Op.prototype);
BinaryOp.prototype.constructor = BinaryOp;

BinaryOp.prototype.validEnding = function () { return false; };

BinaryOp.prototype.canAdd = function (prev) {
	return prev instanceof NumberNode || prev instanceof PostOp;
};

BinaryOp.prototype.reduce = function (node) {
	var lhs = node.prev();
	var rhs = node.next();

	var result = this._run(lhs.data().toNum(), rhs.data().toNum());

	lhs.insertBefore(new NumberNode(result));
	lhs.remove();
	node.remove();
	rhs.remove();
};

function PostOp(priority, screen, run) {
	Op.call(this, priority, screen, run);
}
PostOp.prototype = Object.create(Op.prototype);
PostOp.prototype.constructor = PostOp;

PostOp.prototype.canAdd = function (prev) { return prev instanceof NumberNode; };
PostOp.prototype.validEnding = function () { return true; };

PostOp.prototype.reduce = function (node) {
	var valueNode = node.prev();

	var result = this._run(valueNode.data().toNum());

	valueNode.insertBefore(new NumberNode(result));
	valueNode.remove();
	node.remove();
};

function NumberNode(num) {
	this._value = num;
}

NumberNode.prototype.validEnding = function () { return true; };
NumberNode.prototype.toNum = function () { return this._value; };
NumberNode.prototype.screen = function () { return numToScreen(this._value); };

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
	this._lastAnswer = new NumberNode(0);
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
	}
	return canAdd;
};

Expression.prototype.canAddNumber = function () {
	var prev = this._list ? this._list.last().data() : null;
	return prev === null  || prev instanceof BinaryOp;
};

Expression.prototype.addNumber = function (num) {
	if (this.canAddNumber(this._list) && jQuery.isNumeric(num)) {
		this._list = pushNode(new NumberNode(num) , this._list);
		return true;
	}
	return false;
};

Expression.prototype.run = function () {
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
		this._lastAnswer = new NumberNode(0);
	}
};

Expression.prototype.pop = function () {
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
};

Expression.prototype.lastAnswer = function () { return this._lastAnswer.toNum(); };

function Memory() {
	this._currentSum = 0;
}

Memory.prototype.get = function () { return this._currentSum; };
Memory.prototype.add = function (value) { this._currentSum += value; };
Memory.prototype.substract = function (value) { this._currentSum -= value; };
Memory.prototype.clear = function () { this._currentSum = 0; };

function NumberAccumulator() {
	this._number = 0;
	this._floatOffset = null;
	this._negative = false;
	this._digits = 0;
}

NumberAccumulator.prototype.insertDigitDot = function () {
	if (this._floatOffset === null) {
		this._floatOffset = 1;
	}
	return true;
};

NumberAccumulator.prototype.changeDigitSign = function () {
	this._negative = !this._negative;
	return true;
};

NumberAccumulator.prototype.insertDigit = function (digit) {
	if (this._digits > MAX_PRECISION) {
		return false;
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

NumberAccumulator.prototype.toString = function () {
	var str = this._negative ? '-' : '';
	if (this._digits > 0) {
		str += this._absNum().toString();
	} else if (this._floatOffset === 1) {
		str += '0';
	}
	if (this._floatOffset === 1) {
		str += '.';
	}
	return str;
};

NumberAccumulator.prototype.toNum = function () {
	var num = this._absNum();
	if (this._negative) {
		num = - this._number;
	}
	return num;
};

NumberAccumulator.prototype._absNum = function () {
	if (this._digits === 0) {
		return 0;
	}
	return  parseFloat(this._number.toPrecision(this._digits > 1 ? this._digits : 1));
};

NumberAccumulator.prototype.valid = function () {
	return this._digits > 0 && this._floatOffset !== 1;
};

function OffCalcHandler() {}

OffCalcHandler.prototype.addOp = function () {};
OffCalcHandler.prototype.calculate = function () {};
OffCalcHandler.prototype.sqrt = function () {};
OffCalcHandler.prototype.insertDigitDot = function () {};
OffCalcHandler.prototype.changeDigitSign = function () {};
OffCalcHandler.prototype.insertDigit = function () {};
OffCalcHandler.prototype.onOff = function () {};
OffCalcHandler.prototype.clearAll = function () {};
OffCalcHandler.prototype.memoryRecall = function () {};
OffCalcHandler.prototype.memoryClear = function () {};
OffCalcHandler.prototype.memoryAdd = function () {};
OffCalcHandler.prototype.memorySubstract = function () {};
OffCalcHandler.prototype.onOn = function () { _calcHandler = _onCalcHandler; };
OffCalcHandler.prototype.getDisplay = function () { return ''; };

function CalcHandler() {
	this._expr = new Expression();
	this._memory = new Memory();
	this._numberAccumulator = null;
}

CalcHandler.prototype.addOp = function(op) {
	return this._operate(this._expr.addOperator.bind(this._expr, op));
};

CalcHandler.prototype.sqrt = function () {
	if (this._numberAccumulator !== null && !this._numberAccumulator.valid()) {
		return false;
	}
	var addedNumber = false;
	if (this._numberAccumulator !== null) {
		addedNumber = this._expr.addNumber(this._numberAccumulator.toNum());
	}

	var addedSqrt = this._expr.addOperator("SQRT");
	var calculated = false;
	if (addedSqrt) {
		calculated = this._expr.run();
	}
	if (calculated) {
		this._numberAccumulator = null;
		return true;
	} else {
		if (addedSqrt) {
			this._expr.pop();
		}
		if (addedNumber) {
			this._expr.pop();
		}
	}
	return false;
};

CalcHandler.prototype.calculate = function () {
	return this._operate(this._expr.run.bind(this._expr));
};

CalcHandler.prototype.insertDigitDot = function () {
	if (this._checkCurrentNumber()) {
		return this._numberAccumulator.insertDigitDot();
	}
	return false;
};

CalcHandler.prototype.changeDigitSign = function () {
	if (this._checkCurrentNumber()) {
		return this._numberAccumulator.changeDigitSign();
	}
	return false;
};

CalcHandler.prototype.insertDigit = function (digit) {
	if (this._checkCurrentNumber()) {
		return this._numberAccumulator.insertDigit(digit);
	}
	return false;
};

CalcHandler.prototype.onOff = function () { _calcHandler = _offCalcHandler; };
CalcHandler.prototype.onOn = function () {
	if (this._numberAccumulator !== null) {
		this._numberAccumulator = null;
	} else {
		this._expr.pop();
	}
	return true;
};

CalcHandler.prototype.clearAll = function () {
	this._expr.clear();
	this._numberAccumulator = null;
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
	if (this._numberAccumulator !== null) {
		text += numStrToScreen(this._numberAccumulator.toString());
	}
	if (text === '' && this._expr.lastAnswer() !== null){
		text = numToScreen(this._expr.lastAnswer());
	}
	return text;
};

CalcHandler.prototype._checkCurrentNumber = function () {
	if (this._numberAccumulator === null && this._expr.canAddNumber()) {
		this._numberAccumulator = new NumberAccumulator();
	}
	return this._numberAccumulator !== null;
};

CalcHandler.prototype._operate = function (callback) {
	var addedNumber = false;
	if (this._numberAccumulator !== null) {
		if (this._numberAccumulator.valid()) {
			this._expr.addNumber(this._numberAccumulator.toNum());
		} else {
			return false;
		}
	}
	if(callback()){
		this._numberAccumulator = null;
		return true;
	} else if (addedNumber){
		this._expr.pop();
	}
	return false;
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
		if(!_cButtons[id]()) {
			onError();
		}
		updateScreen();
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