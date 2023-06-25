
import {
    // CommandApdu,
    Devices,
    // Iso7816Commands,
    // Utils,
    GPSecureSession,
} from '../src/index';

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

    // if (devType != devTypes.nfc) return;

    device.on('error', (error) => {
        console.error(`[${devType}] error: ${error.message}`);
    })

    device.on('card-removed', (event) => {
        if (!event.card) {
            console.log(`[${devType}]: Removed  [null]`);
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

        const secSession = new GPSecureSession(card);

        secSession.init()
            .then((resp) => {
                console.log('===================================');
                console.log(`Authenticated to ISD!!`);
                console.log('===================================');
            })
            .catch((err) => {
                console.log('===================================');
                console.log(`Error: ${err}`);
                console.log('===================================');
            })
        // secSession.issueCommand(cmd);
    });
}));
