import { EventEmitter } from 'events';
import { CommandApdu } from './commandApdu';
import ResponseApdu from './responseApdu';
import { ICard, IDevice, TCardEventName } from './typesInternal';

class Card implements ICard {
    _eventEmitter = new EventEmitter();
    device: IDevice;
    protocol: number;
    atr: string

    constructor(device: IDevice, atr: Buffer, protocol: number) {
        this.device = device;
        this.protocol = protocol;
        this.atr = atr.toString('hex');
    }

    getAtr() {
        return this.atr;
    }

    toString() {
        return `Card(atr:'${this.atr}')`;
    }

    issueCommand(
        commandApdu: string | number[] | Buffer | CommandApdu,
        callback?: (err: any, response: Buffer) => void,
    ): void | Promise<Buffer> {
        let buffer: Buffer;
        if (Array.isArray(commandApdu)) {
            buffer = Buffer.from(commandApdu);
        } else if (typeof commandApdu === 'string') {
            buffer = Buffer.from(commandApdu, 'hex');
        } else if (Buffer.isBuffer(commandApdu)) {
            buffer = commandApdu;
        } else {
            buffer = commandApdu.toBuffer();
        }

        const command = new CommandApdu({bytes: buffer});

        const protocol = this.protocol;

        this._eventEmitter.emit('command-issued', { card: this, command });
        if (callback) {
            this.device.transmit(buffer, 0x102, protocol, (err, response) => {
                this._eventEmitter.emit('response-received', {
                    card: this,
                    command,
                    response: new ResponseApdu(response),
                });
                callback(err, response);
            });
        } else {
            return new Promise((resolve, reject) => {
                this.device.transmit(buffer, 0x102, protocol, (err, response) => {
                    if (err) reject(err);
                    else {
                        this._eventEmitter.emit('response-received', {
                            card: this,
                            command: commandApdu,
                            response: new ResponseApdu(response),
                        });
                        resolve(response);
                    }
                });
            });
        }
    }

    on(eventName: 'command-issued', eventHandler: (event: {card: Card, command: CommandApdu}) => void): Card;

    on(eventName: 'response-received', eventHandler: (event: { card: Card, command: CommandApdu, response: ResponseApdu }) => void): Card;

    on(eventName: TCardEventName, eventHandler: (event: any) => void): Card {
        this._eventEmitter.on(eventName, eventHandler);
        return this;
    }

    once(eventName: 'command-issued', eventHandler: (event: {card: Card, command: CommandApdu}) => void): Card;

    once(eventName: 'response-received', eventHandler: (event: { card: Card, command: CommandApdu, response: ResponseApdu }) => void): Card;

    once(eventName: TCardEventName, eventHandler: (event: any) => void): Card {
        this._eventEmitter.once(eventName, eventHandler);
        return this;
    }
}

export default Card;
