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
import {
    Devices,
    Iso7816Commands,
    gpDefaultStaticKeys,
    SCP11,
    CommandApdu,
    Utils,
    ResponseApdu,
} from '../src/index';

let devCounter = -1;

const pcscDevices = new Devices();

console.log('============================================================');
pcscDevices.on
pcscDevices.on('device-activated', (event => {

    const device = event.device;
    devCounter++;
    const devIdx = devCounter;
    const devName = device.name;

    console.log(`New device: "${devName}"(IDX: ${devIdx})`);

    device.on('error', (error) => {
        console.error(`DEV[${devIdx}] error: ${error.message}`);
    })

    device.on('card-removed', (event) => {
        console.log(`[${device.name}]: Card removed`);
    });

    device.on('card-inserted', async (event) => {
        if (!event.card) {
            console.log(`[${device.name}]: Inserted [null]`);
            return;
        }

        let card = event.card;
        card.setAutoGetResponse();
        console.log();
        console.log(`[${device.name}]: Inserted card(${card.protocol}). ATS/ATR:[${card.atrHex}]`);

        card.on('command-issued', ({ card, command }) => {
            console.log(`DEV[${devIdx}]: CMD: [${command}]`);
        });

        card.on('response-received', ({ card, command, response }) => {
            console.log(`DEV[${devIdx}]: RSP: [${response}](${response.meaning()})`);
        });

        console.log('=========================================================');


        // await card.issueCommand(Iso7816Commands.select());
        await card.issueCommand(Iso7816Commands.select('429999990000'));
        // if (!resp.isOk()) {
        //     console.log('Response is NOT ok;')
        // }

        // let secureSession = new SCP11(card).setSecurityLevel(0x3C);
        // await card.issueCommand(new CommandApdu('80F2000000'));

        // await card.issueCommand(Iso7816Commands.select('A000000151535041'));
        // await card.issueCommand(Iso7816Commands.select('4299999900'));
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


        //         // await card.issueCommand(Iso7816Commands.select('4299999900'));
        //         // let cmd5 = new CommandApdu('80ff000000');

        //         // console.log(Iso7816Commands.select('4299999900').setSecMgsType(1));
        //         // let cmd1 = new CommandApdu('80E60C001A0511223344550611223344550006112233445500010202c9000000'); // install 112233445500
        //         // let cmd2 = new CommandApdu('80E40000084F0611223344550000'); // delete 112233445500
        //         // let cmd3 = new CommandApdu('80F210000A4F001E3C2FDD87FD86A000'); // get status
        //         // let cmd4 = new CommandApdu('80F28002024F0000');

        //         // cmd = secSession.authenticator(cmd5);
        //         // await card.issueCommand(cmd5);
        //     })
        //     .catch((err) => {
        //         console.log('===================================');
        //         console.log(`Error: ${err}`);
        //         console.log('===================================');
        //     })
    });
}));
