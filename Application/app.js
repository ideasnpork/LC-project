'use strict';

var express = require('express');
const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');

const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('./javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('./javascript/AppUtil.js');

var app = express();

var path = require('path');
var fs = require('fs');

// static /public -> ./public
app.use('/public', express.static(path.join(__dirname,'public')));

// body-parser app.use
app.use(express.urlencoded({ extended : false}));
app.use(express.json());

const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');

const ccp = buildCCPOrg1();
const caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');


app.post('/user', async(req, res) => {
    var name = req.body.name;
    var department = req.body.department;

    console.log("/user start -- ", name, department);

    try {
        const wallet = await buildWallet(Wallets, walletPath);
		//await enrollAdmin(caClient, wallet, mspOrg1); // wallet/admin.id
		await registerAndEnrollUser(caClient, wallet, mspOrg1, name, department); // wallet/${name}.id
    } catch (error) {
        var result = `{"result":"fail", "id":"${name}", "affiliation":"${department}"}`;
        var obj = JSON.parse(result);
        console.log("/user end -- failed");
        res.status(200).send(obj);
        //선생님이 생각해내셨습니다.
        return;
    }

    var result = `{"result":"success", "id":"${name}", "affiliation":"${department}"}`;
    var obj = JSON.parse(result);
    console.log("/user end -- success");
    res.status(200).send(obj);

});

app.post('/admin', async(req, res) => {

    console.log("/admin start -- ");

    try {
        const wallet = await buildWallet(Wallets, walletPath);
		await enrollAdmin(caClient, wallet, mspOrg1); // wallet/admin.id
    } catch (error) {
        var result = `{"result":"fail", "id":"admin"}`;
        var obj = JSON.parse(result);
        console.log("/admin end -- failed");
        res.status(200).send(obj);
        return;
    }

    var result = `{"result":"success", "id":"admin"}`;
    var obj = JSON.parse(result);
    console.log("/admin end -- success");
    res.status(200).send(obj);

});

app.get('/user/list', async(req, res) => {

    console.log("/user/list start -- ");

    let wlist;
    try {
        const wallet = await buildWallet(Wallets, walletPath);
        wlist = await wallet.list();

    } catch (error) {
        var result = `{"result":"fail", "id":{"/user/list"}}`;
        var obj = JSON.parse(result);
        console.log("/user/list end -- failed");
        res.status(200).send(obj);
        return;
    }

    var result = `{"result":"success", "id":"${wlist}"}`;
    var obj = JSON.parse(result);
    console.log("/user/list end -- success");
    res.status(200).send(obj);

});

app.post('/marble', async(req, res) =>{
    var name = req.body.name;
    var color = req.body.color;
    var size = req.body.size;
    var owner = req.body.owner;

    console.log("/marble post start -- ", name, color, size, owner);
    const gateway = new Gateway();

    try {
        const wallet = await buildWallet(Wallets, walletPath);
		// GW -> connect -> CH -> CC -> submitTransaction

        await gateway.connect(ccp, {
            wallet,
            identity: "appUser2",
            discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
        });
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("marble");
        await contract.submitTransaction('InitMarble',name, color, size, owner);

    } catch (error) {
        var result = `{"result":"fail", "message":"tx has NOT submitted"}`;
        var obj = JSON.parse(result);
        console.log("/marble end -- failed ", error);
        res.status(200).send(obj);
        return;
    }finally {
         gateway.disconnect();
    }

    var result = `{"result":"success", "message":"tx has submitted"}`;
    var obj = JSON.parse(result);
    console.log("/marble end -- success");
    res.status(200).send(obj);
});

app.get('/marble', async(req, res) =>{
    var name = req.query.name;
    //var userkey = req.query.userkey;
    console.log("/marble get start -- ", name);
    const gateway = new Gateway();

    try {
        const wallet = await buildWallet(Wallets, walletPath);
		// GW -> connect -> CH -> CC -> submitTransaction
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser2",
            discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed 
        });
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("marble");
        var result = await contract.evaluateTransaction('ReadMarble',name);
        // result 가 byte array라고 생각하고
        var result = `{"result":"success", "message":${result}}`;
        console.log("/marble get end -- success", result);
        var obj = JSON.parse(result);
        res.status(200).send(obj);
    } catch (error) {
        var result = `{"result":"fail", "message":"ReadMarble has a error"}`;
        var obj = JSON.parse(result);
        console.log("/marble get end -- failed ", error);
        res.status(200).send(obj);
        return;
    } finally {
        gateway.disconnect();
    }
});

app.post('/marble/tx', async(req, res) =>{
    var name = req.body.name;
    var owner = req.body.owner;

    console.log("/marble/tx post start -- ", name, owner);
    const gateway = new Gateway();

    try {
        const wallet = await buildWallet(Wallets, walletPath);
		// GW -> connect -> CH -> CC -> submitTransaction
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser2",
            discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
        });
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("marble");
        await contract.submitTransaction('TransferMarble',name, owner);

    } catch (error) {
        var result = `{"result":"fail", "message":"tx has NOT submitted"}`;
        var obj = JSON.parse(result);
        console.log("/marble/tx end -- failed ", error);
        res.status(200).send(obj);
        return;
    }finally {
         gateway.disconnect();
    }

    var result = `{"result":"success", "message":"tx has submitted"}`;
    var obj = JSON.parse(result);
    console.log("/marble/tx end -- success");
    res.status(200).send(obj);
});

app.get('/marble/history', async(req, res) =>{
    var name = req.query.name;
    //var userkey = req.query.userkey;
    console.log("/marble get start -- ", name);
    const gateway = new Gateway();
    try {
        const wallet = await buildWallet(Wallets, walletPath);
		// GW -> connect -> CH -> CC -> submitTransaction
        await gateway.connect(ccp, {
            wallet,
            identity: "appUser2",
            discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed 
        });
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("marble");
        var result = await contract.evaluateTransaction('GetMarbleHistory',name);
        // result 가 byte array라고 생각하고
        var result = `{"result":"success", "message":${result}}`;
        console.log("/marble/history get end -- success", result);
        var obj = JSON.parse(result);
        res.status(200).send(obj);
    } catch (error) {
        var result = `{"result":"fail", "message":"GetMarbleHistory has a error"}`;
        var obj = JSON.parse(result);
        console.log("/marble/history get end -- failed ", error);
        res.status(200).send(obj);
        return;
    } finally {
        gateway.disconnect();
    }
});

app.get('/', (req,res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// server listen
app.listen(3000, () => {
    console.log('Express server is started: 3000');
});