## About

This package expands upon original [`smartcard` library](https://github.com/tomkp/smartcard) by [tomkp](https://github.com/tomkp) and is built around [`pcsclite` library](https://github.com/santigimeno/node-pcsclite) by [Santiago Gimeno](https://github.com/santigimeno)  
[Original `smartcard` package](https://www.npmjs.com/package/smartcard) on NPM  
[`pcsclite` package](https://www.npmjs.com/package/pcsclite) on NPM

> Tested with `ACR39U` and `ACR122U` readers

## Main features overview

- CommonJS + ES6 modules support
- Event-based devices and cards management (like in the original `smartcard` package)
- CommandAPDU class with helper methods for simpler command construction. (no more bitwise)
- ResponseAPDU with helpers for status decoding according to Iso7816 specifications.
- Auto GetResponse in case of `0x61XX` response. (can be disabled)
- Auto command adjustment in case of `0x6CXX` response. (can be disabled).
- Built-in Iso7816 commands(still expanding)
- Built-in GlobalPlatform commands (still expanding)
- Built-in GlobalPlatform secure sessions
    - SCP02 (i=55)
    - SCP11b
- Built-in BER encoder/decoder with wildcard search (e.g. `/6f/*/88`)

## TODO list
- API Documentation
- Card ATR decode
- Add missing Iso7816 commands
- Add missing GlobalPlatform commands
- Add EMV BER tags dictionary for EMV/Iso7816/GlobalPlatform tags
- SCP03 support
- SCP11a with mutual authentication support
- BER object in-place editing. Currently a new object must be created.


## Dependencies (Debian/Ubuntu)

### PCSC system drivers

Install basic dependencies by running  
`sudo apt install libpcsclite1 libpcsclite-dev pcscd`  
and check pcscd service status for any error with  
`service pcscd status`

Optionally install pcsc tools package  
`sudo apt install pcsc-tools`  
and check if your reader(s) and card(s) are working by executing  
`pcsc_scan`  
This should show all (contact and NFC) readers recognized by your system and print info about inserted cards (if any).

## Issues (Debian/Ubuntu)

### Busy NFC issues

Sometimes NFC readers won't work because of other drivers blocking the usb bus.
Plug in your reader and check pcscd service logs:

```
$ journalctl -u pcscd.service
...
xxx XX XX:XX:XX xxxxxx pcscd[5465]: 29870365 ccid_usb.c:672:OpenUSBByName() Can't claim interface 1/10: LIBUSB_ERROR_BUSY
...
```
`LIBUSB_ERROR_BUSY` tells that the interface is used by something else.

Check what driver is using the device:
```
$ lsusb -t
/:  Bus 01.Port 1: Dev 1, Class=root_hub, Driver=xhci_hcd/16p, 480M
    |__ Port 1: Dev 23, If 0, Class=Chip/SmartCard, Driver=pn533, 12M
```

Then view the dependency tree of that driver (`pn533` in this case)
```
$ lsmod | grep pn533
Module                  Size  Used by
pn533_usb              20480  0
pn533                  49152  1 pn533_usb
nfc                   147456  1 pn533
```
in this case we have following dependency tree
```
pn533_usb
  └pn533
    └nfc
```

There are two possible ways to disable those drivers:  

1. Unload modules from kernel:  
`sudo rmmod pn533_usb pn533 nfc`  
In case you need to reenable them again just run:  
`sudo modprobe pn533_usb pn533 nfc`  
    > No system reboot required

2. Add drivers to blacklist  
Open(create) file `/etc/modprobe.d/nfc-blacklist.conf` and add following lines:
    ```
    blacklist pn533_usb
    blacklist pn533
    blacklist nfc
    ```
    >System reboot required

Now install `libnfc`:  
`sudo apt install libnfc-bin`

And finally restart `pcscd`:  
`sudo service pcscd restart`

Use one of the following tools to check if the reader is working:
```
$ nfc-scan-device
nfc-scan-device uses libnfc 1.8.0
1 NFC device(s) found:
- ACS / ACR122U PICC Interface:
    acr122_usb:001:023
```
```
$ nfc-list
nfc-list uses libnfc 1.8.0
NFC device: ACS / ACR122U PICC Interface opened
```
```
$ pcsc_scan
Using reader plug'n play mechanism
Scanning present readers...
0: ACS ACR122U PICC Interface 00 00
 
Fri Aug 23 16:47:33 2024
 Reader 0: ACS ACR122U PICC Interface 00 00
  Event number: 0
  Card state: Card removed,
```

### Deprecated OpenSSL crypto functions

Secure Channel Protocol 02 uses cryptographic functions which are no longer supported on NodeJS v17+  
Example:  
`Error: error:0308010C:digital envelope routines::unsupported`  

In order to reenable those functions you need to add `--openssl-legacy-provider` to environment variable `NODE_OPTIONS` (create if missing)
For example:  
`export NODE_OPTIONS=--openssl-legacy-provider`  
or  
`export NODE_OPTIONS="$NODE_OPTIONS --openssl-legacy-provider"`  
Multiple options must be separated by a space

## API

    // Under construction

## Example demo.ts
This code cam be found in package repository
```ts
import {
    PcscDevicesManager,
    Device,
    Card,
    CommandApdu,
    Utils,
    BER,
    Iso7816,
    GP
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

pcscDM.on('error', (event) => {
    console.error(`Device manager error: ${event.error.message}`);
})

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

        // Uncomment this to disable autoGetResponse feature
        // In that case GET_RESPONSE commands must be sent manually
        // event.card.autoGetResponse = false;

        // event.card.issueCommand(Iso7816Commands.select('429999990000'))
        event.card.issueCommand(Iso7816.commands.select())
            .then((selectResponse) => {
                console.log();

                let berObj: BER.BerObject | undefined;
                try {
                    berObj = BER.BerObject.parse(selectResponse.data)
                } catch (error) {
                    // decode error, probably not BER
                }

                if (berObj && selectResponse.data.byteLength > 0) {
                    console.log('Decoded card response BER:');
                    berObj.print();
                    // custom print function
                    // BER.BerObject.parse(selectResponse.data).print((obj, lvl, line) => {
                    //     console.log(`[${obj.isPrimitive() ? 'P': obj.isRoot() ? 'R' : 'C'}][${lvl}]${line}`);
                    // });
                } else {
                    console.log('Card response:');
                    console.log(`${selectResponse.toString()} (${selectResponse.meaning})`);
                }


                /*
                    Uncomment following lines to try establish a new SCP02 session
                    Note that default GP test keys are used (gpDefaultStaticKeys).
                    If card keys have been personlized, you must provide them
                    in order to successfully initiate a new secure session.
                */

                // console.log();
                // console.log(`Initiating SCP02 session`);

                // const scp = new GP.SCP02(event.card).setStaticKeys(GP.values.defaultStaticKeys).setSecurityLevel(3);

                // scp.initAndAuth()
                //     .then(()=>{
                //         console.log('Secure session established');
                //         console.log();
                //         const getCardDataCmd = new CommandApdu('80CA0066'); // getting card info. This command wil be transformed before submission
                //         event.card.issueCommand(getCardDataCmd)
                //             .then((cardDataResponse) => {
                //                 console.log(cardDataResponse);
                //             })
                //             .catch((error) => {
                //                 console.log('Error getting card info');
                //                 console.log(error);
                //             })
                //     })
                //     .catch((error) => {
                //         console.error('SCP02 error:');
                //         console.error(error);
                //         console.log();
                //     })
            })
            .catch((e) => {
                console.log();
                console.error(e);
                console.log();
            })
    })
}));


```
