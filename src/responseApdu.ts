import { binDataToBuffer } from './utils';
import statusDecode from './statusDecode';

export default class ResponseApdu {
    static readonly maxDataBytes = 256;
    private buffer: Buffer = Buffer.alloc(ResponseApdu.maxDataBytes);
    private bLength: number = 2

    static from(data: string | number[] | Buffer | ArrayBuffer | ArrayBufferView | ResponseApdu): ResponseApdu {
        return new ResponseApdu(data);
    }

    constructor(data?: string | number[] | Buffer | ArrayBuffer | ArrayBufferView | ResponseApdu) {
        if (typeof data === 'undefined')
            return this;

        return this.from(data);
    }

    from(data: string | number[] | Buffer | ArrayBuffer | ArrayBufferView | ResponseApdu): ResponseApdu {
        let inBuffer = Buffer.alloc(0);
        if (data instanceof ResponseApdu) {
            inBuffer = data.toBuffer();
        } else {
            inBuffer = binDataToBuffer(data);
        }
        if (inBuffer.byteLength > (ResponseApdu.maxDataBytes + 2)) {
            throw new Error(`Expected at most ${ResponseApdu.maxDataBytes + 2} bytes of input data, received: ${inBuffer.byteLength} bytes`);
        }
        if (inBuffer.byteLength < 2) {
            throw new Error(`Expected at least 2 bytes of input data, received: ${inBuffer.byteLength} bytes`);
        }
        inBuffer.copy(this.buffer, 0, 0, inBuffer.byteLength);
        this.bLength = inBuffer.byteLength
        return this;
    }

    toArray(): number[] {
        return [...this.buffer.subarray(0, this.bLength)];
    }

    toBuffer(): Buffer {
        const result = Buffer.alloc(this.bLength);
        this.buffer.copy(result, 0, 0, this.bLength);
        return result;
    }

    toString(): string {
        return this.buffer.subarray(0, this.bLength).toString('hex');
    }

    get byteLength(): number {
        return this.bLength;
    }

    get data(): Buffer {
        return this.toBuffer().subarray(0, -2);
    }

    get dataLength(): number {
        return this.bLength -2;
    }

    get status(): Buffer {
        return this.toBuffer().subarray(-2);
    }

    /** Tries to decode response status and returns a descriptive string. */
    get meaning(): string {
        return statusDecode(this.buffer.subarray(-2));
    }

    /** Returns `true` if resporse status(SW1+SW2) is `0x9000` */
    get isOk(): boolean {
        if((this.buffer.at(-2) === 0x90) && (this.buffer.at(-1) === 0x00))
            return true;
        return false;
    }

    /** Returns `true` if resporse SW1 is `0x61` */
    get hasMoreBytesAvailable(): boolean {
        if ((this.buffer.at(-2) === 0x61))
            return true;
        return false;
    }

    /** Returns `true` if resporse SW1 is `0x6C` */
    get isWrongLe(): boolean {
        if ((this.buffer.at(-2) === 0x6c))
            return true;
        return false;
    }

    /**
     * In case response status SW1 is `0x61` or `0x6CXX`, returns SW2.
     * 
     * `0` otherwise.
     */
    get availableResponseBytes(): number {
        if ((this.buffer.at(-2) === 0x61) || (this.buffer.at(-2) === 0x6c))
            return this.buffer.at(-1)!;
        return 0;
    }
}

export function assertResponseIsOk(resp: ResponseApdu): void {
    if (!resp.isOk) {
        throw new Error(`Error response: [${resp.toString()}](${resp.meaning})`);
    }
}
