'use strict';
var _ = require('lodash');
var rp = require('request-promise');
var Promise = require("bluebird");
var LOGIN = 'https://prodapp.babytrackers.com/session';
var DEVICES = 'https://prodapp.babytrackers.com/account/device';
var TRANSACTION = 'https://prodapp.babytrackers.com/account/transaction';
var USERNAME;
var PASSWORD;
var UUID;
const uuidV4 = require('uuid/v4');
var dateFormat = require('dateformat');
var fs = require('fs');
var syncIdFile;

function BabyHelper(username, password, uuid, syncFile) {
    if(!username || !password ){
        console.error("Pass username and password")
    }
    USERNAME = username;
    PASSWORD = password;
    UUID = uuid;
    syncIdFile = syncFile;
}

BabyHelper.prototype.login = function () {
    var data = {
        AppInfo: { AccountType: 0, AppType: 0 },
        Device: { DeviceName: "Unknown2", DeviceOSInfo: "Nexus 5X OS225", DeviceUUID: UUID },
        EmailAddress: USERNAME,
        Password: PASSWORD
    };
    var self = this;
    return this.postRequest(LOGIN, data).then(function (resp1) {
        return self.getRequest(DEVICES);
    }).then(function (resp2) {
        var deviceList = resp2.body;
        if (deviceList.length > 0) {
            //console.log(deviceList);
            return true;
        } else {
            console.log(deviceList);
            throw new Error("Unable to Retrieve Devices With Session");
            return false;
        }
    }).catch(function (err) {
        console.log(err);

        throw new Error("Unable to Retrieve Session");
    });
};


BabyHelper.prototype.getBabyObject = function (log) {
    var self = this;
    return this.getRequest(DEVICES).then(function (response) {
        var deviceList = response.body;
        var latestTransactions = [];
        for (var i = 0; i < deviceList.length; i++) {
            latestTransactions.push(TRANSACTION + "/" + deviceList[i].DeviceUUID + "/" + (deviceList[i].LastSyncID - 1));
        }
        if(log){
            console.log("latest transactions", latestTransactions);
        }
        return Promise.map(latestTransactions, function (obj) {
            return self.getRequest(obj).then(function (response) {
                var rawTransaction = JSON.parse(Buffer.from(response.body[0].Transaction, 'base64').toString());
                if(log){
                    console.log("RawTransaction: ", rawTransaction)
                }
                return (rawTransaction);
            });
        });
    }).then(function (results) {
        //console.log("Results", results);
        var babyResult = "";
        var latestDate = Date.parse("January 1, 1970");
        for (var i = 0; i < results.length; i++) {

            if (Date.parse(results[i].timestamp) > latestDate) {
                latestDate = Date.parse(results[i].timestamp);
                babyResult = results[i].baby;
            }
        }
        //console.log("BabyResult", babyResult);

        return babyResult;
    }).catch(function (err) {
        console.log(err);
        throw new Error("Unable To Retrieve Baby Object");
    })

};

BabyHelper.prototype.testStuff = function () {
    var self = this;
    this.login().then(function (loginState) {
        return self.getBabyObject(true);
    });
}

BabyHelper.prototype.logDiaper = function (changeType) {
    var self = this;
    return this.login().then(function (loginState) {
        return self.getBabyObject(false);
    }).then(function (babyObj) {

        var myUUID = uuidV4();
        var now = new Date();
        var utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
        var timestamp = dateFormat(utc, "yyyy-mm-dd HH:MM:ss +0000");
        var data = {
            BCObjectType: "Diaper",
            pooColor: 5,
            peeColor: 5,
            texture: 5,
            amount: 2,
            flag: 0,
            status: changeType,
            baby: babyObj,
            note: "",
            pictureLoaded: true,
            pictureNote: [],
            time: timestamp,
            newFlage: true,
            objectID: myUUID,
            timestamp: timestamp
        };
        var json = JSON.stringify(data);
        var dataBuffer = Buffer.from(json).toString("base64");
        var currentSyncId = 0
        try {
            currentSyncId = fs.readFileSync(syncIdFile).toString() ?? 0;
        } catch(e){
            console.log(e)
        }
        var newSyncId = parseInt(currentSyncId) + 1;
        var finalTransaction = {
            OPCode: 0,
            SyncID: newSyncId,
            Transaction: dataBuffer
        };
        console.log("Final transaction", finalTransaction)
        return self.postRequest(TRANSACTION, finalTransaction);
    }).then(function (response) {
        console.log("Logged Diaper Change - " + changeType);
        var currentSyncId = 0;
        try {
            currentSyncId = fs.readFileSync(syncIdFile).toString() ?? 0;
        }
        catch(e){
            console.log(e);
        }
        var newSyncId = parseInt(currentSyncId) + 1;
        fs.writeFileSync(syncIdFile, newSyncId.toString(),{ flag:'w+' });
        return true;
    }).catch(function (err) {
        throw new Error("Unable to Log Diaper Change" + err)
    });
}

BabyHelper.prototype.getRequest = function (url) {
    var options = {
        method: 'GET',
        uri: url,
        resolveWithFullResponse: true,
        json: true,
        jar: true
    };

    return rp(options);
};

BabyHelper.prototype.postRequest = function (url, data) {
    var options = {
        url: url,
        method: "POST",
        resolveWithFullResponse: true,
        json: data,
        jar: true
    };

    return rp(options);
};

module.exports = BabyHelper;
