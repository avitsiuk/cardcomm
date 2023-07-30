/*
 * TODO: Init Update, Secure Channel Transport Layer
 * TODO: Java class converter
 * TODO: Load, Install,Select from .cap files
 * TODO: Card Lifecycle management
 * TODO: TLV 'encoder' > Import of privKey !!!
 * TODO: Request ObjectDeletion where needed -> KeyAgreement !!!
 * TODO: pubKey setting during import !!!
 * 
 * scriptgen (cap -> scripts);
 */

// secure session TODO:
// - authentication - certificate?;
// - Integrity and anti-replay - MAC
// - Confidentiality - AES encryption

import crypto from 'crypto';
import Prompt from 'prompt-sync';
import t2lib from '@affidaty/t2-lib';
import {
    Devices,
    Iso7816Commands,
    gpDefStaticKeys,
    SCP11,
    CommandApdu,
    Utils,
    ResponseApdu,
} from '../src/index';

const nodeUrl = 'https://testnet.trinci.net/';
const nodeNetwork = 'QmcvHfPC6XYpgxvJSZQCVBd7QAMEHnLbbK1ytA4McWx5UY';
const trinciClient = new t2lib.Client(nodeUrl, nodeNetwork);

let runLoop = false;

const prompt = Prompt({sigint: true});
const hexToArray = Utils.hexToArray;
const arrayToHex = Utils.arrayToHex;

const pcscDevices = new Devices();

const devTypes = {
    nfc: 'NFC',
    cnt: 'CONTACT',
}

