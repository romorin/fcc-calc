
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