import { importBinData } from './utils';
import statusDecode from './statusDecode';

export default class ResponseApdu {
    static readonly maxDataBytes = 256;
    private buffer: ArrayBuffer = new ArrayBuffer(ResponseApdu.maxDataBytes + 2);
    private bufferView = new Uint8Array(this.buffer);
    private bLength: number = 2

    static from(data?: string | number[] | Buffer | ArrayBuffer | ArrayBufferView | ResponseApdu): ResponseApdu {
        return new ResponseApdu(data);
    }

    constructor(data?: string | number[] | Buffer | ArrayBuffer | ArrayBufferView | ResponseApdu) {
        this.clear();
        if (typeof data === 'undefined')
            return this;

        return this.from(data);
    }

    from(data: string | number[] | Buffer | ArrayBuffer | ArrayBufferView | ResponseApdu): ResponseApdu {
        let inBuffer = new ArrayBuffer(0);
        if (data instanceof ResponseApdu) {
            inBuffer = data.toBuffer().buffer.slice(0, data.bLength);
        } else {
            try {
                inBuffer = importBinData(data);
            } catch (error: any) {
                throw new Error(`Could not create ResponseAPDU from provided data: ${error.message}`);
            }
        }
        if (inBuffer.byteLength < 2) {
            throw new Error(`Expected at least 2 bytes of input data, received: ${inBuffer.byteLength} bytes`);
        }
        if (inBuffer.byteLength > (ResponseApdu.maxDataBytes + 2)) {
            throw new Error(`Expected at most ${ResponseApdu.maxDataBytes + 2} bytes of input data, received: ${inBuffer.byteLength} bytes`);
        }
        const inView = new Uint8Array(inBuffer);
        this.bufferView.set(inView, 0);
        this.bLength = inBuffer.byteLength
        return this;
    }

    toArray(): number[] {
        return [...new Uint8Array(this.buffer, 0, this.bLength)];
    }

    /** Returned Buffer will reference same memory as this ResponseAPDU, meaning that any change made to it will reflect on this ResponseAPDU */
    toBuffer(): Buffer {
        return Buffer.from(this.buffer, 0, this.bLength);
    }

    toString(): string {
        return Buffer.from(this.buffer, 0, this.bLength).toString('hex');
    }

    // clears this ResponseAPDU by setting it's content to "0x0000"
    clear(): this {
        this.bufferView.set([0,0], 0);
        this.bLength = 2;
        return this;
    }

    get byteLength(): number {
        return this.bLength;
    }

    get dataLength(): number {
        if (this.bLength <= 2) return 0;
        return this.bLength -2;
    }

    /** Returned Buffer will reference same memory as this ResponseAPDU, meaning that any change made to it will reflect on this ResponseAPDU */
    getData(): Buffer {
        return Buffer.from(this.buffer, 0, this.dataLength);
    }

    /** Returned Buffer will reference same memory as this ResponseAPDU, meaning that any change made to it will reflect on this ResponseAPDU */
    get data(): Buffer {
        return this.getData();
    }

    setData(data: string | number[] | Buffer | ArrayBuffer | ArrayBufferView): this {
        const sw1 = this.bufferView[this.bLength-2];
        const sw2 = this.bufferView[this.bLength-1];
        let dataArrayBuffer: ArrayBuffer = new ArrayBuffer(0);
        try {
            dataArrayBuffer = importBinData(data);
        } catch (error: any) {
            throw new Error(`Could not set ResponseAPDU data field: ${error.message}`);
        }
        if (dataArrayBuffer.byteLength > ResponseApdu.maxDataBytes)
            throw new Error(`Could not set ResponseAPDU data field. Data too long. Max: ${ResponseApdu.maxDataBytes} bytes; Received: ${dataArrayBuffer.byteLength} bytes`);
        this.bufferView.set(new Uint8Array(dataArrayBuffer), 0);
        this.bufferView.set([sw1, sw2], dataArrayBuffer.byteLength);
        this.bLength = dataArrayBuffer.byteLength + 2;
        return this;
    }

    set data(data: string | number[] | Buffer | ArrayBuffer | ArrayBufferView) {
        this.setData(data);
    }

    /** Returned Buffer will reference same memory as this ResponseAPDU, meaning that any change made to it will reflect on this ResponseAPDU */
    getStatus(): Buffer {
        return Buffer.from(this.buffer, this.dataLength, 2);
    }

    /** Returned Buffer will reference same memory as this ResponseAPDU, meaning that any change made to it will reflect on this ResponseAPDU */
    get status(): Buffer {
        return this.getStatus();
    }

    setStatus(data: string | number[] | Buffer | ArrayBuffer | ArrayBufferView): this {
        let dataArrayBuffer: ArrayBuffer = new ArrayBuffer(0);
        try {
            dataArrayBuffer = importBinData(data);
        } catch (error: any) {
            throw new Error(`Could not set ResponseAPDU status field: ${error.message}`);
        }
        if (dataArrayBuffer.byteLength !== 2)
            throw new Error(`Could not set ResponseAPDU status field. Expected exactly 2 bytes of data; Received: ${dataArrayBuffer.byteLength} bytes`);
        this.bufferView.set(new Uint8Array(dataArrayBuffer), this.dataLength);
        return this;
    }

    set status(data: string | number[] | Buffer | ArrayBuffer | ArrayBufferView) {
        this.setStatus(data);
    }

    /** Tries to decode response status and returns a descriptive string. */
    get meaning(): string {
        return statusDecode(this.status);
    }

    /** Returns `true` if resporse status(SW1+SW2) is `0x9000` */
    get isOk(): boolean {
        if((this.status.readUint8(0) === 0x90) && (this.status.readUint8(1) === 0x00))
            return true;
        return false;
    }

    /** Returns `true` if resporse SW1 is `0x61` */
    get hasMoreBytesAvailable(): boolean {
        if ((this.status.readUint8(0) === 0x61))
            return true;
        return false;
    }

    /** Returns `true` if resporse SW1 is `0x6C` */
    get isWrongLe(): boolean {
        if ((this.status.readUint8(0) === 0x6c))
            return true;
        return false;
    }

    /**
     * In case response status SW1 is `0x61` or `0x6CXX`, returns SW2.
     * 
     * `0` otherwise.
     */
    get availableResponseBytes(): number {
        if ((this.status.readUint8(0) === 0x61) || (this.status.readUint8(0) === 0x6c))
            return this.status.readUint8(1);
        return 0;
    }
}

export function assertResponseIsOk(resp: ResponseApdu): void {
    if (!resp.isOk) {
        throw new Error(`Error response: [${resp.toString()}](${resp.meaning})`);
    }
}
