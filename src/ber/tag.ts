import {
    TBinData,
    hexEncode,
    importBinData,
    getMinWordNum,
} from '../utils';

const MAX_TAG_BYTE_LENGTH = 4;
const MAX_TAG_SAFE_NUMBER = Math.max(30, (2 ** ((MAX_TAG_BYTE_LENGTH - 1) * 7) - 1));


export type TTlvTagClassNumber = 0 | 1 | 2 | 3;
export type TTlvTagClassName = 'universal' | 'application' | 'context-specific' | 'private';

/** TLV tag class numeric value from name */
const tlvClassNumber: Readonly<{[key in TTlvTagClassName]: TTlvTagClassNumber}> = {
    'universal': 0,
    'application': 1,
    'context-specific': 2,
    'private': 3,
}

/** TLV tag class name from numeric value */
const tlvClassName: Readonly<{[key in TTlvTagClassNumber]: TTlvTagClassName}> = [
    'universal',
    'application',
    'context-specific',
    'private',
]

/** Information about a BER TLV tag */
export interface ITagInfo {
    /** One of four classes: 'universal'(0), 'application'(1), 'context-specific'(2), 'private'(3) */
    class: TTlvTagClassNumber | TTlvTagClassName;
    /**Primitive tags contain unstructured binary data; constructed tags wrap other ber-tlv objects */
    isConstructed: boolean;
    /** Tag unsigned integer identifier */
    number: number;
}

function isTagInfo(obj: any): obj is ITagInfo {
    if (typeof obj === 'object'
        && (
            (typeof obj['class'] === 'number' && obj['class'] >= 0 && obj['class'] <= 3)
            || (
                typeof obj['class'] === 'string'
                && (
                    obj['class'] === 'universal'
                    || obj['class'] === 'application'
                    || obj['class'] === 'context-specific'
                    || obj['class'] === 'private'
                )
            )
        )
        && typeof obj['isConstructed'] === 'boolean'
        && typeof obj['number'] === 'number'
    ) return true;

    return false;
}

interface TDecodeTagResult extends ITagInfo {
    class: TTlvTagClassNumber;
    byteLength: number;
};

/**
 * @param inBuffer - BER Tlv bytes
 * @param start - offset at which to start decoding process (inclusive); default: 0
 */
export function decodeTag(inData: TBinData, startOffset: number = 0): TDecodeTagResult {
    let inBuffer: Uint8Array;
    try {
        inBuffer = importBinData(inData);
    } catch (error: any) {
        throw new Error(`Error decoding binary data: ${error.message}`);
    }

    if(startOffset < 0 || (startOffset >= inBuffer.byteLength))
        throw new RangeError(`Start offset "${startOffset}" is outside of byte array range. Received byte array length: ${inBuffer.byteLength}`);

    inBuffer = inBuffer.subarray(startOffset);

    const result: TDecodeTagResult = {
        class: 0,
        isConstructed: false,
        number: 0,
        byteLength: 0,
    }

    result.class = (inBuffer[0] >> 6) as TTlvTagClassNumber;
    result.isConstructed = (inBuffer[0] & 0x20) > 0;
    result.number = inBuffer[0] & 0x1f;
    result.byteLength = 1;

    if (result.number < 31) { // number < 31, 1 byte tag
        return result;
    }
    // reset number value
    result.number = 0;
    // number >= 31, see subsequent bytes for tag number
    while(true) {
        if (result.byteLength >= inBuffer.byteLength)
            throw new Error('Unexpected end of data');
        if (result.byteLength >= MAX_TAG_BYTE_LENGTH)
            throw new Error(`Exceeded max allowed tag length of ${MAX_TAG_BYTE_LENGTH} bytes`);
 
        if((inBuffer[result.byteLength] & 0x80) === 0) {
            result.byteLength += 1;
            break;
        };

        result.byteLength += 1;
    }

    const numSubArray = inBuffer.subarray(1, result.byteLength);
    // js numbers are little-endian, hence the backwards traversal
    // also first bit of each byte must be discarded
    for (let i = numSubArray.byteLength - 1; i >= 0; i--) {
        result.number = result.number | ((numSubArray[i] & 0x7F) << (7 * (numSubArray.byteLength - 1 - i)));
    }
    return result;
}