console.log('============================================================');
pcscDevices.on('device-activated', (event => {

    const device = event.device;
    let devType = 'Unknown';
    if (device.name.includes('ACR122U')) {
        devType = devTypes.nfc;
    } else if(device.name.includes('ACR39U')) {
        devType = devTypes.cnt;
    }
    console.log(`New device: ["${device.name}"](${devType})`);

    device.on('error', (error) => {
        console.error(`[${devType}] error: ${error.message}`);
    })

    device.on('card-removed', (event) => {
        runLoop = false;
        console.log('Removed');
        if (!event.card) {
            console.log(`[${devType}]: No card inserted`);
            return;
        }
        let card = event.card;
        console.log(`[${devType}]: Removed  ${devType === devTypes.nfc ? 'ATS' : 'ATR'}:[${card.atrHex}]`);
    });

    device.on('card-inserted', async (event) => {
        runLoop = true;
        if (!event.card) {
            console.log(`[${devType}]: Inserted [null]`);
            return;
        }

        let card = event.card;
        card.setAutoGetResponse();
        console.log();
        console.log(`[${devType}]: Inserted ${devType === devTypes.nfc ? 'ATS' : 'ATR'}:[${card.atrHex}]`);

        card.on('command-issued', ({ card, command }) => {
            console.log(`[${devType}]: CMD: [${command}]`);
        });

        card.on('response-received', ({ card, command, response }) => {
            console.log(`[${devType}]: RSP: [${response}](${response.meaning()})`);
        });

        console.log('=========================================================');

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

        const printHelp = () => {
            console.log();
            console.log();
//             console.log(`
//                           ...:::::::....                           
//                       .:^^~~~~~~~~~~!!!!!!!!~~^:.                     
//                   .:^~~~^::...           ...:^~!!!~^.                 
//                :^~~^:.                           .:^!!^:              
//             .^~^:                                    .:~!^.           
//           .^^:                                          .^~^.         
//         .^:.                       .                       .^^.       
//        ::.                      .~!77~.                      .^:      
//      .:.    .::^^~~~~~^^::.     ^777??:     .:^~~!!!!~~^^:.    .:.    
//      .   :^~!777777777777!!~^:. .^~!!^  .^~77?????????????7!~:   .    
//       .^!7!!~^:::::::^~!!7!!7!!^:.....:~7?????77!^^:::::^~!77?7^.     
//     .^!!~:.             .:~!!!!!!!!!77?????7!^.             .^!?7~.   
//    .!!^.                   .^!!!!!!7??????~.                   .~?!.  
//   .!~.                       :~7!!!7????!:                       :77. 
//  .!~.                         .~!!!77??!.                         :7! 
//  :!.                           .!!77??7.                           :7.
//  ^~                             ^7777?^                             7^
//  ^~                             ^777??^                        :!7!.7^
//  :~                             .~!77~.                        !5GY~7:
//  .~.      .!:      ...    ..      .::              .  ..~7!:   .J?:^! 
//   ^^     .5&P.  :JP7!77!5J!!?.~5.:YY!~7J!   .J?  !?75Y!!^!GB! :J?. !^ 
//   .!:   .5~7&5   ?#~::::GY::: 7B. Y5. .!#J  75B? :.:G5    .Y#PY!  ^!. 
//    :~. .LKS!RMS. ?#!^: :G5^^. 7B. Y5.  ^#5.?Y~5#7  :G5      5&?  :7:  
//     ^~.J!....7GY.?G.   :5?    !G~ JP~^!Y7:~7::.?G7 :PJ      JG7 :!^   
//      ^~:       :...     ..     ..  ..:.   .     .:  ..      .. :!:    
//       :~^                                                     ~!.     
//        .^~.                                                 :!~.      
//          :^^.                                             :!~.        
//            :^~:.                                       .^~~.          
//              .^~^^.                                .:^~~^.            
//                 .:^~~^:..                     ..^~!!~^.               
//                    ..:^~~~~^^:::....:::::^~~~!!!~^:.                  
//                         ..::^^~~~~~!!!!!!~~^:..                       
//                 `
//             );
            /*
            console.log(`
                                                                             
                     .....:::::....                              
              ..:^^~~!!!!!!!777777!~:..                          
          ..^~!!!~^::..........::~!JY7:..                        
       .:~!!~^:..      .:^^^^:   ..:757:.                        
    ..:!?!:..           .::^:.   ..:!5?:..                       
   ..~J7:..                .:   .:^!?5?^:.                       
  ..~57:.. .:::::.          .:. .~Y5555J:.                       
  ..757::. .:::::........... :^..:~!77!^.                        
  ..^?Y?~::...        .......::^::..::::::::::::::::.....        
   ..:~7???7!!!!~~~~~~~~~!!!!!!!!!!!!~^^^:::::..............     
      ...:::^^^^^^^^^^^^^::::....    ...                         
                            ^?JJ?7:     ........                 
                            ~?Y5J?:       .^^^^^:                
                              ?J.           ....                 
                              YJ                          ..     
                              75~                     ....       
                               ~??!^:....  .....::::..           
                                 .^~~~~~~~~~^^::..               
            
            `);
            */
            console.log('___________ ______ _   _ _____ _____');
            console.log('|_   _| ___ \\_   _| \\ | /  __ \\_   _|');
            console.log('  | | | |_/ / | | |  \\| | /  \\/ | |');
            console.log('  | | |    /  | | | . ` | |     | | ╔═╗╔═╗╦═╗╔╦╗');
            console.log('  | | | |\\ \\ _| |_| |\\  | \\__/\\_| |_║  ╠═╣╠╦╝ ║║');
            console.log('  \\_/ \\_| \\_|\\___/\\_| \\_/\\____/\\___/╚═╝╩ ╩╩╚══╩╝');
            console.log('╒════════════════════════════════════════════════');
            console.log('│ Options:');
            console.log('│    "h"    - this help');
            console.log('│    "s"    - get card state');
            console.log('│    "e"    - echo');
            console.log('│    "ka"   - key agreement');
            console.log('│    "PUK"  - set puk');
            console.log('│    "puk"  - validate puk');
            console.log('│    "pukw" - validate wrong puk');
            console.log('│    "PIN"  - set pin');
            console.log('│    "pin"  - validate pin');
            console.log('│    "pinw" - validate wrong pin');
            console.log('│    "gen"  - generate Acc');
            console.log('│    "imp"  - import ');
            console.log('│    "id"   - get the card account id');
            console.log('│    "tr"   - transfer #EURS');
            console.log('│    "debug"- Debug Test');
        };

        // prompt('Insert your private key: ');
        const privKeyB58 = '9XwbySgVsf1qZvErcMkdGtzDnrDVoRfL6AxQGQ35A2bnCstJbexGjxJKe1UzJzYgyw1W83qzBwdFcccWfmQpPcVGpbTAPQkbCZRMk1HxH3zUyoMppD2ae5R4m7gedbjrwsXnmqdULQBJ44hn2giNSjZ1N39DW7L1CQaU8rFtpYwRTfXGMwP4jwWxq6Daf79GW1PLquMfbGEihu6xiQqmhZUrYmKeNKqoaAqMztWpcZH6hvLBhxxiCq7weXAYZ2wQvFeEqF4HT';
        const importedPrivKey = new t2lib.ECDSAKey('private');
        await importedPrivKey.importBin(new Uint8Array(t2lib.binConversions.base58ToArrayBuffer(privKeyB58)));

        const kp = new t2lib.ECDSAKeyPair();
        kp.privateKey = importedPrivKey;
        kp.publicKey = await importedPrivKey.extractPublic();

        const resp = await card.issueCommand(Iso7816Commands.select('112233445500'));
        if (!resp.isOk()) {
            throw new Error(`Coult not select TRINCI applet. Response: [${resp.toString()}]`);
        }

        let secureSession = new SCP11(card);

        printHelp();

        runLoop = true;
        while(runLoop) {
            let resp: ResponseApdu;
            console.log();
            const option = prompt('Choose an option: ');
            if (!runLoop) break;
            switch (option) {
                case 'h': case 'H':
                    printHelp();
                    break;
                case 'e': case 'E':
                    resp = await card.issueCommand(new CommandApdu('80FF000003FF00FF00'));
                    console.log(`Response: [${resp.toString()}]`);
                    break;
                case 's': case 'S':
                    resp = await card.issueCommand(new CommandApdu('80F2000000'));
                    if (resp.isOk()) {
                        if (resp.dataLength !== 2) {
                            console.log(`Unknown response: [${resp.toString()}]`);
                        }
                        const stateByte = resp.data[0];
                        console.log(`PUK set: [${(stateByte & 0x01) > 0}]`);
                        console.log(`PIN set: [${(stateByte & 0x02) > 0}]`);
                        console.log(`ACC set: [${(stateByte & 0x04) > 0}]`);
                    } else {
                        console.log(`Error! Response: [${resp.toString()}]`);
                    }
                    break;
                case 'ka':
                    secureSession.setSecurityLevel(0x3C);
                    try {
                        await secureSession.initAndAuth();
                    } catch (error) {
                        throw new Error(`Error initializing secure session: ${error}`);
                    }
                    card.setTransformer(secureSession.authenticator);
                    console.log('==========================');
                    console.log(`Secure session initialized`);
                    console.log('==========================');

                    const sleep = (ms: number) => {
                        return new Promise((resolve) => {
                            setTimeout(() => {
                                resolve(1);
                            }, ms);
                        })
                    }

                    const testCmd = new CommandApdu('80FF000003FF00FF00');
                    let count = 0;
                    while(true) {
                        resp = await card.issueCommand(testCmd);
                        if(!resp.isOk()) {
                            break;
                        }
                        count++;
                        console.log(`Count: [${count}]`);
                    }


                    // let testCmd = new CommandApdu('80dd000003ff00ff00');
                    // await card.issueCommand(testCmd);
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
                    resp = await card.issueCommand(new CommandApdu('8000000000').setData(pukByteArray));
                    if (resp.isOk()) {
                        // pukByteArray = parsePinString('0123456788');
                        resp = await card.issueCommand(new CommandApdu('8000000000').setData(pukByteArray));
                        if (resp.isOk()) {
                            console.log('Success!');
                        } else {
                            console.log(`Error! Response: [${resp.toString()}]`);
                        }
                    } else {
                        console.log(`Error! Response: [${resp.toString()}]`);
                    }
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
                    resp = await card.issueCommand(new CommandApdu('8010000000').setData(pukByteArray2));
                    if (resp.isOk()) {
                        console.log('Success!');
                    } else {
                        if (resp.dataLength === 2) {
                            console.log(`Error; Remaining tries: ${resp.data[1]}`);
                        } else {
                            console.log(`Error! Response: [${resp.toString()}]`);
                        }
                    }
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
                    resp = await card.issueCommand(new CommandApdu('8010000000').setData(pukByteArray3));
                    if (resp.isOk()) {
                        console.log('Success!');
                    } else {
                        if (resp.dataLength === 2) {
                            console.log(`Error; Remaining tries: ${resp.data[1]}`);
                        } else {
                            console.log(`Error! Response: [${resp.toString()}]`);
                        }
                    }
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
                    resp = await card.issueCommand(new CommandApdu('8001000000').setData(pinByteArray));
                    if (resp.isOk()) {
                        // pinByteArray = parsePinString('0122');   
                        resp = await card.issueCommand(new CommandApdu('8001000000').setData(pinByteArray));
                        if (resp.isOk()) {
                            console.log('Success!');
                        } else {
                            console.log(`Error! Response: [${resp.toString()}]`);
                        }
                    } else {
                        console.log(`Error! Response: [${resp.toString()}]`);
                    }
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
                    resp = await card.issueCommand(new CommandApdu('8011000000').setData(pinByteArray2));
                    if (resp.isOk()) {
                        console.log('Success!');
                    } else {
                        console.log(`Error! Response: [${resp.toString()}]`);
                        if (resp.dataLength === 2) {
                            console.log(`Remaining tries: ${resp.data[1]}`);
                        }
                    }
                    break;
                case 'pinw':
                    let pinByteArrayW;
                    try {
                        pinByteArrayW = parsePinString('1234');
                    } catch (error) {
                        console.log(`${error}`);
                        break;
                    }
                    resp = await card.issueCommand(new CommandApdu('8011000000').setData(pinByteArrayW));
                    if (resp.isOk()) {
                        console.log('Success!');
                    } else {
                        console.log(`Error! Response: [${resp.toString()}]`);
                        if (resp.dataLength === 2) {
                            console.log(`Remaining tries: ${resp.data[1]}`);
                        }
                    }
                    break;
                case 'gen':
                    console.log('1');
                    resp = await card.issueCommand(new CommandApdu('8002000000'));
                    console.log('2');
                    if (resp.isOk()) {
                        console.log('Success!');
                    } else {
                        console.log(`Error! Response: [${resp.toString()}]`);
                    }
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
                    break;
                case 'id':
                    resp = await card.issueCommand(new CommandApdu('8012000000'));
                    if (resp.isOk()) {
                        const accId = await getCardAccountId(resp.data);
                        console.log(`Card Account: ${accId}`);
                    } else {
                        console.log(`Error! Response: [${resp.toString()}]`);
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
                        break;
                    }
                    break;
                case 'debug':
                    let cmdX = secureSession.authenticator(new CommandApdu('8099000000'))
                    resp = await card.issueCommand(cmdX);
                    if (resp.isOk()) {
                        console.log('Success!');
                    } else {
                        console.log(`Error! Response: [${resp.toString()}]`);
                    }
                    break;
                default:
                    break;
            }
        }

        // await card.issueCommand(Iso7816Commands.select('A000000151535041'));
        // await card.issueCommand(Iso7816Commands.select('112233445500'));
        // await card.issueCommand(Iso7816Commands.select());

        // const isdAid = '';
        // const ssdAid = '';
        // const trinciAid = '';

        // const customKeys = {
        //     enc: hexToArray('ffffffffffffffffffffffffffffffff'),
        //     mac: hexToArray('ffffffffffffffffffffffffffffffff'),
        //     dek: hexToArray('ffffffffffffffffffffffffffffffff'),
        // }

        // // initializing new secure session and authenticating host
        // await card.issueCommand(Iso7816Commands.select('A000000151535041'));
        // const secSession = new SCP02(card)
        //     .setStaticKeys(gpDefStaticKeys)
        //     .setSecurityLevel(3);

        // secSession.initAndAuth()
        //     .then(async(resp) => {
        //         console.log('===================================');
        //         console.log('Secure session is active');
        //         console.log('===================================');


        //         // await card.issueCommand(Iso7816Commands.select('112233445500'));
        //         // let cmd5 = new CommandApdu('80ff000000');

        //         // console.log(Iso7816Commands.select('112233445500').setSecMgsType(1));
        //         // let cmd1 = new CommandApdu('80E60C001A0511223344550611223344550006112233445500010202c9000000'); // install 112233445500
        //         // let cmd2 = new CommandApdu('80E40000084F0611223344550000'); // delete 112233445500
        //         // let cmd3 = new CommandApdu('80F210000A4F001E3C2FDD87FD86A000'); // get status
        //         // let cmd4 = new CommandApdu('80F28002024F0000');

        //         // const cmd = secSession.authenticator(cmd5);
        //         // await card.issueCommand(cmd5);
        //     })
        //     .catch((err) => {
        //         console.log('===================================');
        //         console.log(`Error: ${err}`);
        //         console.log('===================================');
        //     })
    });
}));

// const d = (data: number[]) => {
//     let result: any;
//     try {
//         result = sd(data);
//     } catch (error) {
//         return arrayToHex(data);
//     }
//     const keys = Object.keys(result);
//     for (let i = 0; i < keys.length; i++) {
//         const tag = keys[i];
//         if (result[tag].length > 0) {
//             result[tag].value = d(result[tag].value);
//         }
//     }
//     return result;
// }

// const tlv = d(sResp.data);

// console.log(JSON.stringify(tlv, null, 2));

// const printTlv = (tlv: any, i: number = 0) => {
//     let msg = '';
//     msg = '';
//     const tags = Object.keys(tlv);
//     for (let tragIdx = 0; tragIdx < tags.length; tragIdx++) {
//         const tag = tags[tragIdx];
//         msg = `[${tag}](${tlv[tag].length}):`;

//         if (typeof tlv[tag].value === 'string') {
//             msg += ` [${tlv[tag].value.toUpperCase()}]`;
//             console.log(msg.padStart((msg.length + (4 * i)), ' '));
//         } else {
//             console.log(msg.padStart((msg.length + (4 * i)), ' '));
//             printTlv(tlv[tag].value, ++i);
//         }
//     }
// };