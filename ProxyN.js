/**
 * Created by maweiyi on 7/18/16.
 */
var express = require('express');
var net = require('net');
var bodyParser = require('body-parser');
var app = express();
var router = express.Router();
var Pool = require('./Pool');
var async = require('async');
var Buffer = require('buffer').Buffer;
var event = require('events').EventEmitter;
var ee = new event();
var pool = new Pool(100);
pool.factory(function (IP, PORT) {
    return net.connect(IP, PORT);
});

app.use(bodyParser.json());
app.use('/', router.post('/', function (req, res) {
    var requestArr = [];
   // console.log(req.body);
    var data = req.body;
    data["ne"].map(function (value) {
        requestArr.unshift(value);
    });
    connectTheServer(requestArr, res, requestArr.length);

}));

app.listen(3000, function () {
    console.log("服务器连接已建立!");
});



//var okState = "ok";
function connectTheServer(requestArr, res, len) {

    while (requestArr.length != 0) {
        var p1 = requestArr.shift();
        console.log(p1["port"]);
        pool.allocate(p1["host"], p1["port"], function (err , connect) {
            if (err) {
                    ee.emit("pp", "发生了错误");
            } else {

                connect.setTimeout(1000, function () {
                    ee.emit("pp", "没有接收到数据")
                });

               // connect.write("1111");
                sendDatas(connect);
                connect.on("data", listenData);

                function listenData(data) {
                    ee.emit("pp", data);
                    connect.removeListener("data", listenData);

            }
        }
                })}
    var kk = [];
    function sendData(data) {
        kk.push(data);
       // console.log(kk);
        if (kk.length == len) {
            console.log(kk);
            res.send(JSON.stringify({value: kk}));
            ee.removeListener("pp", sendData);
        }

    }
    ee.on("pp", sendData)

}

//向服务端发送自己定义的变长数据
//定义一个特殊的字符来表示我已经发送完成了

var msg_add = new Buffer(['1', 11]);
var msg_set = new Buffer(['2', 22]);
var msg_del = new Buffer(['3', 33]);

//定义一个发送完成的标志
var okState = new Buffer([0]);

function sendDatas(connection) {

    var i = 0;

    do {
        connection.write(msg_add);
        connection.write(msg_set);
        connection.write(msg_del);
        i++;

    } while (i < 3);
    //数据发送完成
   connection.write(okState);
}