export function encodeTag(
    tagInfo : ITagInfo,
    outBuffer?: ArrayBuffer | ArrayBufferView | Buffer,
    outOffset: number = 0,
): Uint8Array {
    if (!isTagInfo(tagInfo))
        throw new Error('Unknown tag info format');

    if (tagInfo.number < 0 || tagInfo.number > MAX_TAG_SAFE_NUMBER)
        throw new Error(`Tag number value not allowed. Min: 0, max: ${MAX_TAG_SAFE_NUMBER}, received: ${tagInfo.number}`);

    const extraBytes: number = tagInfo.number < 31 ? 0 : getMinWordNum(tagInfo.number, 7);
    const requiredByteLength: number = 1 + extraBytes;

    let outByteArray: Uint8Array = new Uint8Array(0);

    if (typeof outBuffer === 'undefined') {
        outByteArray = new Uint8Array(requiredByteLength);
    } else {
        if (outBuffer instanceof ArrayBuffer) {
            outByteArray = new Uint8Array(outBuffer);
        } else if (ArrayBuffer.isView(outBuffer) || Buffer.isBuffer(outBuffer)) {
            outByteArray = new Uint8Array(outBuffer.buffer).subarray(outBuffer.byteOffset, outBuffer.byteOffset + outBuffer.byteLength);
        } else {
            throw new TypeError('outBuffer must be an ArrayBuffer, ArrayBufferView or Buffer');
        }

        if ((outOffset < 0) || (outOffset >= outBuffer.byteLength))
            throw new Error(`outOffset value out of bounds; value: ${outOffset}`);

        outByteArray = outByteArray.subarray(outOffset);

        if (requiredByteLength > outByteArray.byteLength)
            throw new Error('Not enough space in the provided outBuffer');
    }

    const classNumber: number = typeof tagInfo.class === 'number' ? tagInfo.class : tlvClassNumber[tagInfo.class];
    outByteArray[0] = 0;
    outByteArray[0] |= (classNumber << 6);
    outByteArray[0] |= ((tagInfo.isConstructed ? 1 : 0) << 5);

    if (tagInfo.number < 31) {
        outByteArray[0] |= tagInfo.number
    } else {
        outByteArray[0] |= 0x1F;
        for (let i = 1; i <= extraBytes; i++) {
            outByteArray[i] = 0;
            if (i < extraBytes){
                outByteArray[i] |= 0x80;
            }
            outByteArray[i] |= ((tagInfo.number >> ((extraBytes - i) * 7)) & 0x7F);
        }
    }

    return outByteArray.subarray(0, requiredByteLength);
}

export class Tag implements ITagInfo {
    static readonly MAX_BYTE_LENGTH = MAX_TAG_BYTE_LENGTH;
    static readonly MAX_NUMBER      = MAX_TAG_SAFE_NUMBER;
    private byteArray: Uint8Array = new Uint8Array(Tag.MAX_BYTE_LENGTH);
    private bLength: number = 0;
    private _hex: string     = '';
    private _class: TTlvTagClassNumber = 0;
    private _constructed: boolean      = false;
    private _number: number            = 0;


    static from(input?: ITagInfo | TBinData, startOffset: number = 0): Tag {
        return new Tag(input, startOffset);
    };

    constructor(input?: ITagInfo | TBinData, startOffset: number = 0) {
        if (typeof input === 'undefined') {
            return this;
        }
        return this.from(input, startOffset);
    }

    from(input: ITagInfo | TBinData, startOffset: number = 0): this {
        if (isTagInfo(input)) {
            if (input.number > Tag.MAX_NUMBER) {
                throw new Error(`Number exceeds max allowed value of ${Tag.MAX_NUMBER}; received: ${input.number}`);
            }
            const classNumber: number = typeof input.class === 'number' ? input.class : tlvClassNumber[input.class];
            this._class = Math.floor(classNumber) as TTlvTagClassNumber;
            this._constructed = input.isConstructed;
            this._number = Math.floor(input.number);

            const encodeResult = encodeTag(input, this.byteArray);
            this.bLength = encodeResult.byteLength;
            this._hex = hexEncode(encodeResult);

        } else {
            let inBuffer: Uint8Array;
            try {
                inBuffer = importBinData(input);
            } catch(error: any) {
                throw new Error(`Error decoding tag: ${error.message}`);
            }

            let decodeResult: TDecodeTagResult;
            try {
                decodeResult = decodeTag(inBuffer, startOffset);
            } catch (error: any) {
                throw new Error(`Error decoding tag: ${error.message}`);
            }

            this._class = decodeResult.class;
            this._constructed = decodeResult.isConstructed;
            this._number = decodeResult.number;
            this.byteArray.set(inBuffer.subarray(startOffset, startOffset + decodeResult.byteLength));
            this.bLength = decodeResult.byteLength;
            this._hex = hexEncode(this.toByteArray());
        }
        return this;
    }

    toByteArray(): Uint8Array {
        return this.byteArray.subarray(0, this.bLength);
    }

    toString(): string {
        return this._hex;
    }

    get byteLength(): number {
        return this.bLength;
    }

    get class(): TTlvTagClassNumber {
        return this._class;
    }

    get className(): TTlvTagClassName {
        return tlvClassName[this._class];
    }

    get isConstructed(): boolean {
        return this._constructed;
    }

    get isPrimitive(): boolean {
        return !this._constructed;
    }

    get number(): number {
        return this._number;
    }

    get hex(): string {
        return this._hex;
    }
}

export default Tag;
