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

app.post('/lc', async(req, res) =>{
    var cert = req.body.cert;
    var creditid = req.body.creditid;
    var owner = req.body.owner;
    var flightid = req.body.flightid;
    var weight = req.body.weight;
    var price = req.body.price;

    console.log("/lc post start -- ", cert, creditid, owner, flightid, weight, price);
    const gateway = new Gateway();

    try {
        const wallet = await buildWallet(Wallets, walletPath);
		// GW -> connect -> CH -> CC -> submitTransaction

        await gateway.connect(ccp, {
            wallet,
            identity: cert,
            discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
        });
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("lc");
        await contract.submitTransaction('RegisterCredit',creditid, owner, flightid, weight, price);

    } catch (error) {
        var result = `{"result":"fail", "message":"tx has NOT submitted"}`;
        var obj = JSON.parse(result);
        console.log("/lc end -- failed ", error);
        res.status(200).send(obj);
        return;
    }finally {
         gateway.disconnect();
    }

    var result = `{"result":"success", "message":"tx has submitted"}`;
    var obj = JSON.parse(result);
    console.log("/lc end -- success");
    res.status(200).send(obj);
});

app.get('/lc', async(req, res) =>{
    var cert = req.query.cert;
    var creditid = req.query.creditid;

    //var userkey = req.query.userkey;
    console.log("/lc get start -- ", cert, creditid);
    const gateway = new Gateway();

    try {
        const wallet = await buildWallet(Wallets, walletPath);
		// GW -> connect -> CH -> CC -> submitTransaction
        await gateway.connect(ccp, {
            wallet,
            identity: cert,
            discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed 
        });
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("lc");
        var result = await contract.evaluateTransaction('ReadCredit',creditid);
        // result 가 byte array라고 생각하고
        var result = `{"result":"success", "message":${result}}`;
        console.log("/lc get end -- success", result);
        var obj = JSON.parse(result);
        res.status(200).send(obj);
    } catch (error) {
        var result = `{"result":"fail", "message":"ReadCredit has a error"}`;
        var obj = JSON.parse(result);
        console.log("/lc get end -- failed ", error);
        res.status(200).send(obj);
        return;
    } finally {
        gateway.disconnect();
    }
});

app.post('/lc/tx', async(req, res) =>{
    var cert = req.body.cert;
    var creditid = req.body.creditid;
    var owner = req.body.owner;

    console.log("/lc/tx post start -- ", cert, creditid,owner);
    const gateway = new Gateway();

    try {
        const wallet = await buildWallet(Wallets, walletPath);
		// GW -> connect -> CH -> CC -> submitTransaction
        await gateway.connect(ccp, {
            wallet,
            identity: cert,
            discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
        });
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("lc");
        await contract.submitTransaction('TransferCredit', creditid, owner);

    } catch (error) {
        var result = `{"result":"fail", "message":"tx has NOT submitted"}`;
        var obj = JSON.parse(result);
        console.log("/lc/tx end -- failed ", error);
        res.status(200).send(obj);
        return;
    }finally {
         gateway.disconnect();
    }

    var result = `{"result":"success", "message":"tx has submitted"}`;
    var obj = JSON.parse(result);
    console.log("/lc/tx end -- success");
    res.status(200).send(obj);
});

app.get('/lc/history', async(req, res) =>{
    var cert = req.query.cert;
    var creditid = req.query.creditid;

    //var userkey = req.query.userkey;
    console.log("/lc get start -- ", creditid);
    const gateway = new Gateway();
    try {
        const wallet = await buildWallet(Wallets, walletPath);
		// GW -> connect -> CH -> CC -> submitTransaction
        await gateway.connect(ccp, {
            wallet,
            identity: cert,
            discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed 
        });
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("lc");
        var result = await contract.evaluateTransaction('GetCreditHistory',creditid);
        // result 가 byte array라고 생각하고
        var result = `{"result":"success", "message":${result}}`;
        console.log("/lc/history get end -- success", result);
        var obj = JSON.parse(result);
        res.status(200).send(obj);
    } catch (error) {
        var result = `{"result":"fail", "message":"GetCreditHistory has a error"}`;
        var obj = JSON.parse(result);
        console.log("/lc/history get end -- failed ", error);
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