var BindAllHoldingProtos;

var Holding = function(symbol, isLong) {
    this.symbol = symbol;
    this.isLong = isLong;
    this.costBasis = 0.0;
    this.quantity = 0.0;
    this.transactions = [];
    this.transactionsDiff = [];
    this.id = null;
    BindAllHoldingProtos(this);
}

var RetrieveHoldingFromDb = function(id, cb) {
    $.ajax({
        url: HoldingUrl + '/' + id + '?jsonp=?',
        dataType: 'jsonp'
    }).done(function(jsonObj) {
        var holding =  new Holding(jsonObj.Symbol, jsonObj.IsLong);
        holding.id = id;
        holding.costBasis = jsonObj.CostBasis;
        holding.quantity = jsonObj.Quantity;
        var transactions = jsonObj.Transactions;
        for(var idx = 0; idx < transactions.length; ++idx) {
            var transaction = transactions[idx];
            holding.transactions.push(transaction);
        }
        cb(null, holding);
    }).error(function(err) {
        cb(err, null);
    } );
}

Holding.prototype = {
    hasId : function() {
        return (this.id && this.id !== null);
    },
    toJson : function() {
        var hObj = this;
        var trans = '[';
        for(var i=0; i < hObj.transactions.length; ++i) {
            var transId = hObj.transactions[i];
            trans += '"' + transId + '"';
        }
        trans += ']';
        return '{"Symbol":"' + hObj.symbol + '","IsLong":' + hObj.isLong + ',"CostBasis":' + hObj.costBasis + ',"Quantity":' + hObj.quantity + ',"Transactions":' + trans + ',"ObjectType":"Holding"}';
    },
    cost : function() {
        return this.costBasis * this.quantity;
    },
    saveToDb : function(cb) {
        var hObj = this;
        var json = hObj.toJson();
        alert('saving ' + json);
        $.ajax({
            url: HoldingUrl,
            data: json,
            type: 'POST',
            crossDomain: true
        }).done(function(jsStr) {
            var jsonObj = JSON.parse(jsStr);
            hObj.id = jsonObj.Key;
            cb(null, hObj);
        }).fail(function(xhr, status, error) {
            alert('failed to save holding: ' + error);
            cb(error, null);
        });
    },
    updateDb : function(cb) {
        var hObj = this;
        if(null == hObj.id) cb(new Error('Holding must be saved to db before updating'), null);
        else {
            var patchData = '[';
            for(var i=0; i < hObj.transactionsDiff.length; ++i) {
                var transId = hObj.transactionsDiff[i];
                if(patchData.length != 1) patchData += ',';
                patchData += '{Type:"Add", Name:"Transactions", Value:"' + transId + '"}';
            }
            patchData += '{Type:"Set", Name:"CostBasis", Value:"' + hObj.costBasis + '"}';
            patchData += '{Type:"Set", Name:"Quantity", Value:"' + hObj.quantity + '"}';
            patchData += ']';
            $.ajax({
                url: HoldingUrl + '/' + hObj.id + '?jsonp=?',
                data: patchData,
                type: 'PATCH',
                dataType: 'jsonp'
            }).done(function() {
                cb(null, hObj);
            }).fail(function(xhr, status, error) {
                cb(error, null);
            });
        }
    },
    saveOrUpdate : function(cb) {
        var hObj = this;
        if(null === hObj.id) hObj.saveToDb(cb);
        else hObj.updateDb(cb);
    },
    addTransaction : function(date, quantity, cb) {
        var hObj = this;
        if(hObj.transactions.length == 0 && quantity < 0) {
            cb(new Error('Opening transactions must have a quantity larger than 0'), null);
        }
        else {
            new Quote(hObj.symbol).retrieve(function(err, qObj) {
                if(err) cb(err, null);
                else {
                    var trans = new Transaction(new Date(), qObj.last, quantity);
                    trans.saveToDb(function(err, updatedTrans) {
                        if(err) cb(err, updatedTrans);
                        else {
                            var cost = hObj.cost() + updatedTrans.cost();
                            hObj.quantity += Number(updatedTrans.quantity);
                            hObj.costBasis = cost / hObj.quantity;
                            hObj.transactionsDiff.push(updatedTrans.id);
                            hObj.transactions.push(updatedTrans.id);
                            hObj.saveOrUpdate(function(err, holding) {
                                cb(err, updatedTrans);
                            } );
                        }
                    } );
                }
            } );
        }
    },
    gain : function(cb) {
        var hObj = this;
        new Quote(hObj.symbol).retrieve(function(err, qObj) {
            if(err) cb(err, null);
            else {
                var value = hObj.isLong ? (qObj.last - hObj.costBasis) : (hObj.costBasis - qObj.last);
                value *= hObj.quantity;
                cb(err, value);
            }
        } );
    },
    value : function(cb) {
        var hObj = this;
        new Quote(hObj.symbol).retrieve(function(err, qObj) {
            if(err) cb(err, null);
            else cb(err, qObj.last*hObj.quantity);
        } );
    }
}

BindAllHoldingProtos = function(self) {
    self.hasId = Holding.prototype.hasId.bind(self);
    self.toJson = Holding.prototype.toJson.bind(self);
    self.cost = Holding.prototype.cost.bind(self);
    self.saveToDb = Holding.prototype.saveToDb.bind(self);
    self.updateDb = Holding.prototype.updateDb.bind(self);
    self.saveOrUpdate = Holding.prototype.saveOrUpdate.bind(self);
    self.addTransaction = Holding.prototype.addTransaction.bind(self);
    self.gain = Holding.prototype.gain.bind(self);
    self.value = Holding.prototype.value.bind(self);
}
    