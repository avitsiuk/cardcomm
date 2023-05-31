
import {
    Devices,
    // Iso7816Application,
} from '../src/index';

const devices = new Devices();

const devTypes = {
    nfc: 'NFC',
    cnt: 'CONTACT',
}

console.log('============================================================');
devices.on('device-activated', (event => {

    const device = event.device;
    let devType = 'Unknown';
    if (device.name.includes('ACR122U')) {
        devType = devTypes.nfc;
    } else if(device.name.includes('ACR39U')) {
        devType = devTypes.cnt;
    }
    console.log();
    console.log(`New device: ["${device.name}"](${devType})`);
    console.log();

    device.on('error', (error) => {
        console.error(`[${devType}] error: ${error.message}`);
    })

    device.on('card-removed', (event) => {
        if (!event.card) {
            console.log(`[${devType}]: removed [null]`);
            return;
        }
        let card = event.card;
        console.log(`[${devType}]: removed [${devType === devTypes.nfc ? 'ATS' : 'ATR'}:${card.getAtr()}]`);
    });

    device.on('card-inserted', (event) => {
        if (!event.card) {
            console.log(`[${devType}]: inserted [null]`);
            return;
        }

        let card = event.card;

        card.on('command-issued', ({ card, command }) => {
            console.log(`[${devType}]: [${devType === devTypes.nfc ? 'ATS' : 'ATR'}:${card.getAtr()}]: APDU-C: [${command}]`);
        });

        card.on('response-received', ({ card, command, response }) => {
            console.log(`[${devType}]: [${devType === devTypes.nfc ? 'ATS' : 'ATR'}:${card.getAtr()}]: APDU-R: [${response}](${response.meaning()})`);
        });

        console.log(`[${devType}]: inserted [${devType === devTypes.nfc ? 'ATS' : 'ATR'}:${card.getAtr()}]`);

        // card.issueCommand('00A404000E315041592E5359532E444446303100');

        // const app = new Iso7816Application(card);

        if (devType === devTypes.cnt) {
            card.issueCommand('00A404000E315041592E5359532E444446303100');
            // app.selectFile([0x31, 0x50, 0x41, 0x59, 0x2E, 0x53, 0x59, 0x53, 0x2E, 0x44, 0x44, 0x46, 0x30, 0x31])
        } else if (devType === devTypes.nfc) {
            card.issueCommand('00A404000E325041592E5359532E444446303100');
            // app.selectFile([0x32, 0x50, 0x41, 0x59, 0x2E, 0x53, 0x59, 0x53, 0x2E, 0x44, 0x44, 0x46, 0x30, 0x31])
        }
    });
}));
