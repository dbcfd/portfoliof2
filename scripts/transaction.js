function Transaction(date, price, quantity) {
    this.date = date;
    this.price = price;
    this.quantity = quantity;
    this.id = null;
}

function RetrieveTransactionFromDb(id, cb) {
    $.ajax({
        url: TransactionsUrl + '/' + id + '?jsonp=?',
        dataType : 'jsonp'
    }).done(function (jsonObj) {
        var trans = new Transaction(new Date(jsonObj.Date), jsonObj.Price, jsonObj.Quantity);
        trans.id = id;
        cb(null, trans);
    }).error(function (err) {
        cb(err, null);
    });
}

Transaction.prototype = {
    toJson : function () {
        return '{"Date":"' + this.date.toString() + '","Price":' + this.price + ',"Quantity":' + this.quantity + ',"ObjectType":"Transaction"}';
    },
    cost : function () {
        return this.price * this.quantity;
    },
    saveToDb : function (cb) {
        var tObj = this;
        var json = this.toJson();
        $.ajax({
            url: TransactionUrl,
            data: json,
            type: 'POST',
            crossDomain: true
        }).done(function (jsStr) {
            var jsonObj = JSON.parse(jsStr);
            tObj.id = jsonObj.Key;
            cb(null, tObj);
        }).error(function (err) {
            cb(err, null);
        });
    },
    removeFromDb : function (cb) {
        $.ajax({
            url: TransactionUrl + this.id + '?jsonp=?',
            type: 'DELETE',
            dataType: 'jsonp'
        }).done(function () {
            cb(null);
        }).error(function (err) {
            cb(err);
        });
    }
};