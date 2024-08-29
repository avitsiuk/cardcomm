import { bufferToArray, hexToArray, arrayToHex } from './utils';
import statusDecode from './statusDecode';

export default class ResponseApdu {
    private _byteArray: number[] = [];
    private _status: number[] = [];
    private _data: number[] = [];

    static from(data: string | number[] | Buffer | ArrayBuffer | ArrayBufferView | ResponseApdu): ResponseApdu {
        return new ResponseApdu(data);
    }

    constructor(data?: string | number[] | Buffer | ArrayBuffer | ArrayBufferView | ResponseApdu) {

        if (typeof data === 'undefined')
            return this;

        return this.from(data);
    }

    from(data: string | number[] | Buffer | ArrayBuffer | ArrayBufferView | ResponseApdu): ResponseApdu {
        if (typeof data === 'undefined')
            return this;

        let numArray: number[] = [];

        if (typeof data === 'string') {
            numArray = hexToArray(data);
        } else if (Buffer.isBuffer(data)) {
            numArray = [...data];
        } else if (data instanceof ArrayBuffer) {
            numArray = [...new Uint8Array(data)];
        } else if (ArrayBuffer.isView(data)) {
            numArray = [...new Uint8Array(data.buffer)];
        } else if (data instanceof ResponseApdu) {
            numArray = data.toArray();
        } else if (Array.isArray(data)) {
            numArray = data;
        } else {
            throw new TypeError('Accepted ResponseApdu constructor types: hex string, number[], Buffer, ArrayBuffer, ArrayBufferView, ResponseApdu');
        }
        this.fromArray(numArray);
        return this;
    }

    fromArray(data: number[]) {
        this._byteArray = data;
        this._status = [];
        this._data = [];
        if (data.length >= 2) {
            this._data = this._byteArray.slice(0, -2);
            this._status = this._byteArray.slice(-2);
        } else {
            this._status = this._byteArray;
        }
        return this;
    }

    fromBuffer(data: Buffer): this {
        return this.fromArray(bufferToArray(data));
    }

    fromString(data: string): this {
        return this.fromArray(hexToArray(data));
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

    /** Tries to decode response status and returns a descriptive string. */
    get meaning(): string {
        return statusDecode(this.status);
    }

    /** Returns `true` if resporse status(SW1+SW2) is `0x9000` */
    get isOk(): boolean {
        if (
            this.length >= 2 &&
            this.status[0] === 0x90 &&
            this.status[1] === 0x00
        )
            return true;
        return false;
    }

    /** Returns `true` if resporse SW1 is `0x61` */
    get hasMoreBytesAvailable(): boolean {
        if (this.length >= 2 && this.status[0] === 0x61) return true;
        return false;
    }

    /** Returns `true` if resporse SW1 is `0x6C` */
    get isWrongLe(): boolean {
        if (this.length >= 2 && this.status[0] === 0x6c) return true;
        return false;
    }

    /**
     * In case response status SW1 is `0x61` or `0x6CXX`, returns SW2.
     * 
     * `0` otherwise.
     */
    get availableResponseBytes(): number {
        if (this.length >= 2) {
            if (this.status[0] === 0x61 || this.status[0] === 0x6c)
                return this.status[1];
        }
        return 0;
    }
}

export function assertResponseIsOk(resp: ResponseApdu): void {
    if (!resp.isOk) {
        throw new Error(`Error response: [${resp.toString()}](${resp.meaning})`);
    }
}
