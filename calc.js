var CALC_RATIO = 0.898;
var CALC_BORDER_SIZE = 0;

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
});