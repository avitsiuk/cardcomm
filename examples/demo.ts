import {
    PcscDevicesManager,
    Device,
    Card,
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
    const {simpleName, idx} = splitDeviceName(device.name);

    devices[idx] = {name: simpleName, device: event.device, card: null};
    printDeviceList();

    device.on('card-removed', (event) => {
        devices[idx].card = null;
        printDeviceList();
    })

    device.on('card-inserted', (event) => {
        devices[idx].card = event.card;
        printDeviceList();

        // const selectResponse = event.card.issueCommand()
    })
}));
