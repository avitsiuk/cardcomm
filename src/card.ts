import { EventEmitter } from 'events';
import { arrayToHex, bufferToArray } from './utils';
import { CommandApdu } from './commandApdu';
import ResponseApdu from './responseApdu';
import { ICard, IDevice, TCardEventName } from './typesInternal';

class Card implements ICard {
    private _eventEmitter = new EventEmitter();
    private _device: IDevice;
    private _protocol: number;
    private _atr: number[];
    private _atrHex: string;

    constructor(device: IDevice, atr: Buffer, protocol: number) {
        this._device = device;
        this._protocol = protocol;
        this._atr = bufferToArray(atr);
        this._atrHex = arrayToHex(this._atr);
    }

    get atr(): number[] {
        return this._atr;
    }

    get atrHex(): string {
        return this._atrHex;
    }

    toString() {
        return `Card(atr:0x${this.atrHex})`;
    }


    issueCommand(command: string | number[] | Buffer | CommandApdu, callback: (err: any, response: ResponseApdu) => void): void;
    issueCommand(command: string | number[] | Buffer | CommandApdu): Promise<ResponseApdu>;
    issueCommand(
        command: string | number[] | Buffer | CommandApdu,
        callback?: (err: any, response: ResponseApdu) => void,
    ): void | Promise<ResponseApdu> {
        let cmd = new CommandApdu();

        if (typeof command === 'string') {
            cmd.fromString(command);
        } else if (Array.isArray(command)) {
            cmd.fromArray(command);
        } else if (Buffer.isBuffer(command)) {
            cmd.fromBuffer(command);
        } else {
            cmd = command;
        };

        this._eventEmitter.emit('command-issued', { card: this, command });

        const resLen = 258;  //Response APDU max size(256 for data + 2 for status)
        if (callback) {
            this._device.transmit(cmd.toBuffer(), resLen, this._protocol, (err, respBuffer) => {
                const response = new ResponseApdu().fromBuffer(respBuffer);
                this._eventEmitter.emit('response-received', {
                    card: this,
                    command: cmd,
                    response,
                });
                callback(err, response);
            });
        } else {
            return new Promise((resolve, reject) => {
                this._device.transmit(cmd.toBuffer(), resLen, this._protocol, (err, respBuffer) => {
                    const response = new ResponseApdu().fromBuffer(respBuffer);
                    this._eventEmitter.emit('response-received', {
                        card: this,
                        command: cmd,
                        response,
                    });
                    if (err) {
                        reject(err);
                    } else {
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
