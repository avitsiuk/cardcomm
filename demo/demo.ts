
// const arr = [0x90, 0x00];
// console.log(arr);
// console.log()
import {
    Devices,
    CommandApdu,
    ResponseApdu,
    Utils,
} from '../src/index';
import { arrayToHex } from '../src/utils';



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

        let card = event.card.setAutoGetResponse();
        console.log();
        console.log(`[${devType}]: Inserted ${devType === devTypes.nfc ? 'ATS' : 'ATR'}:[${card.atrHex}]`);

        card.on('command-issued', ({ card, command }) => {
            console.log(`[${devType}]: CMD: [${command}]`);
        });

        card.on('response-received', ({ card, command, response }) => {
            console.log(`[${devType}]: RSP: [${response}](${response.meaning()})`);
        });

        // let cmd = new CommandApdu('00a4040000'); //.setData(Utils.hexToArray('112233445500'));
        // console.log(`CMD:  [${cmd}]`);
        // console.log(`Lc:   [${cmd.getLc().toString(16).padStart(2, '0')}](${cmd.getLc()})`);
        // console.log(`Data: [${Utils.arrayToHex(cmd.getData())}]`);
        // console.log(`le: [${cmd.getLe().toString(16)}](${cmd.getLe()})`);
        await card.issueCommand(
            new CommandApdu().setIns(0xA4).setP1(0x04).setData(Utils.hexToArray('112233445500')),
        );
        console.log('=======');
        card.issueCommand(new CommandApdu('80ff000000'), (err, res) => {
            console.log(`Final response: [${res.toString()}]`);
        });
        // console.log('');
        // console.log(res.toString());



        // await card.issueCommand('00A4040000');
        // await card.issueCommand('00A404000611223344550000');
        // ("80ca006600"

        // await card.issueCommand('00a404000611223344550000');
        // await card.issueCommand('8000000001FF00'); // 9000
        // await card.issueCommand('8001000001FF00'); // 9001
        // await card.issueCommand('8002000001FF00'); // 6d00 (INS not supported)
        // await card.issueCommand('80FF000001FF00'); // 90ff
        // const app = new Iso7816Application(card);

        // if (devType === devTypes.cnt) {
        //     card.issueCommand('00A404000E315041592E5359532E444446303100');
        //     // app.selectFile([0x31, 0x50, 0x41, 0x59, 0x2E, 0x53, 0x59, 0x53, 0x2E, 0x44, 0x44, 0x46, 0x30, 0x31])
        // } else if (devType === devTypes.nfc) {
        //     card.issueCommand('00A404000E325041592E5359532E444446303100');
        //     // app.selectFile([0x32, 0x50, 0x41, 0x59, 0x2E, 0x53, 0x59, 0x53, 0x2E, 0x44, 0x44, 0x46, 0x30, 0x31])
        // }
    });
}));
