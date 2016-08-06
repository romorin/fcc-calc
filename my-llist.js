/*
	My own linked implementation, where operations are controlled by the node
*/

/*
	Constant representation of the list
*/
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
	// get the first element in the list
	first : function () {
		return this._first;
	},

	// get the last element in the list
	last : function () {
		return this._last;
	},

	// apply a callback on every nodes in the list
	forEach : function (callback) {
		var current = this._first;
		while (current !== this._last) {
			var next = current._next;
			callback(current);
			current = next;
		}
		callback(this._last);
	}
};

/*
	The nodes of the linked list
*/
function Node (data) {
	this._data = data;
	this._prev = null;
	this._next = null;
	this._bounds = new LList(this);
}
Node.prototype = {
	// insert a new node after this one
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

	// insert a new node before this one
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

	// remove this node from the list
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

	// get info
	data : function () { return this._data; },
	prev : function () { return this._prev; },
	next : function () { return this._next; },
	getList : function () { return this._bounds; }
};