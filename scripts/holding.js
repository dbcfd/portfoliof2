var Holding = function(symbol, isLong) {
	this.symbol = symbol;
	this.isLong = isLong;
	this.costBasis = 0.0;
	this.quantity = 0.0;
	this.transactions = [];
	this.transactionsDiff = [];
	this.id = null;
}

var RetrieveHoldingFromDb = function(id, cb) {
	$.ajax({
		url: HoldingUrl + '/' + id,
		dataType: 'json'
	}).done(function(jsonObj) {
		var holding =  new Holding(json['Symbol'], json['IsLong']);
		holding.id = id;
		holding.costBasis = json['CostBasis'];
		holding.quantity = json['Quantity'];
		var transactions = json['Transactions'];
		for(var key in transactions) {
			holding.transactions.push(transactions[key]);
		}
		cb(null, holding);
	}).error(function(err) {
		cb(err, null);
	} );
}

Holding.prototype = {
	toJson : function() {
		var trans = '[';
		for(var id in this.transactions) {
			trans += '"' + id + '"';
		}
		trans += ']';
		return '{"Symbol":' + this.symbol + ',"IsLong":' + this.isLong + ',"CostBasis":' + this.costBasis + ',"Quantity":' + this.quantity + ',"Transactions":' + trans + '}';
	},
	cost : function() {
		return this.costBasis * this.quantity;
	},
	saveToDb : function(cb) {
		var hObj = this;
		var json = toJson();
		$.ajax({
			url: HoldingUrl,
			data: json,
			type: 'POST',
			cache: false,
			dataType: 'json'
		}).done(function(jsonObj) {
			hObj.id = jsonObj['Key'];
			cb(null, hObj);
		}).error(function(err) {
			cb(err, null);
		});
	},
	updateDb : function(cb) {
		if(null == this.id) cb(new Error('Holding must be saved to db before updating'), null);
		else {
			var hObj = this;
			var patchData = '[';
			for(var id in this.transactionsDiff) {
				if(patchData.length != 1) patchData += ',';
				patchData += '{Type:"Add", Name:"Transactions", Value:"' + id + '"}';
			}
			patchData += '{Type:"Set", Name:"CostBasis", Value:"' + this.costBasis + '"}';
			patchData += '{Type:"Set", Name:"Quantity", Value:"' + this.quantity + '"}';
			patchData += ']';
			$.ajax({
				url: HoldingUrl + '/' + this.id,
				data: patchData,
				type: 'PATCH'
			}).done(function() {
				cb(null, hObj);
			}).error(function(err) {
				cb(err, null);
			});
		}
	},
	saveOrUpdate : function(cb) {
		if(null === this.id) saveToDb(cb);
		else updateDb(cb);
	},
	addTransaction : function(date, quantity, cb) {
		var hObj = this;
		if(this.transactions.length == 0 && quantity < 0) {
			cb(new Error('Opening transactions must have a quantity larger than 0'), null);
		}
		else {
			new Quote(this.symbol).retrieve(function(err, price) {
				if(err) cb(err, null);
				else {
					var trans = new Transaction(new Date(), price, quantity);
					trans.saveToDb(function(err, trans) {
						var cost = hObj.cost() + trans.cost();
						hObj.quantity += trans.quantity;
						hObj.costBasis = hObj.quantity / cost;
						transactionsDiff.push(trans.id);
						transactions.push(trans.id);
						hObj.saveOrUpdate(cb);
					} );
				}
			} );
		}
	},
	gain : function(cb) {
		var hObj = this;
		new Quote(this.symbol).retrieve(function(err, price) {
			if(err) cb(err, null);
			else {
				var value = hObj.isLong ? (price - hObj.costBasis) : (hObj.costBasis - price);
				cb(err, value);
			}
		} );
	}
}
	