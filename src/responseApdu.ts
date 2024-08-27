import { bufferToArray, hexToArray, arrayToHex } from './utils';
import statusDecode from './statusDecode';

export default class ResponseApdu {
    private _byteArray: number[] = [];
    private _status: number[] = [];
    private _data: number[] = [];

    constructor(resp?: string | number[] | Buffer | ResponseApdu) {
        this._byteArray = [];

        if (typeof resp !== 'undefined') {
            if (typeof resp === 'string') {
                this.fromString(resp);
            } else if (Array.isArray(resp)) {
                this.fromArray(resp);
            } else if (Buffer.isBuffer(resp)) {
                this.fromBuffer(resp);
            } else {
                if (resp.length > 0) this.fromArray(resp.toArray());
            }
        }
    }

    fromArray(array: number[]) {
        this._byteArray = array;
        if (array.length >= 2) {
            this._data = this._byteArray.slice(0, -2);
            this._status = this._byteArray.slice(-2);
        } else {
            this._status = this._byteArray;
        }
        return this;
    }

    fromBuffer(buffer: Buffer): this {
        return this.fromArray(bufferToArray(buffer));
    }

    fromString(str: string): this {
        return this.fromArray(hexToArray(str));
    }

    toArray(): number[] {
        return this._byteArray;
    }

    toBuffer(): Buffer {
        return Buffer.from(this.toArray());
    }

    toString(): string {
        return arrayToHex(this.toArray());
    }

    get length() {
        return this._byteArray.length;
    }

    get data(): number[] {
        return this._data;
    }

    get dataLength(): number {
        return this._data.length;
    }

    get status(): number[] {
        return this._status;
    }

    meaning(): string {
        return statusDecode(this.status);
    }

    isOk(): boolean {
        if (
            this.length >= 2 &&
            this.status[0] === 0x90 &&
            this.status[1] === 0x00
        )
            return true;
        return false;
    }

    hasMoreBytesAvailable(): boolean {
        if (this.length >= 2 && this.status[0] === 0x61) return true;
        return false;
    }

    isWrongLe(): boolean {
        if (this.length >= 2 && this.status[0] === 0x6c) return true;
        return false;
    }

    availableResponseBytes(): number {
        if (this.length >= 2) {
            if (this.status[0] === 0x61 || this.status[0] === 0x6c)
                return this.status[1];
        }
        return 0;
    }
}

export function assertOk(resp: ResponseApdu): void {
    if (!resp.isOk()) {
        throw new Error(`Error response: [${resp.toString()}]`);
    }
}
