import {EventEmitter} from 'events'
import path from 'path';
import crypto from 'crypto';
import Express from 'express';
import { Server as SocketServer, Socket } from 'socket.io';
import cors from 'cors';
import t2lib from '@affidaty/t2-lib';
import {
    Devices,
    Iso7816Commands,
    SCP11,
    CommandApdu,
    Utils,
    ResponseApdu,
    Card,
} from '../../src/index';

const hexToArray = Utils.hexToArray;
const arrayToHex = Utils.arrayToHex;
const abs = ( filePath: string ) => {
    return path.resolve(__dirname, filePath);
};

const timer = new Utils.TimeMonitor();

const LISTEN_PORT = 3000;
const TRINCI_AID = '4299999900';
const nodeUrl = 'https://testnet.trinci.net/';
const nodeNetwork = 'QmcvHfPC6XYpgxvJSZQCVBd7QAMEHnLbbK1ytA4McWx5UY';
const trinciClient = new t2lib.Client(nodeUrl, nodeNetwork);

const serverEvents = new EventEmitter();

/** List of connected cards identified by device name */
const cardList: {[key: string]: Card} = {};
/** List of established secure sessions */
const scpList: {[key: string]: SCP11} = {};
/** List of al currently connected clients */
const clientList: {[key: string]: Socket} = {};

const server = Express()
    .use(cors())
    .get('/', (req, res) => {
        res.sendFile(abs('./index.html'));
    })
    .listen(LISTEN_PORT, '0.0.0.0' ,()=>{
        console.log(`Server listening on port 3000, connect to http://localhost:3000`);
    })

const io = new SocketServer(
    server,
    {
        cors: {
            origin: ["http://localhost:3000","https://admin.socket.io"],
        }
    }
);

const emitToAllClients = (eventName: string, ...args: any[]) => {
    Object.keys(clientList).forEach((socketId: string) => {
        clientList[socketId].emit(eventName, ...args);
    });
}

const getDevListWithScp = () => {
    const result: [string, string][] = [];
    const devNames = Object.keys(cardList);
    for (let i = 0; i < devNames.length; i += 1) {
        const devName = devNames[i];
        const elem: [string, string] = [devName, ''];
        if (typeof scpList[devName] !== 'undefined') {
            elem[1] = scpList[devName].protocolVersion.toString();
        }
        result.push(elem);
    }
    return result;
}

// =================================================================================================
// Misc functions
// =================================================================================================

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

// =================================================================================================
// Client events capturing
// =================================================================================================

