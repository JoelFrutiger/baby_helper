var BabyHelper = require('./baby_helper.js');
// you might want to change this.
var UUID = 'f7cdc154-c1b6-4c49-b8f6-051783cf8a85';
var syncIdFile = "/tmp/babytracker-syncid"
var babyHelper = new BabyHelper(process.argv[2], process.argv[3], UUID, syncIdFile);
var dateFormat = require('dateformat');
var lastEvent = new Date("January 01, 2000 00:00:00");
var express = require("express");
var app = express();
app.listen(3000, () => {
 console.log("Server running on port 3000");
});

app.get("/poo", (req, res, next) => {
    if(checkBtnPress()){
        babyHelper.logDiaper('1');
        res.sendStatus(200);
    }
    else{
        res.sendStatus(500);
    }
});

app.get("/pee", (req, res, next) => {
    if(checkBtnPress()){
        babyHelper.logDiaper(0);
        res.sendStatus(200);
    }
    else{
        res.sendStatus(500);
    }
});

app.get("/mixed", (req, res, next) => {
    if(checkBtnPress()){
        babyHelper.logDiaper('2');
        res.sendStatus(200);
    }
    else{
        res.sendStatus(500);
    }
});

app.get("/test", (req, res, next) => {
    babyHelper.testStuff();
    res.sendStatus(200);
});

function checkBtnPress() {
    var now = new Date();
    var checkTime = new Date(lastEvent.getTime() + 1000 * 60);
    if (checkTime > now) {
        console.log("Duplicate Button Press", checkTime);
        return false;
    } else {
        var timestamp = dateFormat(now, "yyyy-mm-dd HH:MM:ss");
        lastEvent.setTime(now.getTime());
        return timestamp;
    }
}