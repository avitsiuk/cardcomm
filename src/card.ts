import { EventEmitter } from 'events';
import { hexEncode, importBinData, TBinData } from './utils';
import { CommandApdu } from './commandApdu';
import ResponseApdu from './responseApdu';
import { ICard, IDevice, TCardEventName } from './typesInternal';
import * as Iso7816Commands from './iso7816/commands';

/** Response APDU max size(256 for data + 2 for status) */
const maxTrResLen = 258;

class Card implements ICard {
    private _isBusy: boolean;
    private _eventEmitter = new EventEmitter();
    private _device: IDevice;
    private _protocol: number;
    private _atr: Uint8Array;
    private _atrHex: string;
    private _autoGetResponse: boolean = true;
    private _commandTransformer:
        | undefined
        | ((cmd: CommandApdu) => CommandApdu);
    private _responseTransformer:
        | undefined
        | ((rsp: ResponseApdu) => ResponseApdu);

    constructor(device: IDevice, atr: Uint8Array, protocol: number) {
        this._device = device;
        this._protocol = protocol;
        this._atr = new Uint8Array(atr.byteLength);
        importBinData(atr, this._atr);
        this._atrHex = hexEncode(this._atr);
        this._isBusy = false;
    }

    get protocol(): number {
        return this._protocol;
    }

    get atr(): Uint8Array {
        return this._atr;
    }

    get atrHex(): string {
        return this._atrHex;
    }

    isBusy(): boolean {
        return this._isBusy;
    }

    toString() {
        return `Card(atr:0x${this.atrHex})`;
    }

    /** Function that transforms each command before sending;
     * Can be used to add secure session authentication
     */
    setCommandTransformer(func?: (cmd: CommandApdu) => CommandApdu): this {
        this._commandTransformer = func;
        return this;
    }

    /** Function that transforms each command before sending;
     * Can be used to add secure session authentication
     */
    get commandTransformer(): undefined | ((cmd: CommandApdu) => CommandApdu) {
        return this._commandTransformer;
    }

    private _doCommandTransform(cmd: CommandApdu): CommandApdu {
        if (typeof this._commandTransformer === 'undefined') {
            return cmd;
        } else {
            return this._commandTransformer(cmd);
        }
    }

    /** Function that transforms each response before returning it;
     * Can be used to add secure session authentication
     */
    setResponseTransformer(func?: (rsp: ResponseApdu) => ResponseApdu): this {
        this._responseTransformer = func;
        return this;
    }

    /** Function that transforms each response before returning it;
     * Can be used to add secure session authentication
     */
    get responseTransformer():
        | undefined
        | ((rsp: ResponseApdu) => ResponseApdu) {
        return this._responseTransformer;
    }

    private _doResponseTransform(rsp: ResponseApdu): ResponseApdu {
        if (typeof this._responseTransformer === 'undefined') {
            return rsp;
        } else {
            return this._responseTransformer(rsp);
        }
    }

    /**
     * If set to true(default), `GET_RESPONSE` APDU gets sent automatically upon receiving `0x61XX` response.
     * Also the command `Le` value gets corrected and commands is sent again upon receiving `0x6CXX` response.
     */
    setAutoGetResponse(val: boolean = true): this {
        this._autoGetResponse = val;
        return this;
    }

    /**
     * If set to true(default), `GET_RESPONSE` APDU gets sent automatically upon receiving `0x61XX` response.
     * Also the command `Le` value gets corrected and commands is sent again upon receiving `0x6CXX` response.
     */
    set autoGetResponse(val: boolean) {
        this._autoGetResponse = val;
    }

    /** Current state of the autoGetResponse feature */
    get autoGetResponse(): boolean {
        return this._autoGetResponse;
    }

