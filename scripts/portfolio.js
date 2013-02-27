var Portfolio = function(user, name, type, cashBalance) {
	this.user = user;
	this.name = name;
	this.type = type;
	this.cashBalance = cashBalance;
	this.cost = 0.0;
	this.holdings = [];
	this.holdingsDiff = [];
}

var RetrievePortfolioFromDb = function(user, cb) {
	$.ajax({
		url: PortfolioUrl + '/' + user,
		dataType: 'json'
	}).done(function(jsonObj) {
		var pObj = new Portfolio(user, jsonObj['Name'], jsonObj['Type'], jsonObj['CashBalance']);
		pObj.cost = jsonObj['Cost'];
		var holdings = jsonObj['Holdings'];
		for(var key in holdings) {
			pObj.holdings.push(holdings[key]);
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
		return '{"User":"' + this.user + '","Name":"' + this.name + '","Type":"' + this.type + '","CashBalance":' + this.cashBalance + ',"Cost":' + this.cost + ',"Holdings":' + holdings + '}';
	},
	addHolding : function(holding, cb) {
		this.holdings.push(holding);
		this.holdingsDiff.push(holding);
		this.cashBalance -= holding.cost();
		this.cost += holding.cost();
		updateDb(cb);
	},
	saveToDb : function(cb) {
		var pObj = this;
		var json = toJson();
		$.ajax({
			url: PortfolioUrl + '/' + this.user,
			data: json,
			type: 'PUT',
		}).done(function() {
			cb(null, pObj);
		}).error(function(err) {
			cb(err, null);
		});
	},
	updateDb : function(cb) {
		var pObj = this;
		var patchData = '[';
		for(var id in this.holdingsDiff) {
			if(patchData.length != 1) patchData += ',';
			patchData += '{Type:"Add", Name:"Holdings", Value:"' + id + '"}';
		}
		patchData += '{Type:"Set", Name:"CashBalance", Value:"' + this.cashBalance + '"}';
		patchData += '{Type:"Set", Name:"Cost", Value:"' + this.cost + '"}';
		patchData += ']';
		$.ajax({
			url: PortfolioUrl + '/' + this.user,
			data: patchData,
			type: 'PATCH'
		}).done(function() {
			cb(null, pObj);
		}).error(function(err) {
			cb(err, null);
		});
	}
}