io.on('connection', (socket)=>{
    clientList[socket.id] = socket;
    console.log(`Client ${socket.id} connected`);

    socket.emit('device-list-update', getDevListWithScp());

    socket.on('cmd',async (obj: {devName: string, apdu: string})=>{
        const apdu = obj.apdu;
        const devName = obj.devName;
        console.log(JSON.stringify(obj));
        console.log(Object.keys(cardList));
        console.log("APDU",apdu);
        if (typeof cardList[devName] == 'undefined') {
            const msg = `Device [${devName}] not found`;
            socket.emit('rsp', msg);
            return;
        }
        let card = cardList[devName];
        if (card.isBusy()) {
            socket.emit('rsp', `Device [${devName}] is busy`);
            return;
        }

        const privKeyB58 = '9XwbySgVsf1qZvErcMkdGtzDnrDVoRfL6AxQGQ35A2bnCstJbexGjxJKe1UzJzYgyw1W83qzBwdFcccWfmQpPcVGpbTAPQkbCZRMk1HxH3zUyoMppD2ae5R4m7gedbjrwsXnmqdULQBJ44hn2giNSjZ1N39DW7L1CQaU8rFtpYwRTfXGMwP4jwWxq6Daf79GW1PLquMfbGEihu6xiQqmhZUrYmKeNKqoaAqMztWpcZH6hvLBhxxiCq7weXAYZ2wQvFeEqF4HT';
        const importedPrivKey = new t2lib.ECDSAKey('private');
        await importedPrivKey.importBin(new Uint8Array(t2lib.binConversions.base58ToArrayBuffer(privKeyB58)));

        const kp = new t2lib.ECDSAKeyPair();
        kp.privateKey = importedPrivKey;
        kp.publicKey = await importedPrivKey.extractPublic();

        console.log(`AccID: [${await t2lib.getAccountId(kp.publicKey)}]`);

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
                let elapsedTime = 0;
                if (typeof scpList[devName] !== 'undefined') {
                    delete scpList[devName];
                }
                cardList[devName].setCommandTransformer();
                cardList[devName].setResponseTransformer();
                emitToAllClients('device-list-update', getDevListWithScp());
                scpList[devName] = new SCP11(cardList[devName]).setSecurityLevel(0x3C);
                try {
                    
                    timer.start();
                    await scpList[devName].initAndAuth();
                    elapsedTime = timer.stop();
                    console.log(`Time elapsed: ${elapsedTime} ms`);
                } catch (error) {
                    const msg = `Error initializing secure session: ${error}`;
                    socket.emit('rsp', msg);
                    return;
                }
                cardList[devName].setCommandTransformer(scpList[devName].commandAuthenticator);
                cardList[devName].setResponseTransformer(scpList[devName].responseAuthenticator);
                emitToAllClients('device-list-update', getDevListWithScp());
                // console.log('==========================');
                // console.log(`Secure session initialized`);
                // console.log('==========================');
                socket.emit('rsp',`Secure session initialized in ${elapsedTime} ms`);
                break;
            case 'PUK':
                let pukByteArray;
                try {
                    // pukByteArray = parsePinString(prompt('New PUK: '));
                    pukByteArray = [0x31, 0x31, 0x31, 0x31, 0x31, 0x31, 0x31, 0x31, 0x31, 0x31];   
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
                    pukByteArray2 = [0x31, 0x31, 0x31, 0x31, 0x31, 0x31, 0x31, 0x31, 0x31, 0x31];
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
            case 'puke':
                resp = await card.issueCommand(Iso7816Commands.verifyRefData(0, []).setCla(0x80));
                if (resp.isOk()) {
                    console.log(`Success! [${resp.toString()}]`);
                } else {
                    console.log(`Error! Response: [${resp.toString()}]`);
                }
                socket.emit('rsp', resp.toString());
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
                    pinByteArray = [0x31, 0x31, 0x31, 0x31];
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
                    pinByteArray2 = [0x31, 0x31, 0x31, 0x31];
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
            case 'pine':
                resp = await card.issueCommand(Iso7816Commands.verifyRefData(1, []).setCla(0x80));
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
            case 'debug': {
                    // const debugData = hexToArray('a60e850220009902110087018895013c'); // 2 byte, 00ff
                    // const debukgData = hexToArray('a609810100800100810100'); // 2 byte, 00ff
                    // const debugData = hexToArray('5FFF4900'); // 2 byte, 00ff
                    // const debugData = hexToArray('5f4981FF'); // 2 byte, 00ff
                    // const debugData = hexToArray('5f4982ffff'); // 3 byte ffff
                    // const debugData = hexToArray('5f4983ffffff'); // 3 byte ffff
                    // const debugData = hexToArray('5f494104054158cb9b5754ea722a8725608f28fda2d8c88b099231ad8cae077629f6b2f9405a0700f6ce6514894f32545b41867b0fa00c80882f64f5650185ed33a2e4ada60d8001888101209002110095013c5f50005f50005f5000');
                    const debugData = hexToArray('a60d8001888101209002110095013c5f494104054158cb9b5754ea722a8725608f28fda2d8c88b099231ad8cae077629f6b2f9405a0700f6ce6514894f32545b41867b0fa00c80882f64f5650185ed33a2e4ad');
                    // const debugData = hexToArray('ffffff');
                    //let cmdX = new CommandApdu(`8099000005${arrayToHex(debugData)}00`);//.setData(debugData);
                    let cmdX = new CommandApdu(`809900000000`).setData(debugData);
                    timer.start();
                    resp = await card.issueCommand(cmdX);
                    const elapsedTime = timer.stop();
                    console.log(`Time elapsed: ${elapsedTime} ms`);

                    socket.emit('rsp',`[${elapsedTime} ms]: ${resp.toString()}`);

                    break;
                }
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
        //
        let cmdX = new CommandApdu(obj.apdu);
        //let cmdX = secureSession.authenticator(new CommandApdu('8099000000'))
        let card = cardList[obj.devName];
        let resp = await card.issueCommand(cmdX);
        if (resp.isOk()) {
            console.log('Success!');
        } else {
            console.log(`Error! Response: [${resp.toString()}]`);
        }
        socket.emit('rsp',resp.toString());
    });

    // socket.on('device-list-update',(socket)=>{
    //     emitToAllClients('device-list-update', getDevListWithScp());
    // });

    socket.on('disconnect',(reason)=>{
        if (typeof clientList[socket.id] !== 'undefined') {
            delete clientList[socket.id];
        }
        console.log(`Client ${socket.id} disconnected; Reason: ${reason}`);
    });
});

// =================================================================================================
// Server events management
// =================================================================================================

/*
events emitted to clients:
'device-error', devName: string, msg: string
'card-inserted', devName: string
'device-list-update', devList: [devName: string, scpProtocol: string][]
'card-removed', devName: string
'command-issued', devName: string, cmd: string
'response-received', devName: string, rsp: string, meaning: string
*/

/*
server events:
'device-error', devName: string, msg: string
'card-inserted', devName: string, card: Card
'card-removed', devName: string
'command-issued', devName: string, cmd: string
'response-received', devName: string, rsp: string, meaning: string
*/

serverEvents.on('device-error', (devName: string, msg: string) => {
    emitToAllClients('device-error', devName, msg);
    emitToAllClients('device-list-update', getDevListWithScp());
})

serverEvents.on('card-inserted', async (devName: string, card: Card) => {
    // reset everything just in case;
    cardList[devName] = card
        .setAutoGetResponse()
        .setCommandTransformer()
        .setResponseTransformer();
    emitToAllClients('card-inserted', devName);
    emitToAllClients('device-list-update', getDevListWithScp());
    // select TRINCI applet
    await cardList[devName].issueCommand(Iso7816Commands.select(TRINCI_AID));
})

serverEvents.on('card-removed', (devName: string) => {
    if (typeof cardList[devName] !== 'undefined') {
        delete cardList[devName];
    }
    if (typeof scpList[devName] !== 'undefined') {
        delete scpList[devName];
    }
    emitToAllClients('card-removed', devName);
    emitToAllClients('device-list-update', getDevListWithScp());
})

serverEvents.on('command-issued', (devName: string, cmd: string) => {
    emitToAllClients('command-issued', devName, cmd);
})

serverEvents.on('response-received', (devName: string, rsp: string, meaning: string) => {
    emitToAllClients('response-received', devName, rsp, meaning);
})

// =================================================================================================
// PCSC events capturing
// =================================================================================================

const pcscDevices = new Devices();

pcscDevices.on('device-deactivated', (event => {
    serverEvents.emit('card-removed', event.device.name);
}));

pcscDevices.on('device-activated', (event => {
    const device = event.device;

    device.on('error', (error) => {
        serverEvents.emit('device-error', device.name, `${error.message}`);
    })

    device.on('card-removed', (event) => {
        if (!event.card) {
            return;
        }
        serverEvents.emit('card-removed', device.name);
    });

    device.on('card-inserted', async (event) => {
        if (!event.card) {
            return;
        }
        const card = event.card;
        card.on('command-issued', ({ card, command }) => {
            serverEvents.emit('command-issued', device.name, `${command.toString()}`);
        });
        card.on('response-received', ({ card, command, response }) => {
            serverEvents.emit('response-received', device.name, `${response.toString()}`, `${response.meaning()}`);
        });
        serverEvents.emit('card-inserted', device.name, card);
    });
}));