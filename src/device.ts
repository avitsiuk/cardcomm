import { EventEmitter } from 'events';
import { CardReader, Status } from './typesPcsclite';
import { IDevice, TDeviceEventName } from './typesInternal';
import { importBinData } from './utils';
import Card from './card';

export class Device implements IDevice {
    _eventEmitter = new EventEmitter();
    reader: CardReader;
    name: string;
    card: Card | null;

    constructor(reader: CardReader) {
        this.reader = reader;
        this.name = reader.name;
        this.card = null;

        const isCardInserted = (
            changes: number,
            reader: CardReader,
            status: Status,
        ) => {
            return (
                changes & reader.SCARD_STATE_PRESENT &&
                status.state & reader.SCARD_STATE_PRESENT
            );
        };

        const isCardRemoved = (
            changes: number,
            reader: CardReader,
            status: Status,
        ) => {
            return (
                changes & reader.SCARD_STATE_EMPTY &&
                status.state & reader.SCARD_STATE_EMPTY
            );
        };

        const cardInserted = (reader: CardReader, status: Status) => {
            reader.connect({ share_mode: 2 }, (err, protocol) => {
                if (err) {
                    this._eventEmitter.emit('error', err);
                } else {
                    this.card = new Card(
                        this,
                        status.atr ? importBinData(status.atr) : new Uint8Array(0),
                        protocol,
                    );
                    this._eventEmitter.emit('card-inserted', {
                        device: this,
                        card: this.card,
                    });
                }
            });
        };

        const cardRemoved = (reader: CardReader) => {
            const name = reader.name;
            reader.disconnect(reader.SCARD_LEAVE_CARD, (err) => {
                if (err) {
                    this._eventEmitter.emit('error', err);
                } else {
                    this._eventEmitter.emit('card-removed', {
                        name,
                        card: this.card,
                    });
                    this.card = null;
                }
            });
        };

        reader.on('status', (status: Status) => {
            const changes = reader.state ^ status.state;
            if (changes) {
                if (isCardRemoved(changes, reader, status)) {
                    cardRemoved(reader);
                } else if (isCardInserted(changes, reader, status)) {
                    cardInserted(reader, status);
                }
            }
        });
    }

    transmit(
        data: Uint8Array,
        res_len: number,
        protocol: number,
        cb: (err: any, response: Uint8Array) => void,
    ) {
        this.reader.transmit(Buffer.from(data), res_len, protocol, (err: any, response: Buffer) => {

            let u8Arr: Uint8Array = new Uint8Array(0);
            if (response) {
                u8Arr = new Uint8Array(response.buffer)
                .subarray(
                    response.byteOffset,
                    response.byteOffset + response.byteLength,
                );
            }
            cb(err, u8Arr);
        });
    }

    getName() {
        return this.name;
    }

    toString() {
        return `${this.getName()}`;
    }

    on(eventName: 'error', eventHandler: (error: any) => void): Device;
    on(
        eventName: 'card-inserted',
        eventHandler: (event: { device: Device; card: Card }) => void,
    ): Device;
    on(
        eventName: 'card-removed',
        eventHandler: (event: { name: string; card: Card }) => void,
    ): Device;
    on(
        eventName: TDeviceEventName,
        eventHandler: (event: any) => void,
    ): Device {
        this._eventEmitter.on(eventName, eventHandler);
        return this;
    }

    once(eventName: 'error', eventHandler: (error: any) => void): Device;
    once(
        eventName: 'card-inserted',
        eventHandler: (event: { device: Device; card: Card }) => void,
    ): Device;
    once(
        eventName: 'card-removed',
        eventHandler: (event: { name: string; card: Card }) => void,
    ): Device;
    once(
        eventName: TDeviceEventName,
        eventHandler: (event: any) => void,
    ): Device {
        this._eventEmitter.on(eventName, eventHandler);
        return this;
    }
}

export default Device;
