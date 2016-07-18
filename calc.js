var CALC_RATIO = 0.898;
var CALC_BORDER_SIZE = 0;

var cButtons = {};
cButtons.c0 = function() {addToScreen('0');};
cButtons.c1 = function() {addToScreen('1');};
cButtons.c2 = function() {addToScreen('2');};
cButtons.c3 = function() {addToScreen('3');};
cButtons.c4 = function() {addToScreen('4');};
cButtons.c5 = function() {addToScreen('5');};
cButtons.c6 = function() {addToScreen('6');};
cButtons.c7 = function() {addToScreen('7');};
cButtons.c8 = function() {addToScreen('8');};
cButtons.c9 = function() {addToScreen('9');};
cButtons.cdot = function() {addToScreen(',');};
cButtons.cplus = function() {addToScreen('+');};
cButtons.cminus = function() {addToScreen('-');};
cButtons.cmult = function() {addToScreen('*');};
cButtons.cdiv = function() {addToScreen('/');};
cButtons.cequal = function() {addToScreen('=');};
cButtons.cc = function() {addToScreen('C');};
cButtons.cce = function() {addToScreen('E');};
cButtons.csqrt = function() {addToScreen('S');};
cButtons.cpercent = function() {addToScreen('%');};
cButtons.coff = function() {addToScreen('F');};
cButtons.csign = function() {addToScreen('+-');};
cButtons.cmc = function() {addToScreen('MC');};
cButtons.cmr = function() {addToScreen('MR');};
cButtons.cmminus = function() {addToScreen('M-');};
cButtons.cmplus = function() {addToScreen('M+');};

function addToScreen(text) {
	var jScreen = jQuery('#cscreen');
	var oldText = jScreen.html();

	jScreen.html(oldText + text);
}

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

// to be done when the page is ready
jQuery(document).ready(function() {
	resizeCalc();

	// call the appropriate handler when a button is clicked
	jQuery(".cbutton").click(function (event) {
		var id = jQuery(event.currentTarget).attr('id');
		cButtons[id]();
	});
});
