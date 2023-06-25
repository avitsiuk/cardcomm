import { EventEmitter } from 'events';
import { arrayToHex, bufferToArray } from './utils';
import { CommandApdu } from './commandApdu';
import ResponseApdu from './responseApdu';
import { ICard, IDevice, TCardEventName } from './typesInternal';
import { getResponse } from './iso7816/commands';

/** Response APDU max size(256 for data + 2 for status) */
const maxTrResLen = 258;

class Card implements ICard {
    private _eventEmitter = new EventEmitter();
    private _device: IDevice;
    private _protocol: number;
    private _atr: number[];
    private _atrHex: string;
    private _autoGetResponse: boolean = false;
    private _transformer: undefined | ((cmd: CommandApdu) => CommandApdu);

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

    /** Function that transforms each command before sending;  
     * Can be used to add secure session authentication
    */
    setTransformer(
        func?: ((cmd: CommandApdu) => CommandApdu),
    ): this {
        this._transformer = func;
        return this;
    }

    /** Function that transforms each command before sending;  
     * Can be used to add secure session authentication
    */
    get transformer(): undefined | ((cmd: CommandApdu) => CommandApdu) {
        return this._transformer;
    }

    private _doTransform(cmd: CommandApdu): CommandApdu {
        if (typeof this._transformer === 'undefined') {
            return cmd;
        } else {
            return this._transformer(cmd);
        }
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
        const respAcc = new Array<number>(0); // response accumulator
        let middleCallback: (err: any, response: Buffer) => void;
        if (!this.autoGetResponse) {
            middleCallback = (err: any, respBuffer: Buffer) => {
                const response = new ResponseApdu(respBuffer);
                this._eventEmitter.emit('response-received', {
                    card: this,
                    command: cmd,
                    response,
                });
                callback(err, response);
            }
        } else {
            middleCallback = (err: any, respBuffer: Buffer) => {
                const response = new ResponseApdu(respBuffer);
                this._eventEmitter.emit('response-received', {
                    card: this,
                    command: cmd,
                    response,
                });

                const bytesToGet = response.availableResponseBytes();
                if (bytesToGet > 0) {
                    if(response.dataLength > 0) respAcc.push(...response.data);
                    let cmdToResend: CommandApdu | undefined;
                    switch (response.status[0]) {
                        case 0x61:
                            cmdToResend = getResponse(response.status[1]).setCla(cmd.getCla());
                            break;
                        case 0x6C:
                            cmdToResend = new CommandApdu(cmd).setLe(response.status[1]);
                            break;
                        default:
                            break;
                    }

                    // console.log(cmdToResend?.toString());

                    // callback(err, new ResponseApdu([...respAcc, ...response.toArray()]));

                    if(typeof cmdToResend === 'undefined') {
                        callback(err, new ResponseApdu([...respAcc, ...response.toArray()]));
                    } else {
                        cmdToResend = this._doTransform(cmdToResend);
                        this._eventEmitter.emit('command-issued', {
                            card: this,
                            command: cmdToResend,
                        });
                        this._device.transmit(
                            cmdToResend.toBuffer(),
                            maxTrResLen,
                            this._protocol,
                            middleCallback,
                        );
                    }
                } else {
                    callback(err, new ResponseApdu([...respAcc, ...response.toArray()]));
                }
            }
        }

        const tCmd = this._doTransform(cmd);

        this._eventEmitter.emit('command-issued', {
            card: this,
            command: tCmd,
        });

        this._device.transmit(
            tCmd.toBuffer(),
            maxTrResLen,
            this._protocol,
            middleCallback,
        );
    }

    issueCommand(command: string | number[] | Buffer | CommandApdu, callback: (err: any, response: ResponseApdu) => void): void;
    issueCommand(command: string | number[] | Buffer | CommandApdu): Promise<ResponseApdu>;
    issueCommand(
        command: string | number[] | Buffer | CommandApdu,
        callback?: (err: any, response: ResponseApdu) => void,
    ): void | Promise<ResponseApdu> {
        let cmd = new CommandApdu(command);

        if (cmd.length < 4) {
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
