import {EventEmitter} from 'events'
import t2lib from '@affidaty/t2-lib';
import crypto from 'crypto';

import {
    Devices,
    Iso7816Commands,
    gpDefStaticKeys,
    SCP11,
    CommandApdu,
    Utils,
    ResponseApdu,
    Card,
} from '../src/index';
const hexToArray = Utils.hexToArray;
const arrayToHex = Utils.arrayToHex;

const nodeUrl = 'https://testnet.trinci.net/';
const nodeNetwork = 'QmcvHfPC6XYpgxvJSZQCVBd7QAMEHnLbbK1ytA4McWx5UY';
const trinciClient = new t2lib.Client(nodeUrl, nodeNetwork);

const express = require('express');
const app = express();
const socket = require('socket.io');
const cors = require('cors');
const path = require('path');

const abs = (filePath:any) => {return path.resolve(__dirname, filePath);};

const server = app.listen(3000 ,()=>{
    console.log(`[Server] listening on port 3000, connect to http://localhost:3000`);
});

app.use(cors());

app.get('/',(req:any,res:any)=>{
    res.sendFile(abs('./index.html'));
})

const io =  socket(server, {cors:
        {origin:
            ["http://localhost:8080","http://localhost:3000","https://admin.socket.io","http://localhost:3333"]
        }
    }
);


const parsePinString = (pin: string) => {
    if (/^\d+$/.test(pin)) {
        const result = new Array<number>(0);
        for (let i = 0; i < pin.length; i++) {
            result.push(parseInt(pin[i]));
        }
        return result;
    }
    throw new Error('Only numbers');
}

const importCardPubKey = async(pubKeyRaw: number[]) => {
    const pubKey = new t2lib.ECDSAKey('public');
    await pubKey.setRaw(new Uint8Array(pubKeyRaw));
    return pubKey;
};

const getCardAccountId = async(pubKeyRaw: number[]) => {
    const pubKey = await importCardPubKey(pubKeyRaw);
    const accId = await t2lib.getAccountId(pubKey);
    return accId;
};

const getTxSHA384 = async(tx: t2lib.Transaction) => {
    const txData = Buffer.from(t2lib.Utils.objectToBytes(await tx.data.toUnnamedObject()));
    const hash = crypto.createHash('sha384');
    const data = hash.update(txData);
    return [...data.digest()];
}

const processSignature = (cardSig: number[]) => {
    console.log(`Signature(${cardSig.length}): [${arrayToHex(cardSig)}]`);
    let result = new Array<number>(0);
    let data = cardSig.slice(2);
    const firstLen = data[1];
    data = data.slice(2);
    let first = data.slice(0, firstLen);
    first = first.slice(Math.max(first.length - 48 , 0));
    data = data.slice(firstLen);
    const secondLen = data[1];
    let second = data.slice(2);
    second = second.slice(Math.max(second.length - 48 , 0));
    result = result.concat(first);
    result = result.concat(second);
    return result;
}
// =====================================================================

// device-error (devName, msg)
// card-inserted (devName)
// card-removed (devName)
// command-issued (devName, msg)
// response-received (devName, msg)

// server-side

const ee = new EventEmitter();

const devList: {[key: string]: Card} = {};
const scpList: {[key: string]: SCP11} = {};
const clientList: {[key: string]: any} = {};

const emitToAllClients = (eventName: string, args: any) => {
    // console.log(`trying to send to all cients: [${eventName}]`);
    Object.keys(clientList).forEach((socketId: string) => {
        //clientList[socketId].emit("event",`${eventName} passa da qui`);
        clientList[socketId].emit(eventName, args);
    });
}