    private _issueCmdInternal(
        cmd: CommandApdu,
        callback: (err: any, response: ResponseApdu) => void,
    ): void {
        this._isBusy = true;
        let doCommandTransform: boolean = true;
        const respAcc = new ResponseApdu(); // response accumulator
        let middleCallback: (err: any, response: Uint8Array) => void;
        if (!this.autoGetResponse) {
            middleCallback = (err: any, respBuffer: Uint8Array) => {
                if (respBuffer.byteLength < 2) {
                    this._isBusy = false;
                    callback(
                        new Error(`Error response: [${hexEncode(respBuffer)}]`),
                        new ResponseApdu(),
                    );
                    return;
                }
                let response: ResponseApdu;
                try {
                    response = new ResponseApdu(respBuffer);
                } catch (error) {
                    this._isBusy = false;
                    callback(
                        new Error(`Error response: [${hexEncode(respBuffer)}]`),
                        new ResponseApdu(),
                    );
                    return;
                }
                this._eventEmitter.emit('response-received', {
                    card: this,
                    command: cmd,
                    response,
                });
                try {
                    response = this._doResponseTransform(response);
                } catch (error: any) {
                    this._isBusy = false;
                    callback(
                        new Error(
                            `Error transformng response: ${error.message}`,
                        ),
                        new ResponseApdu(),
                    );
                    return;
                }
                this._isBusy = false;
                callback(err, response);
            };
        } else {
            middleCallback = (err: any, respBuffer: Uint8Array) => {
                if (respBuffer.byteLength < 2) {
                    this._isBusy = false;
                    callback(
                        new Error(`Error response: [${hexEncode(respBuffer)}]`),
                        new ResponseApdu(),
                    );
                    return;
                }
                let response: ResponseApdu;
                try {
                    response = new ResponseApdu(respBuffer);
                } catch (error) {
                    this._isBusy = false;
                    callback(
                        new Error(`Error response: [${hexEncode(respBuffer)}]`),
                        new ResponseApdu(),
                    );
                    return;
                }
                this._eventEmitter.emit('response-received', {
                    card: this,
                    command: cmd,
                    response,
                });
                try {
                    response = this._doResponseTransform(response);
                } catch (error: any) {
                    this._isBusy = false;
                    callback(
                        new Error(
                            `Error transformng response: ${error.message}`,
                        ),
                        new ResponseApdu(),
                    );
                    return;
                }

                const bytesToGet = response.availableResponseBytes;
                if (bytesToGet > 0) {
                    if (response.dataLength > 0) respAcc.addData(response.data);
                    let cmdToResend: CommandApdu | undefined;
                    switch (true) {
                        case response.hasMoreBytesAvailable:
                            cmdToResend = Iso7816Commands.getResponse(
                                response.availableResponseBytes,
                            );
                            doCommandTransform = false;
                            break;
                        case response.isWrongLe:
                            cmdToResend = new CommandApdu(cmd).setLe(
                                response.availableResponseBytes,
                            );
                            break;
                        default:
                            break;
                    }

                    if (typeof cmdToResend === 'undefined') {
                        this._isBusy = false;
                        callback(
                            err,
                            respAcc
                                .addData(response.data)
                                .setStatus(response.status),
                        );
                    } else {
                        if (doCommandTransform) {
                            try {
                                cmdToResend =
                                    this._doCommandTransform(cmdToResend);
                            } catch (error: any) {
                                this._isBusy = false;
                                callback(
                                    new Error(
                                        `Error transformng command: ${error.message}`,
                                    ),
                                    new ResponseApdu(),
                                );
                                return;
                            }
                        } else {
                            doCommandTransform = true;
                        }
                        this._eventEmitter.emit('command-issued', {
                            card: this,
                            command: cmdToResend,
                        });
                        try {
                            this._device.transmit(
                                cmdToResend.toByteArray(),
                                maxTrResLen,
                                this._protocol,
                                middleCallback,
                            );
                        } catch (error: any) {
                            this._isBusy = false;
                            callback(
                                new Error(
                                    `Command transmission error: ${error.message}`,
                                ),
                                new ResponseApdu(),
                            );
                            return;
                        }
                    }
                } else {
                    this._isBusy = false;
                    callback(
                        err,
                        respAcc
                            .addData(response.data)
                            .setStatus(response.status),
                    );
                }
            };
        }

        let tCmd = cmd;
        if (doCommandTransform) {
            try {
                tCmd = this._doCommandTransform(cmd);
            } catch (error: any) {
                this._isBusy = false;
                callback(
                    new Error(`Error transformng command: ${error.message}`),
                    new ResponseApdu(),
                );
                return;
            }
            doCommandTransform = true;
        }

        this._eventEmitter.emit('command-issued', {
            card: this,
            command: tCmd,
        });

        try {
            this._device.transmit(
                tCmd.toByteArray(),
                maxTrResLen,
                this._protocol,
                middleCallback,
            );
        } catch (error: any) {
            this._isBusy = false;
            callback(
                new Error(`Command transmission error: ${error.message}`),
                new ResponseApdu(),
            );
            return;
        }
    }

