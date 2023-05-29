import { EventEmitter } from 'node:events';
import { toHexString } from './utils';
import { IIso7816Application, TIso7816AppEventName } from './types';
import CommandApdu from './commandApdu';
import ResponseApdu from './responseApdu';
import Card from './card';

const ins = {
    APPEND_RECORD: 0xe2,
    ENVELOPE: 0xc2,
    ERASE_BINARY: 0x0e,
    EXTERNAL_AUTHENTICATE: 0x82,
    GET_CHALLENGE: 0x84,
    GET_DATA: 0xca,
    GET_RESPONSE: 0xc0,
    INTERNAL_AUTHENTICATE: 0x88,
    MANAGE_CHANNEL: 0x70,
    PUT_DATA: 0xda,
    READ_BINARY: 0xb0,
    READ_RECORD: 0xb2,
    SELECT_FILE: 0xa4,
    UPDATE_BINARY: 0xd6,
    UPDATE_RECORD: 0xdc,
    VERIFY: 0x20,
    WRITE_BINARY: 0xd0,
    WRITE_RECORD: 0xd2,
};

export class Iso7816Application implements IIso7816Application {
    _eventEmitter = new EventEmitter();
    card: Card;

    constructor(card: Card) {
        this.card = card;
    }

    async issueCommand(commandApdu: CommandApdu): Promise<ResponseApdu> {
        return this.card.issueCommand(commandApdu)!.then((resp) => {
            const response = new ResponseApdu(resp);
            if (response.hasMoreBytesAvailable()) {
                return this.getResponse(response.numberOfBytesAvailable()).then(
                    (response) => {
                        return response;
                    }
                );
            } else if (response.isWrongLength()) {
                commandApdu.setLe(response.correctLength());
                return this.issueCommand(commandApdu).then((response) => {
                    return response;
                });
            }
            return response;
        });
    }

    async selectFile(bytes: number[], p1: number = 0x04, p2: number = 0x00) {
        const commandApdu = new CommandApdu({
            cla: 0x00,
            ins: ins.SELECT_FILE,
            p1: p1 || 0x04,
            p2: p2 || 0x00,
            data: bytes,
        });
        return this.issueCommand(commandApdu).then((response) => {
            if (response.isOk()) {
                this._eventEmitter.emit('application-selected', {
                    application: toHexString(bytes),
                });
            }
            return response;
        });
    }

    getResponse(length: number) {
        return this.issueCommand(
            new CommandApdu({
                cla: 0x00,
                ins: ins.GET_RESPONSE,
                p1: 0x00,
                p2: 0x00,
                le: length,
            })
        );
    }

    readRecord(sfi: number, record: number) {
        return this.issueCommand(
            new CommandApdu({
                cla: 0x00,
                ins: ins.READ_RECORD,
                p1: record,
                p2: (sfi << 3) + 4,
                le: 0,
            })
        );
    }

    getData(p1: number, p2: number) {
        return this.issueCommand(
            new CommandApdu({
                cla: 0x00,
                ins: ins.GET_DATA,
                p1: p1,
                p2: p2,
                le: 0,
            })
        );
    }

    on(eventName: 'application-selected', eventHandler: (event: { application: string }) => void): Iso7816Application;
    on(eventName: TIso7816AppEventName, eventHandler: (event: any) => any): Iso7816Application {
        this._eventEmitter.on(eventName, eventHandler);
        return this;
    }

    once(eventName: 'application-selected', eventHandler: (event: { application: string }) => void): Iso7816Application;
    once(eventName: TIso7816AppEventName, eventHandler: (event: any) => any): Iso7816Application {
        this._eventEmitter.on(eventName, eventHandler);
        return this;
    }
}

export default Iso7816Application;
