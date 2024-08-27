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
    SCP02,
    CommandApdu,
    Utils,
    ResponseApdu,
} from '../src/index';
import { defaultStaticKeys } from '../src/globalPlatform/sesureSession/scp02';

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
            console.log(`DEV[${devIdx}]: RSP: [${response}](${response.meaning})`);
        });

        console.log('=========================================================');

        // Global Platform SCP test
        // selecting default applet (ISD - Issuer Security Domain)
        await card.issueCommand(Iso7816Commands.select());
        // new SCP02 session with security lvl 3 (mac + c-enc + r-end) with default keys
        const secSession = new SCP02(card).setSecurityLevel(3).setStaticKeys(defaultStaticKeys);

        secSession.initAndAuth()
            .then(async(resp) => {
                console.log('===================================');
                console.log('Secure session is active, protocol: SCP02');
                console.log('===================================');

                // await card.issueCommand(Iso7816Commands.select(''));
                // await card.issueCommand(cmd3);
            })
            .catch((err) => {
                console.log('===================================');
                console.log(`Error: ${err}`);
                console.log('===================================');
            })
    });
}));
