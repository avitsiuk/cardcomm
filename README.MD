## About

This library expands upon original [`smartcard` library](https://github.com/tomkp/smartcard) by [tomkp](https://github.com/tomkp) and is built around [`pcsclite` library](https://github.com/santigimeno/node-pcsclite) by [Santiago Gimeno](https://github.com/santigimeno)  
[Original `smartcard` package](https://www.npmjs.com/package/smartcard) on NPM  
[`pcsclite` package](https://www.npmjs.com/package/pcsclite) on NPM

> Tested with `ACR39U` and `ACR122U` readers

## Dependencies and problems (Debian/Ubuntu)

### PCSC

Install basic dependencies by running  
`sudo apt install libpcsclite1 libpcsclite-dev pcscd`  
and check pcscd service status for any error with  
`service pcscd status`

Optionally install pcsc tools package  
`sudo apt install pcsc-tools`  
and check if your reader(s) and card(s) are working by executing  
`pcsc_scan`  
This should show all (contact and NFC) readers recognized by your system and print info about inserted cards (if any).


### NFC issues

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

### SCP02 crypto issues

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
