var BindAllPortfolioProtos;

var Portfolio = function(user, name, type, cashBalance) {
	this.user = user;
	this.name = name;
	this.type = type;
	this.cashBalance = cashBalance;
	this.costBasis = 0.0;
	this.quantity = 0.0;
	this.holdings = [];
	this.holdingsDiff = [];
	this.holdingObjs = [];
	BindAllPortfolioProtos(this);
}

var RetrievePortfolioFromDb = function(user, cb) {
	$.ajax({
		url: PortfolioUrl + '/' + user + '?jsonp=?',
		dataType: 'jsonp',
		jsonpCallback: 'buildPortfolio'
	}).done(function(jsonObj) {
		var pObj = new Portfolio(user, jsonObj['Name'], jsonObj['Type'], jsonObj['CashBalance']);
		pObj.costBasis = jsonObj['CostBasis'];
		pObj.quantity = jsonObj['Quantity'];
		var holdings = jsonObj['Holdings'];
		alert('holdings:' + JSON.stringify(holdings));
		for(var idx = 0; idx < holdings.length; ++idx) {
			pObj.holdings.push(holdings[idx]);
		}
		cb(null, pObj);
	}).error(function(err) {
		cb(err, null);
	});
}	

Portfolio.prototype = {
	toJson : function() {
		var holdings = '[';
		for(var holding in this.holdings) {
			holdings += '"' + holding + '"';
		}
		holdings += ']';
		return '{"User":"' + this.user + '","Name":"' + this.name + '","Type":"' + this.type + '","CashBalance":' + this.cashBalance + ',"CostBasis":' + this.costBasis + ',"Quantity":' + this.quantity + ',"Holdings":' + holdings + ',"ObjectType":"Portfolio"}';
	},
	cost : function() {
		return this.costBasis * this.quantity;
	},
	updateCostBasis : function(transaction, cb) {
		var cost = this.cost() + transaction.cost();
		this.cashBalance -= transaction.cost();
		this.quantity += transaction.quantity();
		this.costBasis = this.quantity / cost;
		updateDb(cb);
	},
	addHolding : function(holding, cb) {
		if(!holding.hasId()) cb(new Error('Holding was not saved to database'), null);
		else {
			this.holdingObjs.push(holding);
			this.holdings.push(holding.id);
			this.holdingsDiff.push(holding.id);
			this.cashBalance -= holding.cost();
			var cost = this.cost() + holding.cost();
			this.quantity += holding.quantity;
			this.costBasis = this.quantity / cost;
			this.updateDb(cb);
		}
	},
	saveToDb : function(cb) {
		var pObj = this;
		var json = pObj.toJson();
		$.ajax({
			url: PortfolioUrl + '/' + this.user,
			data: json,
			type: 'PUT',
			crossDomain: true
		}).done(function() {
			cb(null, pObj);
		}).fail(function(err) {
			cb(err, null);
		});
	},
	updateDb : function(cb) {
		var pObj = this;
		var patchData = '[';
		for(var id in pObj.holdingsDiff) {
			if(patchData.length != 1) patchData += ',';
			patchData += '{Type:"Add", Name:"Holdings", Value:"' + id + '"}';
		}
		patchData += ',{Type:"Set", Name:"CashBalance", Value:"' + pObj.cashBalance + '"}';
		patchData += ',{Type:"Set", Name:"CostBasis", Value:"' + pObj.costBasis + '"}';
		patchData += ',{Type:"Set", Name:"Quantity", Value:"' + pObj.quantity + '"}';
		patchData += ']';
		$.ajax({
			url: PortfolioUrl + '/' + pObj.user,
			data: patchData,
			type: 'PATCH',
			dataType: 'json'
		}).done(function() {
			cb(null, pObj);
		}).fail(function(err) {
			cb(err, null);
		});
	},
	populateHoldingObjects : function(cb) {
		var pObj = this;
		if(pObj.holdings.length == 0 || pObj.holdings.length == pObj.holdingObjs.length) cb(null, pObj);
		else {
			async.each(pObj.holdings, function(item, acb) {
				RetrieveHoldingFromDb(item, function(err, holding) {
					if(err) acb(err);
					else {
						pObj.holdingObjs.push(holding);
						acb();
					}
				} )
			} , function(err) {
					if(err) cb(err, null);
					else cb(err, pObj);
			} );
		}
	},
	value : function(cb) {
		var pObj = this;
		async.reduce(pObj.holdingObjs, 0.0, function(val, holding, acb) {
			holding.value(function(err, value) {
				if(err) acb(err, val);
				else acb(err, val + value);
			} );
		}, function(err, result) {
			cb(err, result);
		} );
	},
	gain : function(cb) {
		var pObj = this;
		async.reduce(pObj.holdingObjs, 0.0, function(val, holding, acb) {
			holding.gain(function(err, value) {
				if(err) acb(err, val);
				else acb(err, val + value);
			} );
		}, function(err, result) {
			cb(err, result);
		} );
	},
	getHolding : function(symbol) {
		var pObj = this;
		var holdings = pObj.holdingObjs.filter( function(holding) { return holding.symbol = symbol; } );
		if(holdings.length == 0) return null;
		else return holdings[0];
	}
}

BindAllPortfolioProtos = function(self) {
	self.toJson = Portfolio.prototype.toJson.bind(self);
	self.cost = Portfolio.prototype.cost.bind(self);
	self.saveToDb = Portfolio.prototype.saveToDb.bind(self);
	self.addHolding = Portfolio.prototype.addHolding.bind(self);
	self.saveToDb = Portfolio.prototype.saveToDb.bind(self);
	self.updateDb = Portfolio.prototype.updateDb.bind(self);
	self.populateHoldingObjects = Portfolio.prototype.populateHoldingObjects.bind(self);
	self.value = Portfolio.prototype.value.bind(self);
	self.gain = Portfolio.prototype.gain.bind(self);
	self.getHolding = Portfolio.prototype.getHolding.bind(self);
}