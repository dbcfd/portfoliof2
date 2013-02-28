var Quote = function(symbol) {
	this.symbol = symbol;
	this.last = 0.0;
	this.change = 0.0;
	this.changePercent = 0.0;
	this.time = null;
	this.volume = 0.0;
}

Quote.prototype = {
	retrieve : function(cb) {
		var qObj = this;
		$.ajax({
			url: 'http://dev.markitondemand.com/Api/Quote/jsonp?symbol=' + this.symbol,
			cache: false,
			dataType: 'jsonp',
			jsonp: 'callback',
			jsonpCallback: 'buildQuote'
		}).done(function(jsonObj) {
			var jsonData = jsonObj['Data'];
			if(!jsonData || null === jsonData) cb('Failed to retrieve quote for ' + qObj.symbol, 0.0);
			else {
				qObj.last = jsonData['LastPrice'];
				qObj.change = jsonData['Change'];
				qObj.changePercent = jsonData['ChangePercent'];
				qObj.time = new Date(jsonData['Timestamp']);
				qObj.volume = jsonData['Volume'];
				cb(null, qObj);
			}
		}).fail(function(xhr, status, error) {
			cb(error, null);
		} );
	},
	toHtml : function() {
		var header = '<tr><th>Last Price</th><th>Time</th><th>Volume</th><th>Change</th><th>Change Percent</th></tr>';
		var data = '<tr><td>' + this.last + '</td><td>' + this.time.toString() + '</td><td>' + this.volume + '</td><td>' + this.change + '</td><td>' + this.changePercent + '</td></tr>';
		return '<table>' + header + data + '</table>';
	}
}
