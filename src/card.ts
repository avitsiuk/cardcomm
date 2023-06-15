import { EventEmitter } from 'events';
import { arrayToHex, bufferToArray } from './utils';
import { CommandApdu } from './commandApdu';
import ResponseApdu from './responseApdu';
import { ICard, IDevice, TCardEventName } from './typesInternal';

/** Response APDU max size(256 for data + 2 for status) */
const maxTrResLen = 258;

class Card implements ICard {
    private _eventEmitter = new EventEmitter();
    private _device: IDevice;
    private _protocol: number;
    private _atr: number[];
    private _atrHex: string;
    private _autoGetResponse: boolean = false;

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

    /**
     * If set to true(default), `GET_RESPONSE APDU` gets sent automatically upon receiving `0x61XX` response.  
     * Also the command `Le` value gets corrected and commands is sent again upon receiving `0x6CXX` response.
     */
    setAutoGetResponse(val: boolean = true): this {
        this._autoGetResponse = val;
        return this;
    }

    get autoGetResponse(): boolean {
        return this._autoGetResponse;
    }

    private _issueCmdInternal(cmd: CommandApdu, callback: (err: any, response: ResponseApdu) => void ): void {
        let transmitCallback: (err: any, response: Buffer) => void;
        if (this.autoGetResponse) {
            transmitCallback = (err: any, respBuffer: Buffer) => {
                const response = new ResponseApdu(respBuffer);
                this._eventEmitter.emit('response-received', {
                    card: this,
                    command: cmd,
                    response,
                });
                if (response.status.length >= 2 && response.status[0] !== 0x90) {
                    if (response.status[0] === 0x61) {
                        const getRespCmd = new CommandApdu([0x00, 0xC0, 0x00, 0x00, response.status[1]]);
                        this._eventEmitter.emit('command-issued', {
                            card: this,
                            command: getRespCmd,
                        });
                        this._device.transmit(
                            getRespCmd.toBuffer(),
                            maxTrResLen,
                            this._protocol,
                            transmitCallback,
                        );
                    } else if (response.status[0] === 0x6C) {
                        const correctLeCmd = new CommandApdu(cmd).setLe(response.status[1]);
                        this._eventEmitter.emit('command-issued', {
                            card: this,
                            command: correctLeCmd,
                        });
                        this._device.transmit(
                            correctLeCmd.toBuffer(),
                            maxTrResLen,
                            this._protocol,
                            transmitCallback,
                        );
                    } else {
                        this._eventEmitter.emit('response-received', {
                            card: this,
                            command: cmd,
                            response,
                        });
                        callback(err, response);
                    }
                } else {
                    callback(err, response);
                }
            }
        } else {
            transmitCallback = (err: any, respBuffer: Buffer) => {
                const response = new ResponseApdu(respBuffer);
                this._eventEmitter.emit('response-received', {
                    card: this,
                    command: cmd,
                    response,
                });
                callback(err, response);
            }
        }

        this._eventEmitter.emit('command-issued', {
            card: this,
            command: cmd,
        });

        this._device.transmit(
            cmd.toBuffer(),
            maxTrResLen,
            this._protocol,
            transmitCallback,
        );
    }

    issueCommand(command: string | number[] | Buffer | CommandApdu, callback: (err: any, response: ResponseApdu) => void): void;
    issueCommand(command: string | number[] | Buffer | CommandApdu): Promise<ResponseApdu>;
    issueCommand(
        command: string | number[] | Buffer | CommandApdu,
        callback?: (err: any, response: ResponseApdu) => void,
    ): void | Promise<ResponseApdu> {
        let cmd = new CommandApdu(command);

        if (cmd.length < 5) {
            throw new Error(`Command too short; Min: 5 bytes; Received: ${cmd.length} bytes; cmd: [${cmd.toString()}]`);
        }

        if (cmd.length === 6) {
            if (cmd.getLc() === 0) {
                throw new Error(`If Lc = 0, it should be omitted; cmd: [${cmd.toString()}]`);
            }
            throw new Error(`Lc or Data missing; cmd: [${cmd.toString()}]`)
        }

        if (cmd.length > 261) {
            throw new Error(`Command too long; Max: 261 bytes; Received: ${cmd.length} bytes; cmd: [${cmd.toString()}]`);
        }

        if(cmd.getLc() !== cmd.getData().length) {
            throw new Error(`Lc and actual data length discrepancy; Lc:${cmd.getLc()} actual: ${cmd.getData().length}; cmd: [${cmd.toString()}]`);
        }

        if (callback) {
            this._issueCmdInternal(cmd, callback);
        } else {
            return new Promise((resolve, reject) => {
                const callback = (err: any, resp: ResponseApdu) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(resp);
                    }
                };
                this._issueCmdInternal(cmd, callback);
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
