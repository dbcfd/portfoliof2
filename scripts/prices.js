var DayValue = function(date, open, high, low, close) {
	this.date = date;
	this.open = open;
	this.high = high;
	this.low = low;
	this.close = close;
}

DayValue.prototype = {
	toJson : function() {
		return '{"Date":"' + this.date.toString() + '","Open":' + this.open + ',"High":' + this.high + ',"Low":' + this.low + ',"Close":' + this.close + '}';
	}
}

var Prices = function(symbol) {
	this.symbol = symbol;
	this.values = [];
	this.valuesDiff = [];
}

var DaysBetween = function(dateStart, dateEnd) {
	var oneDay = 1000 * 60 * 60 * 24;
	return (dateStart.getTime() - dateEnd.getTime()) / oneDay;
}

Prices.prototype = {
	toJson : function() {
		var valueArray = '[';
		for(var value in this.values) {
			valueArray += value.toJson();
		}
		valueArray += ']';
		return '{"Symbol":' + this.symbol + ',"Values":' + valueArray + '}';
	},
	saveToDb : function(cb) {
		var pObj = this;
		var json = toJson();
		$.ajax({
			url: PriceUrl + '/' + this.symbol,
			data: json,
			type: 'PUT'
		}).done(function() {
			cb(null, pObj);
		}).error(function(err) {
			cb(err, null);
		});
	},
	updateDb : function(cb) {
		var pObj = this;
		var patchData = '[';
		for(var value in this.valuesDiff) {
			if(patchData.length != 1) patchData += ',';
			patchData += '{Type:"Add", Name:"Transactions", Value:"' + value.toJson() + '"}';
		}
		patchData += ']';
		$.ajax({
			url: PriceUrl + '/' + this.symbol,
			data: patchData,
			type: 'PATCH'
		}).done(function() {
			cb(null, pObj);
		}).error(function(err) {
			cb(err, null);
		});
	},
	retrieveFromDb : function(cb) {
		var pObj = this;
		$.ajax({
			url: PriceUrl + '/' + this.symbol,
			cache: false,
			dataType: 'json'
		}).done(function(jsonObj) {
			pObj.symbol = jsonObj['symbol'];
			var jsonValues = jsonObj['values'];
			for(var key in jsonValues) {
				var jsonDay = jsonValues[key];
				pObj.values.push(new DayValue(jsonDay['date'], jsonDay['open'], jsonDay['high'], jsonDay['low'], jsonday['close']));
			}
			cb(null, pObj);
		}).error(function(err) {
			cb(err, null);
		} );
	},
	retrieveDayValuesFromApi : function(durationInDays, cb) {
		//run ajax against api
		$.ajax({
			url: 'http://dev.markitondemand.com/Api/TimeSeries/json?symbol=' + this.symbol + '&duration=' + durationInDays,
			cache: false,
			dataType: 'json'
		}).done(function(jsonObj) {
			var dayValues = null;
			var dataObj = jsonObj['Data'];
			if(dataObj) {
				var seriesObj = dataObj['Series'];
				var datesObj = dataObj['SeriesDates'];
				var openValues = seriesObj['open']['values'];
				var closeValues = seriesObj['close']['values'];
				var highValues = seriesObj['high']['values'];
				var lowValues = seriesObj['low']['values'];
					
				dayValues = []
				for(var key in datesObj) {
					if(datesObj.hasOwnProperty(key)) {
						dayValues.push(new DayValue( { 
							date : datesObj[key], 
							open : openValues[key], 
							high : highValues[key], 
							low : lowValues[key], 
							close : closeValues[key] 
						} ) );
					}
				}
				if(dayValues.length == 0) dayValues = null;
			}
			if(null === dayValues) cb(new Error('Failed to find prices for symbol ' + symbol), null);
			else cb(null, dayValues);
		}
	},
	retrieveFromApi : function(durationInDays, cb) {
		var pObj = this;
		retrieveDayValuesFromApi(durationInDays, function(err, values) {
			if(err) cb(err, values);
			else {
				pObj.values = values;
				cb(err, pObj);
			}
		} );
	},
	update : function(durationInDays, cb) {
		var pObj = this;
		if(0 == durationInDays) cb(null, this);
		else {
			retrieveFromApi(durationInDays, function(err, values) {
				if(err) cb(err, values);
				else {
					pObj.valuesDiff =  pObj.valuesDiff.concat(values);
					pObj.values = pObj.values.concat(values);
					cb(err, pObj);
				}
			} );
		}
	}
}	