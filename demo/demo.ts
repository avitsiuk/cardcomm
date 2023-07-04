import crypto from 'crypto';
import Prompt from 'prompt-sync';
import t2lib from '@affidaty/t2-lib';
import {
    Devices,
    Iso7816Commands,
    gpDefStaticKeys,
    GPSecureSession,
    CommandApdu,
    Utils,
    ResponseApdu,
} from '../src/index';

const nodeUrl = 'https://testnet.trinci.net/';
const nodeNetwork = 'QmcvHfPC6XYpgxvJSZQCVBd7QAMEHnLbbK1ytA4McWx5UY';
const trinciClient = new t2lib.Client(nodeUrl, nodeNetwork);

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
        if (!event.card) {
            console.log(`[${devType}]: No card inserted`);
            return;
        }
        let card = event.card;
        console.log(`[${devType}]: Removed  ${devType === devTypes.nfc ? 'ATS' : 'ATR'}:[${card.atrHex}]`);
    });

    device.on('card-inserted', async (event) => {
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
            console.log('___________ ______ _   _ _____ _____');
            console.log('|_   _| ___ \\_   _| \\ | /  __ \\_   _|');
            console.log('  | | | |_/ / | | |  \\| | /  \\/ | |');
            console.log('  | | |    /  | | | . ` | |     | | ╔═╗╔═╗╦═╗╔╦╗');
            console.log('  | | | |\\ \\ _| |_| |\\  | \\__/\\_| |_║  ╠═╣╠╦╝ ║║');
            console.log('  \\_/ \\_| \\_|\\___/\\_| \\_/\\____/\\___/╚═╝╩ ╩╩╚══╩╝');
            console.log('╒════════════════════════════════════════════════');
            console.log('│ Options:');
            console.log('│    "h" - this help');
            console.log('│    "p" - authenticate with pin');
            console.log('│    "i" - get the card account id');
            console.log('│    "t" - transfer #EURS');
        };

        

        await card.issueCommand(Iso7816Commands.select('112233445500'))

        printHelp();

        let runLoop: boolean = true;
        while(runLoop) {
            let resp: ResponseApdu;
            console.log();
            const option = prompt('Choose an option: ');
            switch (option) {
                case 'h': case 'H':
                    printHelp();
                    break;
                case 'p': case 'P':
                    let pinByteArray;
                    try {
                        pinByteArray = parsePinString(prompt('Input PIN: '));
                        // pinByteArray = parsePinString('1234');   
                    } catch (error) {
                        console.log(`${error}`);
                        break;
                    }
                    resp = await card.issueCommand(new CommandApdu('8000000000').setData(pinByteArray));
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
                case 'i': case 'I':
                    resp = await card.issueCommand(new CommandApdu('8002000000'));
                    if (resp.isOk()) {
                        const accId = await getCardAccountId(resp.data);
                        console.log(`Card Account: ${accId}`);
                    } else {
                        console.log(`Error! Response: [${resp.toString()}]`);
                    }
                    break;
                case 't': case 't':
                    resp = await card.issueCommand(new CommandApdu('8002000000'));
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
                    const to = prompt('To: ');
                    // const to = '#Affidaty';
                    const amount = parseInt(prompt('Amount: '));
                    // const amount = 100;
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
                    resp = await card.issueCommand(new CommandApdu('8003000000').setData(txSHA384));
                    if (resp.isOk()) {
                        tx.signature = new Uint8Array(processSignature(resp.data));
                        if (await tx.verify()) {
                            const ticket = await trinciClient.submitTx(tx);
                            const rec = await trinciClient.waitForTicket(ticket);
                            console.log(`Success: ${rec.success}`);
                        } else {
                            console.log('Error: transaction cannot be verified');
                            break;
                        }
                    } else {
                        console.log(`Error! Response: [${resp.toString()}]`);
                        break;
                    }
                    break;
                default:
                    break;
            }
        }



        // while (event.card) {   
        //     const comando = prompt('Insert your command:');
        //     let cmdToStr = comando.toString();
        //     if (typeof comando === 'string') {
        //         switch(cmdToStr) {
        //             case 'validate':
        //                 console.log(`[VALIDATE] PIN command 0x00`);
        //                 const inputPIN = prompt('Authenticate with CARD PIN:').toString();
        //                 let lenPIN = inputPIN.length;
        //                 //await card.issueCommand(new CommandApdu('8000000000').setData([0x00,0x01,0x02,0x03]));
        //                 await card.issueCommand(new CommandApdu('8000000000').setData(parsePin(inputPIN)));
        //                 break;
        //             case 'echo':
        //                 console.log(`[ECHO] ECHO command 0x01`);
        //                 await card.issueCommand(new CommandApdu('8001000000'));
        //                 break;
        //             case 'encrypt':
        //                 console.log(`[ENCRYPT] command 0x02`);
        //                 const toENC = prompt('What would you like to encrypt on the card:').toString();
        //                 let lenENC = toENC.length;
        //                 await card.issueCommand(new CommandApdu(`8002000000`));
        //                 break;
        //             case 'sign':
        //                 console.log(`[SIGN] command 0x03`);
        //                 await card.issueCommand(new CommandApdu('8003000000'));
        //                 break;
        //             case 'id':
        //                 console.log(`[ID] command 0x04`);
        //                 let pubKey = await card.issueCommand(new CommandApdu('8004000000'));
        //                 const kp = new t2lib.ECDSAKey('public');
        //                 await kp.setRaw(new Uint8Array(pubKey.data));
        //                 let TrinciId = await t2lib.getAccountId(kp);
        //                 console.log(`[TrinciId]:${TrinciId}`);
        //                 break;
        //             default:
        //                 console.log(`not valid command`);
        //         }
        //     } else {console.log("invalid command");}
        // } 





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
        // const secSession = new GPSecureSession(card)
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