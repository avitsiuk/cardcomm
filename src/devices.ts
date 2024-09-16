import { EventEmitter } from 'events';
import pcsclite from 'pcsclite';
import { CardReader, PCSCLite } from './typesPcsclite';
import { IDevicesManager, TDevicesManagerEventName } from './typesInternal';
import Device from './device';

class PcscDevicesManager implements IDevicesManager {
    private _eventEmitter = new EventEmitter();
    private pcsc: PCSCLite = pcsclite();
    private _devices: { [key: string]: Device } = {};

    constructor() {
        this.pcsc.on('reader', (reader: CardReader) => {
            const device = new Device(reader);
            this._devices[reader.name] = device;
            this._eventEmitter.emit('device-activated', {
                device,
                devices: this.devices,
            });
            reader.on('end', () => {
                delete this._devices[reader.name];
                this._eventEmitter.emit('device-deactivated', {
                    device,
                    devices: this.devices,
                });
            });
            reader.on('error', (error) => {
                this._eventEmitter.emit('error', { reader, error });
            });
        });

        this.pcsc.on('error', (error) => {
            this._eventEmitter.emit('error', { error, devManager: this });
        });
    }

    close(): void {
        this.pcsc.close();
    }

    /** List of all currently connected devices */
    get devices(): { [key: string]: Device } {
        return this._devices;
    }

    /** Resolved upon `device-activated` event */
    onActivated(): Promise<{ device: Device; devManager: IDevicesManager }> {
        return new Promise((resolve, reject) => {
            this.once('device-activated', (event) => resolve(event));
        });
    }

    /** Resolved upon `device-deactivated` event */
    onDeactivated(): Promise<{ device: Device; devManager: IDevicesManager }> {
        return new Promise((resolve, reject) => {
            this.once('device-deactivated', (event) => resolve(event));
        });
    }

    /** Returns device under a given name (if any)
     * @param name - device name to lookup
     */
    lookup(name: string): Device | null {
        if (this._devices[name]) {
            return this._devices[name];
        }
        return null;
    }

    /** Emitted when a new device is detected */
    on(
        eventName: 'device-activated',
        eventHandler: (event: {
            device: Device;
            devManager: PcscDevicesManager;
        }) => void,
    ): PcscDevicesManager;
    /** Emitted when a device gets disconnected */
    on(
        eventName: 'device-deactivated',
        eventHandler: (event: {
            device: Device;
            devManager: PcscDevicesManager;
        }) => void,
    ): PcscDevicesManager;
    on(
        eventName: 'error',
        eventHandler: (event: {
            error: any;
            devManager: PcscDevicesManager;
        }) => void,
    ): PcscDevicesManager;
    on(
        eventName: TDevicesManagerEventName,
        eventHandler: (event: any) => void,
    ): PcscDevicesManager {
        this._eventEmitter.on(eventName, eventHandler);
        return this;
    }

    /** Emitted when a new device is detected */
    once(
        eventName: 'device-activated',
        eventHandler: (event: {
            device: Device;
            devManager: PcscDevicesManager;
        }) => void,
    ): PcscDevicesManager;
    /** Emitted when a device gets disconnected */
    once(
        eventName: 'device-deactivated',
        eventHandler: (event: {
            device: Device;
            devManager: PcscDevicesManager;
        }) => void,
    ): PcscDevicesManager;
    once(
        eventName: 'error',
        eventHandler: (event: {
            error: any;
            devManager: PcscDevicesManager;
        }) => void,
    ): PcscDevicesManager;
    once(
        eventName: TDevicesManagerEventName,
        eventHandler: (event: any) => void,
    ): PcscDevicesManager {
        this._eventEmitter.on(eventName, eventHandler);
        return this;
    }
}

export default PcscDevicesManager;
