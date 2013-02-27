var Transaction = function(date, price, quantity) {
	this.date = date;
	this.price = price;
	this.quantity = quantity;
	this.id = [];
}

var RetrieveTransactionFromDb = function(id, cb) {
	$.ajax({
		url: TransactionsUrl + '/' + id,
		dataType : 'json'
	}).done(function(jsonObj) {
		var trans = new Transaction(new Date(jsonObj['Date']), jsonObj['Price'], jsonObj['quantity']);
		trans.id = id;
		cb(null, trans);
	}).error(function(err) {
		cb(err, null);
	});
}

Transaction.prototype = {
	toJson : function() {
		return '{"Date":"' + this.date.toString() + '","Price":' + this.price + ',"Quantity":' + this.quantity + '}';
	},
	cost : function() {
		return this.price * this.quantity;
	},
	saveToDb : function(cb) {
		var tObj = this;
		var json = toJson();
		$.ajax({
			url: TransactionUrl,
			data: json,
			type: 'POST',
			cache: false,
			dataType: 'json'
		}).done(function(jsonObj) {
			tObj.id = jsonObj['Key'];
			cb(null, tObj);
		}).error(function(err) {
			cb(err, null);
		});
	},
	removeFromDb : function(cb) {
		$.ajax({
			url: TransactionUrl + this.id,
			type: 'DELETE'
		}).done(function() {
			cb(null);
		}).error(function(err) {
			cb(err);
		} );
	}
}
		