    /** Submits CommandAPDU and calls provided callback upon completion */
    issueCommand(
        command: TBinData | CommandApdu,
        callback: (err: any, response: ResponseApdu) => void,
    ): void;
    /** Submits CommandAPDU and resolves upon completion */
    issueCommand(command: TBinData | CommandApdu): Promise<ResponseApdu>;
    issueCommand(
        command: TBinData | CommandApdu,
        callback?: (err: any, response: ResponseApdu) => void,
    ): void | Promise<ResponseApdu> {
        let cmd: CommandApdu;
        if (command instanceof CommandApdu) {
            cmd = command;
        } else {
            try {
                cmd = new CommandApdu(command);
            } catch (error: any) {
                throw new Error(`Command APDU error: ${error.message}`);
            }
        }

        let checkingErr: Error | undefined;

        if (cmd.byteLength < 4) {
            checkingErr = new Error(
                `Command too short; Min: 5 bytes; Received: ${cmd.byteLength} bytes; cmd: [${cmd.toString()}]`,
            );
        } else if (cmd.byteLength === 6) {
            if (cmd.getLc() === 0) {
                checkingErr = new Error(
                    `If Lc = 0, it should be omitted; cmd: [${cmd.toString()}]`,
                );
            }
            checkingErr = new Error(
                `Lc or Data missing; cmd: [${cmd.toString()}]`,
            );
        } else if (cmd.data.byteLength > CommandApdu.MAX_DATA_BYTE_LENGTH) {
            checkingErr = new Error(
                `Command data too long; Max: ${CommandApdu.MAX_DATA_BYTE_LENGTH} bytes; Received: ${cmd.data.byteLength} bytes; cmd: [${cmd.toString()}]`,
            );
        } else if (cmd.getLc() !== cmd.getData().length) {
            checkingErr = new Error(
                `Lc and actual data length discrepancy; Lc:${cmd.getLc()} actual: ${cmd.getData().length}; cmd: [${cmd.toString()}]`,
            );
        }

        if (callback) {
            if (checkingErr) {
                callback(checkingErr, new ResponseApdu([]));
                return;
            }
            try {
                this._issueCmdInternal(cmd, callback);
            } catch (error: any) {
                callback(
                    new Error(
                        `Error sending command to card: ${error.message}`,
                    ),
                    ResponseApdu.from([]),
                );
                return;
            }
            return;
        } else {
            return new Promise((resolve, reject) => {
                if (checkingErr) {
                    return reject(checkingErr);
                }
                const callback = (err: any, resp: ResponseApdu) => {
                    if (err) {
                        return reject(err);
                    } else {
                        return resolve(resp);
                    }
                };
                try {
                    this._issueCmdInternal(cmd, callback);
                } catch (error: any) {
                    return reject(
                        new Error(
                            `Error sending command to card: ${error.message}`,
                        ),
                    );
                }
            });
        }
    }

    /** Emitted upon submitting command to card. Event's command apdu is the actual command submitted to the card, after transformer has been applied (if any) */
    on(
        eventName: 'command-issued',
        eventHandler: (event: { card: Card; command: CommandApdu }) => void,
    ): Card;
    /** Emitted upon receiving response from card. Event's response apdu is the actual response received from the card, before transformation (if any) */
    on(
        eventName: 'response-received',
        eventHandler: (event: {
            card: Card;
            command: CommandApdu;
            response: ResponseApdu;
        }) => void,
    ): Card;
    on(eventName: TCardEventName, eventHandler: (event: any) => void): Card {
        this._eventEmitter.on(eventName, eventHandler);
        return this;
    }

    /** Emitted upon submitting command to card. Event's command apdu is the actual command submitted to the card, after transformer has been applied (if any) */
    once(
        eventName: 'command-issued',
        eventHandler: (event: { card: Card; command: CommandApdu }) => void,
    ): Card;
    /** Emitted upon receiving response from card. Event's response apdu is the actual response received from the card, before transformation (if any) */
    once(
        eventName: 'response-received',
        eventHandler: (event: {
            card: Card;
            command: CommandApdu;
            response: ResponseApdu;
        }) => void,
    ): Card;
    once(eventName: TCardEventName, eventHandler: (event: any) => void): Card {
        this._eventEmitter.once(eventName, eventHandler);
        return this;
    }
}

export default Card;
