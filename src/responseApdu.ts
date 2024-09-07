import {
    TBinData,
    importBinData,
    hexEncode,
} from './utils';
import statusDecode from './statusDecode';

export class ResponseApdu {
    private static readonly DEF_DATA_BYTES_LENGTH = 256; // no hard limit, but most of the responses will be within 256 bytes of data
    private byteArray: Uint8Array = new Uint8Array(ResponseApdu.DEF_DATA_BYTES_LENGTH + 2); // data + status(2)
    private bLength: number = 2

    static from(data?: TBinData | ResponseApdu): ResponseApdu {
        return new ResponseApdu(data);
    }

    constructor(data?: TBinData | ResponseApdu) {
        this.clear();
        if (typeof data === 'undefined')
            return this;

        return this.from(data);
    }

    from(inData: TBinData | ResponseApdu): ResponseApdu {
        let inBuffer: Uint8Array = new Uint8Array(0);
        if (inData instanceof ResponseApdu) {
            inBuffer = inData.toByteArray();
        } else {
            try {
                inBuffer = importBinData(inData)
            } catch (error: any) {
                throw new Error(`Could not create ResponseAPDU from provided data: ${error.message}`);
            }
        }
        if (inBuffer.byteLength < 2) {
            throw new Error(`Expected at least 2 bytes of input data, received: ${inBuffer.byteLength} bytes`);
        }
        if (this.byteArray.byteLength < inBuffer.byteLength) {
            this.byteArray = new Uint8Array(inBuffer.byteLength);
        }
        this.byteArray.set(inBuffer);
        this.bLength = inBuffer.byteLength
        return this;
    }

    /** Returned Uint8Array will reference same memory as this ResponseAPDU, meaning that any change made to it will reflect on this ResponseAPDU */
    toByteArray(): Uint8Array {
        return this.byteArray.subarray(0, this.bLength);
    }

    toString(): string {
        return hexEncode(this.toByteArray());
    }

    // clears this ResponseAPDU by setting it's content to "0x0000"
    clear(): this {
        this.byteArray.set([0,0]);
        this.bLength = 2;
        return this;
    }

    get byteLength(): number {
        return this.bLength;
    }

    get dataLength(): number {
        if (this.bLength <= 2) return 0;
        return this.bLength - 2;
    }

    /** Returned Buffer will reference same memory as this ResponseAPDU, meaning that any change made to it will reflect on this ResponseAPDU */
    getData(): Uint8Array {
        return this.toByteArray().subarray(0, this.dataLength);
    }

    /** Returned Buffer will reference same memory as this ResponseAPDU, meaning that any change made to it will reflect on this ResponseAPDU */
    get data(): Uint8Array {
        return this.getData();
    }

    setData(inData: TBinData): this {
        const sw1 = this.byteArray[this.bLength-2];
        const sw2 = this.byteArray[this.bLength-1];

        let inByteArray: Uint8Array;
        try {
            inByteArray = importBinData(inData);
        } catch (error: any) {
            throw new Error(`Could not set ResponseAPDU data field: ${error.message}`);
        }
        const requiredByteLength = inByteArray.byteLength + 2;

        if (requiredByteLength <= 2) {
            this.byteArray.set([sw1, sw2]);
            this.bLength = 2;
            return this;
        }

        if (this.byteArray.byteLength < requiredByteLength)
            this.byteArray = new Uint8Array(requiredByteLength)

        this.byteArray.set(inByteArray);
        this.byteArray.set([sw1, sw2], inByteArray.byteLength);
        this.bLength = requiredByteLength;
        return this;
    }

    set data(data: TBinData) {
        this.setData(data);
    }

    addData(inData: TBinData): this {
        let inByteArray: Uint8Array;
        try {
            inByteArray = importBinData(inData);
        } catch (error: any) {
            throw new Error(`Could not add data to ResponseAPDU: ${error.message}`);
        }

        if (inByteArray.byteLength <= 0) {
            return this;
        }

        const requiredByteLength = inByteArray.byteLength + this.bLength;

        const sw1 = this.byteArray[this.bLength-2];
        const sw2 = this.byteArray[this.bLength-1];

        if (this.byteArray.byteLength < requiredByteLength) {
            const newByteArray = new Uint8Array(requiredByteLength);
            newByteArray.set(this.data);
            this.byteArray = newByteArray;
        }

        this.byteArray.set(inByteArray, this.dataLength);
        this.byteArray.set([sw1, sw2], requiredByteLength - 2);
        this.bLength = requiredByteLength;
        return this;
    }

    /** Returned Buffer will reference same memory as this ResponseAPDU, meaning that any change made to it will reflect on this ResponseAPDU */
    getStatus(): Uint8Array {
        return this.byteArray.subarray(this.dataLength, this.bLength);
    }

    /** Returned Buffer will reference same memory as this ResponseAPDU, meaning that any change made to it will reflect on this ResponseAPDU */
    get status(): Uint8Array {
        return this.getStatus();
    }

    setStatus(inData: TBinData): this {
        let inByteArray: Uint8Array;
        try {
            inByteArray = importBinData(inData);
        } catch (error: any) {
            throw new Error(`Could not set ResponseAPDU status field: ${error.message}`);
        }

        if (inByteArray.byteLength !== 2)
            throw new Error(`Could not set ResponseAPDU status field. Expected exactly 2 bytes of data; Received: ${inByteArray.byteLength} bytes`);

        this.byteArray.set(inByteArray, this.dataLength);
        return this;
    }

    set status(data: TBinData) {
        this.setStatus(data);
    }

    /** Tries to decode response status and returns a descriptive string. */
    get meaning(): string {
        return statusDecode(this.status);
    }

    /** Returns `true` if resporse status(SW1+SW2) is `0x9000` */
    get isOk(): boolean {
        if((this.status[0] === 0x90) && (this.status[1] === 0x00))
            return true;
        return false;
    }

    /** Returns `true` if resporse SW1 is `0x61` */
    get hasMoreBytesAvailable(): boolean {
        if ((this.status[0] === 0x61))
            return true;
        return false;
    }

    /** Returns `true` if resporse SW1 is `0x6C` */
    get isWrongLe(): boolean {
        if ((this.status[0] === 0x6c))
            return true;
        return false;
    }

    /**
     * In case response status SW1 is `0x61` or `0x6CXX`, returns SW2.
     * 
     * `0` otherwise.
     */
    get availableResponseBytes(): number {
        if ((this.status[0] === 0x61) || (this.status[0] === 0x6c))
            return this.status[1];
        return 0;
    }
}

export function assertResponseIsOk(resp: ResponseApdu): void {
    if (!resp.isOk) {
        throw new Error(`Error response: [${resp.toString()}](${resp.meaning})`);
    }
}

export default ResponseApdu;
