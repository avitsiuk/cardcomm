import pcsclite from 'pcsclite';

import { CardReader, PCSCLite } from './typesPcsclite';
import { EventEmitter } from 'events';
import Device from './device';
import { IDevices, TDevicesEventName } from './typesInternal';


class Devices implements IDevices {
    _eventEmitter = new EventEmitter();
    pcsc: PCSCLite = pcsclite();
    devices: {[key: string]: Device} = {};

    constructor() {
        this.pcsc.on('reader', (reader: CardReader) => {
            const device = new Device(reader);
            this.devices[reader.name] = device;
            this._eventEmitter.emit('device-activated', { device, devices: this.listDevices() });
            reader.on('end', () => {
                delete this.devices[reader.name];
                this._eventEmitter.emit('device-deactivated', {
                    device,
                    devices: this.listDevices(),
                });
            });
            reader.on('error', (error) => {
                this._eventEmitter.emit('error', { reader, error });
            });
        });

        this.pcsc.on('error', (error) => {
            this._eventEmitter.emit('error', { error });
        });
    }

    onActivated(): Promise<{ device: Device, devices: IDevices }> {
        return new Promise((resolve, reject) => {
            this.on('device-activated', (event) => resolve(event));
        });
    }

    onDeactivated(): Promise<{ device: Device, devices: IDevices }> {
        return new Promise((resolve, reject) => {
            this.on('device-deactivated', (event) => resolve(event));
        });
    }

    listDevices(): Device[] {
        return Object.values(this.devices);
    }

    lookup(name: string): Device | null {
        if (this.devices[name]) {
            return this.devices[name];
        }
        return null;
    }

    toString() {
        return `Devices('${this.listDevices()}')`;
    }

    on(eventName: 'device-activated', eventHandler: (event: { device: Device, devices: Devices }) => void): Devices;
    on(eventName: 'device-deactivated', eventHandler: (event: { device: Device, devices: Devices }) => void): Devices;
    on(eventName: TDevicesEventName, eventHandler: (event: any) => any): Devices {
        this._eventEmitter.on(eventName, eventHandler);
        return this;
    }

    once(eventName: 'device-activated', eventHandler: (event: { device: Device, devices: Devices }) => void): Devices;
    once(eventName: 'device-deactivated', eventHandler: (event: { device: Device, devices: Devices }) => void): Devices;
    once(eventName: TDevicesEventName, eventHandler: (event: any) => any): Devices {
        this._eventEmitter.on(eventName, eventHandler);
        return this;
    }
}

export default Devices;
