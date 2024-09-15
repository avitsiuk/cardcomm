import {
    PcscDevicesManager,
    Device,
    Card,
    Iso7816Commands,
    Utils,
    BER,
    SCP11,
    SCP02,
    gpDefaultStaticKeys,
} from '../src/index';

const devices: {[key: number]: {device: Device, card: Card | null, name: string}} = {};

function splitDeviceName(fullName: string): { simpleName: string, idx: number } {
    const nameComponents = fullName.split(' ');
    const simpleName = nameComponents.slice(0, -2).join(' ');
    const idx = parseInt(nameComponents.slice(-2, -1)[0]);
    return {simpleName, idx}
}

function printDeviceList() {
    console.clear();
    console.log('============================================');
    const keys = Object.keys(devices).map(val => parseInt(val)).sort((a, b)=>a-b);

    const maxNameLen = keys.reduce((currMaxLen, key) => {
        return Math.max(currMaxLen, devices[key].name.length);
    }, 0)

    keys.reduce((_, key) => {
        console.log(`[${key}] ${devices[key].name.padEnd(maxNameLen, ' ')}: ${devices[key].card ? devices[key].card.atrHex : 'no card'}`)
        return null;
    }, null)

    console.log('============================================');
};



const pcscDM = new PcscDevicesManager();

console.log('============================================================');

pcscDM.on('device-deactivated', (event) => {
    const {simpleName, idx} = splitDeviceName(event.device.name);
    delete devices[idx];
    printDeviceList();
})

pcscDM.on('device-activated', (event => {

    const device = event.device;
    const {simpleName: devName, idx: devIdx} = splitDeviceName(device.name);

    devices[devIdx] = {name: devName, device: event.device, card: null};
    printDeviceList();

    device.on('error', (error) => {
        console.error(`Device error: ${error.message}`);
    })

    device.on('card-removed', (event) => {
        devices[devIdx].card = null;
        printDeviceList();
    })

    device.on('card-inserted', async (event) => {
        devices[devIdx].card = event.card;
        printDeviceList();

        console.log('Selecting default applet...');
        console.log();

        event.card.on('command-issued', (event) => {
            console.log(`[${devIdx}][CMD]<< [${event.command}]`)
        })

        event.card.on('response-received', (event) => {
            console.log(`[${devIdx}][RSP]>> [${Utils.hexEncode([...event.response.data])}][${Utils.hexEncode([...event.response.status])}](${event.response.meaning})`)
        })

        // event.card.issueCommand(Iso7816Commands.select('429999990000'))
        event.card.issueCommand(Iso7816Commands.select())
            .then((selectResponse) => {
                console.log();
                console.log('Card response:');
                // console.log(selectResponse.toString());
                BER.BerObject.parse(selectResponse.data).print((line: string) => {
                    console.log(`>>${line}`);
                });

                console.log();
                console.log(`Initiating SCP02 session`);

                const scp = new SCP02(event.card).setSecurityLevel(3).setStaticKeys(gpDefaultStaticKeys).initAndAuth()
                    .then(()=>{
                        console.log('Secure session established');
                        console.log();
                    })
                    .catch((error) => {
                        console.error('SCP02 error:');
                        console.error(error);
                        console.log();
                    })
            })
            .catch((e) => {
                console.log();
                console.error(e);
                console.log();
            })
    })
}));