/* SOCKET */
io.on('connection', (socket:any)=>{
    clientList[socket.id] = socket;
    console.log('[SERVER] connection from socket id:',socket.id);

    socket.emit('device-list-get', Object.keys(devList));

    socket.on('cmd',async (obj: {devName: string, apdu: string})=>{
        const apdu = obj.apdu;
        const devName = obj.devName;
        console.log(JSON.stringify(obj));
        console.log(Object.keys(devList));
        console.log("APDU",apdu);
        if (typeof devList[devName] == 'undefined') {
            const msg = `Device [${devName}] not found`;
            socket.emit('rsp', msg);
            return;
        }
        let card = devList[devName];

        const privKeyB58 = '9XwbySgVsf1qZvErcMkdGtzDnrDVoRfL6AxQGQ35A2bnCstJbexGjxJKe1UzJzYgyw1W83qzBwdFcccWfmQpPcVGpbTAPQkbCZRMk1HxH3zUyoMppD2ae5R4m7gedbjrwsXnmqdULQBJ44hn2giNSjZ1N39DW7L1CQaU8rFtpYwRTfXGMwP4jwWxq6Daf79GW1PLquMfbGEihu6xiQqmhZUrYmKeNKqoaAqMztWpcZH6hvLBhxxiCq7weXAYZ2wQvFeEqF4HT';
        const importedPrivKey = new t2lib.ECDSAKey('private');
        await importedPrivKey.importBin(new Uint8Array(t2lib.binConversions.base58ToArrayBuffer(privKeyB58)));

        const kp = new t2lib.ECDSAKeyPair();
        kp.privateKey = importedPrivKey;
        kp.publicKey = await importedPrivKey.extractPublic();

        //const select = await card.issueCommand(Iso7816Commands.select('112233445500'));
        // if (!select.isOk()) {
        //     throw new Error(`Coult not select TRINCI applet. Response: [${select.toString()}]`);
        // }

        let data = apdu;

        console.log("[CMD] APDU data:",data);
        let resp: ResponseApdu;
        
        const option = data;

        switch (option) {
            case 'h': case 'H':
                //printHelp();
                break;
            case 'e': case 'E':
                resp = await card.issueCommand(new CommandApdu('80FF000003FF00FF00'));
                socket.emit('rsp',resp.toString());
                console.log(`Response: [${resp.toString()}]`);
                break;
            case 's': case 'S':
                resp = await card.issueCommand(new CommandApdu('80F2000000'));
                if (resp.isOk()) {
                    if (resp.dataLength !== 2) {
                        console.log(`Unknown response: [${resp.toString()}]`);
                    }
                    const stateByte = resp.data[0];
                    console.log(`[${arrayToHex(resp.data)}]`);
                    console.log(`PUK set: [${(stateByte & 0x01) > 0}]`);
                    console.log(`PIN set: [${(stateByte & 0x02) > 0}]`);
                    console.log(`ACC set: [${(stateByte & 0x04) > 0}]`);
                } else {
                    console.log(`Error! Response: [${resp.toString()}]`);
                }
                socket.emit('rsp',resp.toString());
                break;
            case 'ka':
                if (typeof scpList[devName] !== 'undefined') {
                    delete scpList[devName];
                }
                scpList[devName] = new SCP11(devList[devName]).setSecurityLevel(0x3C);
                try {
                    await scpList[devName].initAndAuth();
                } catch (error) {
                    const msg = `Error initializing secure session: ${error}`;
                    socket.emit('rsp', msg);
                }
                devList[devName].setCommandTransformer(scpList[devName].commandAuthenticator);
                devList[devName].setResponseTransformer(scpList[devName].responseAuthenticator);
                // console.log('==========================');
                // console.log(`Secure session initialized`);
                // console.log('==========================');
                socket.emit('rsp',"Secure session initialized");
                
                break;
                
            case 'PUK':
                let pukByteArray;
                try {
                    // pukByteArray = parsePinString(prompt('New PUK: '));
                    pukByteArray = parsePinString('0123456789');   
                } catch (error) {
                    console.log(`${error}`);
                    break;
                }

                resp = await card.issueCommand(Iso7816Commands.changeRefData(0, pukByteArray).setCla(0x80));
                if (resp.isOk()) {
                    // // pukByteArray = parsePinString('0123456788');
                    resp = await card.issueCommand(Iso7816Commands.changeRefData(0, pukByteArray).setCla(0x80));
                    if (resp.isOk()) {
                        console.log(`Success! [${resp.toString()}]`);
                    } else {
                        console.log(`Error! Response: [${resp.toString()}]`);
                    }
                } else {
                    console.log(`Error! Response: [${resp.toString()}]`);
                }
                socket.emit('rsp',resp.toString());
                break;
            case 'puk':
                let pukByteArray2;
                try {
                    // pukByteArray2 = parsePinString(prompt('Input PUK: '));
                    pukByteArray2 = parsePinString('0123456789');
                } catch (error) {
                    console.log(`${error}`);
                    break;
                }
                resp = await card.issueCommand(Iso7816Commands.verifyRefData(0, pukByteArray2).setCla(0x80));
                if (resp.isOk()) {
                    console.log(`Success! [${resp.toString()}]`);
                } else {
                    console.log(`Error! Response: [${resp.toString()}]`);
                }
                socket.emit('rsp',resp.toString());
                break;
            case 'pukw':
                let pukByteArray3;
                try {
                    // pukByteArray2 = parsePinString(prompt('Input PUK: '));
                    pukByteArray3 = parsePinString('0000000000');
                } catch (error) {
                    console.log(`${error}`);
                    break;
                }
                resp = await card.issueCommand(Iso7816Commands.verifyRefData(0, pukByteArray3).setCla(0x80));
                if (resp.isOk()) {
                    console.log(`Success! [${resp.toString()}]`);
                } else {
                    console.log(`Error! Response: [${resp.toString()}]`);
                }
                socket.emit('rsp',resp.toString());
                break;
            case 'PIN':
                let pinByteArray;
                try {
                    // pinByteArray = parsePinString(prompt('New PIN: '));
                    pinByteArray = parsePinString('0123');   
                } catch (error) {
                    console.log(`${error}`);
                    break;
                }
                resp = await card.issueCommand(Iso7816Commands.changeRefData(1, pinByteArray).setCla(0x80));
                if (resp.isOk()) {
                    // pinByteArray = parsePinString('0122');   
                    resp = await card.issueCommand(Iso7816Commands.changeRefData(1, pinByteArray).setCla(0x80));
                    if (resp.isOk()) {
                        console.log(`Success! [${resp.toString()}]`);
                    } else {
                        console.log(`Error! Response: [${resp.toString()}]`);
                    }
                } else {
                    console.log(`Error! Response: [${resp.toString()}]`);
                }
                socket.emit('rsp',resp.toString());
                break;
            case 'pin':
                let pinByteArray2;
                try {
                    // pinByteArray2 = parsePinString(prompt('Input PIN: '));
                    pinByteArray2 = parsePinString('0123');
                } catch (error) {
                    console.log(`${error}`);
                    break;
                }
                resp = await card.issueCommand(Iso7816Commands.verifyRefData(1, pinByteArray2).setCla(0x80));
                if (resp.isOk()) {
                    console.log(`Success! [${resp.toString()}]`);
                } else {
                    console.log(`Error! Response: [${resp.toString()}]`);
                }
                socket.emit('rsp',resp.toString());
                break;
            case 'pinw':
                let pinByteArrayW;
                try {
                    pinByteArrayW = parsePinString('1234');
                } catch (error) {
                    console.log(`${error}`);
                    break;
                }
                resp = await card.issueCommand(Iso7816Commands.verifyRefData(1, pinByteArrayW).setCla(0x80));
                if (resp.isOk()) {
                    console.log(`Success! [${resp.toString()}]`);
                } else {
                    console.log(`Error! Response: [${resp.toString()}]`);
                }
                socket.emit('rsp',resp.toString());
                break;
            case 'gen':
                resp = await card.issueCommand(new CommandApdu('8002000000'));
                if (resp.isOk()) {
                    console.log('Success!');
                } else {
                    console.log(`Error! Response: [${resp.toString()}]`);
                }
                socket.emit('rsp',resp.toString());
                break;
            case 'imp':
                const priv = kp.privateKey;
                const pub = kp.publicKey;

                console.log(`Generated account: [${await t2lib.getAccountId(pub)}]`);

                const privKeyJWK = await priv.getJWK();

                const d = [...t2lib.binConversions.base64urlToBuffer(privKeyJWK.d!)];

                const pubRaw = [...await pub.getRaw()];

                const cmd = new CommandApdu('8003000000').setData(d.concat(pubRaw));
                resp = await card.issueCommand(cmd);
                if (resp.isOk()) {
                    console.log('Success!');
                } else {
                    console.log(`Error! Response: [${resp.toString()}]`);
                }
                socket.emit('rsp',resp.toString());
                break;
            case 'id':
                resp = await card.issueCommand(new CommandApdu('8012000000'));
                if (resp.isOk()) {
                    const accId = await getCardAccountId(resp.data);
                    socket.emit('rsp',accId);
                    console.log(`Card Account: ${accId}`);
                } else {
                    console.log(`Error! Response: [${resp.toString()}]`);
                    socket.emit('rsp',resp.toString());
                }                        
                break;
            case 'tr':
                resp = await card.issueCommand(new CommandApdu('8012000000'));
                let pubKey: t2lib.ECDSAKey;
                let accId: string;
                if (resp.isOk()) {
                    pubKey = await importCardPubKey(resp.data);
                    accId = await t2lib.getAccountId(pubKey);
                    console.log('Card public key imported;');
                    console.log(`Card account ID: ${accId}`);
                } else {
                    console.log(`Error! Response: [${resp.toString()}]`);
                    socket.emit('rsp',resp.toString());
                    break;
                }
                // const to = prompt('To: ');
                const to = '#Affidaty';
                // const amount = parseInt(prompt('Amount: '));
                const amount = 100;
                const tx = new t2lib.UnitaryTransaction();
                tx.data.genNonce();
                tx.data.accountId = '#EURS';
                tx.data.maxFuel = 1000;
                tx.data.networkName = trinciClient.network;
                tx.data.smartContractMethod = 'transfer';
                tx.data.smartContractMethodArgs = {
                    from: accId,
                    to,
                    units: amount,
                }
                tx.data.signerPublicKey = pubKey;
                const txSHA384 = await getTxSHA384(tx);
                resp = await card.issueCommand(new CommandApdu('8013000000').setData(txSHA384));
                if (resp.isOk()) {
                    tx.signature = new Uint8Array(processSignature(resp.data));
                    console.log(await tx.toUnnamedObject());
                    if (await tx.verify()) {
                        console.log('Valid!');
                        socket.emit('rsp',resp.toString());
                        break;
                        // const ticket = await trinciClient.submitTx(tx);
                        // const rec = await trinciClient.waitForTicket(ticket);
                        // console.log(`Success: ${rec.success}`);
                    } else {
                        console.log('Error: not valid!');
                        break;
                    }
                } else {
                    console.log(`Error! Response: [${resp.toString()}]`);
                    socket.emit('rsp',resp.toString());
                    break;
                }
                
                break;
            case 'debug':
                let cmdX = new CommandApdu('8099000000');
                //let cmdX = secureSession.authenticator(new CommandApdu('8099000000'))
                resp = await card.issueCommand(cmdX);
                if (resp.isOk()) {
                    console.log('Success!');
                } else {
                    console.log(`Error! Response: [${resp.toString()}]`);
                }
                socket.emit('rsp',resp.toString());
                break;
            // case 'stress':
            //     try {
            //         await secureSession.initAndAuth();
            //     } catch (error) {
            //         throw new Error(`Error initializing secure session: ${error}`);
            //     }
            //     card.setCommandTransformer(secureSession.commandAuthenticator);
            //     card.setResponseTransformer(secureSession.responseAuthenticator);
            //     console.log('==========================');
            //     console.log(`Secure session initialized`);
            //     console.log('==========================');

            //     const sleep = (ms: number) => {
            //         return new Promise((resolve) => {
            //             setTimeout(() => {
            //                 resolve(1);
            //             }, ms);
            //         })
            //     }
            //     const testCmd = new CommandApdu('80FF000003FF00FF00');
            //     let count = 0;
            //     let timer = new Utils.TimeMonitor();
            //     while(true) {
            //         timer.start();
            //         resp = await card.issueCommand(testCmd);
            //         const ms = timer.stop();
            //         if(!resp.isOk()) {
            //             break;
            //         }
            //         count++;
            //         console.log(`Count: [${count}](time: ${ms}ms)`);
            //     }


            //     // let testCmd = new CommandApdu('80dd000003ff00ff00');
            //     // await card.issueCommand(testCmd);
            //     break;
            default:
                break;
        }
    });

    socket.on('cmd-custom', async(obj:{devName:string,apdu:string})=>{
        
    });

    socket.on('device-list-get',(socket:any)=>{
        //emitToAllClients('device-list-get', devList);
    });

    socket.on('disconnect',(socket:any)=>{
        delete clientList[socket.id];
        console.log('[Socket]'+ socket +' disconnected');
    });
});



ee.on('device-error', (devName, msg) => {
    emitToAllClients('device-error', {devName, msg});
})

ee.on('card-inserted', async (devName) => {
    emitToAllClients('card-inserted', devName);
    emitToAllClients('device-list-get', Object.keys(devList));
    if (typeof devList[devName] !== 'undefined') {
        devList[devName].setAutoGetResponse();
        let res = await devList[devName].issueCommand(Iso7816Commands.select('112233445500'));
    }
    if (typeof scpList[devName] !== 'undefined') {
        delete scpList[devName];
    }
})

ee.on('card-removed', (devName) => {
    if (typeof devList[devName] !== 'undefined') {
        delete devList[devName];
    }
    if (typeof scpList[devName] !== 'undefined') {
        delete scpList[devName];
    }
    emitToAllClients('card-removed', devName);
    emitToAllClients('device-list-get', Object.keys(devList));
})

ee.on('command-issued', (devName, msg) => {
    emitToAllClients('command-issued', {devName, msg});
})

ee.on('response-received', (devName, msg) => {
    emitToAllClients('response-received', {devName, msg});
})

// PCSCD events handling
const pcscDevices = new Devices();

pcscDevices.on('device-deactivated', (event => {
    const device = event.device;
    const devName = device.name;
    ee.emit('card-removed', devName);
}));

pcscDevices.on('device-activated', (event => {
    const device = event.device;
    const devName = device.name;

    device.on('error', (error) => {
        const msg = `${error.message}`;
        ee.emit('device-error', devName, msg);
    })

    device.on('card-removed', (event) => {
        if (!event.card) {
            return;
        }
        let card = event.card;
        ee.emit('card-removed', devName);
    });

    device.on('card-inserted', async (event) => {
        if (!event.card) {
            return;
        }
        let card = event.card;
        card.on('command-issued', ({ card, command }) => {
            const msg = `[${command.toString()}]`;
            ee.emit('command-issued', devName, msg);
        });
        card.on('response-received', ({ card, command, response }) => {
            const msg = `[${response.toString()}](${response.meaning()})`;
            ee.emit('response-received', devName, msg);
        });
        devList[devName] = card;
        ee.emit('card-inserted', devName);
    });
}));