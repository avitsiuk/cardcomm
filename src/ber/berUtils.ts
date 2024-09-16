import { TBinData, importBinData, getMinWordNum } from '../utils';

export const MAX_TAG_BYTE_LENGTH = 4;
export const MAX_TAG_SAFE_NUMBER = Math.max(
    30,
    2 ** (7 * (MAX_TAG_BYTE_LENGTH - 1)) - 1,
);
export const MAX_LEN_BYTE_LENGTH = 5;
export const MAX_LEN_SAFE_NUMBER = Math.max(
    127,
    2 ** (8 * (MAX_LEN_BYTE_LENGTH - 1)) - 1,
);

/** Valid numeric tag class value */
export type TTlvTagClassNumber = 0 | 1 | 2 | 3;
/** Valid string tag class value */
export type TTlvTagClassName =
    | 'universal'
    | 'application'
    | 'context-specific'
    | 'private';

/** TLV tag class numeric value from name string */
export const tlvClassNumber: Readonly<{
    [key in TTlvTagClassName]: TTlvTagClassNumber;
}> = {
    universal: 0,
    application: 1,
    'context-specific': 2,
    private: 3,
};

/** TLV tag class name string from numeric value */
export const tlvClassName: Readonly<{
    [key in TTlvTagClassNumber]: TTlvTagClassName;
}> = ['universal', 'application', 'context-specific', 'private'];

/** Object describing a BER TLV tag components */
export interface ITagInfo {
    /** One of four classes: 'universal'(0), 'application'(1), 'context-specific'(2), 'private'(3) */
    class: TTlvTagClassNumber | TTlvTagClassName;
    /**Primitive tags contain unstructured binary data; constructed tags wrap other ber-tlv objects */
    isConstructed: boolean;
    /** Tag unsigned integer identifier */
    number: number;
}

export function isTagInfo(obj: any): obj is ITagInfo {
    if (
        typeof obj === 'object' &&
        ((typeof obj['class'] === 'number' &&
            obj['class'] >= 0 &&
            obj['class'] <= 3) ||
            (typeof obj['class'] === 'string' &&
                (obj['class'] === 'universal' ||
                    obj['class'] === 'application' ||
                    obj['class'] === 'context-specific' ||
                    obj['class'] === 'private'))) &&
        typeof obj['isConstructed'] === 'boolean' &&
        typeof obj['number'] === 'number'
    )
        return true;

    return false;
}

export interface TParseTagResult extends ITagInfo {
    class: TTlvTagClassNumber;
    byteLength: number;
}

/**
 * @param inBuffer - BER Tlv bytes
 * @param start - offset at which to start decoding process (inclusive); default: 0
 */
export function parseTag(
    inData: TBinData,
    startOffset: number = 0,
): TParseTagResult {
    let inBuffer: Uint8Array;
    try {
        inBuffer = importBinData(inData);
    } catch (error: any) {
        throw new Error(`Error decoding binary data: ${error.message}`);
    }

    if (startOffset < 0 || startOffset >= inBuffer.byteLength)
        throw new RangeError(
            `Start offset "${startOffset}" is outside of byte array range. Received byte array length: ${inBuffer.byteLength}`,
        );

    inBuffer = inBuffer.subarray(startOffset);

    const result: TParseTagResult = {
        class: 0,
        isConstructed: false,
        number: 0,
        byteLength: 0,
    };

    result.class = (inBuffer[0] >> 6) as TTlvTagClassNumber;
    result.isConstructed = (inBuffer[0] & 0x20) > 0;
    result.number = inBuffer[0] & 0x1f;
    result.byteLength = 1;

    if (result.number < 31) {
        // number < 31, 1 byte tag
        return result;
    }
    // reset number value
    result.number = 0;
    // number >= 31, see subsequent bytes for tag number
    while (true) {
        if (result.byteLength >= inBuffer.byteLength)
            throw new Error('Unexpected end of data');
        if (result.byteLength >= MAX_TAG_BYTE_LENGTH)
            throw new Error(
                `Exceeded max allowed tag length of ${MAX_TAG_BYTE_LENGTH} bytes`,
            );

        if ((inBuffer[result.byteLength] & 0x80) === 0) {
            result.byteLength += 1;
            break;
        }

        result.byteLength += 1;
    }

    const numSubArray = inBuffer.subarray(1, result.byteLength);
    const temp = new Uint32Array([0]);
    // js numbers are little-endian, hence the backwards traversal
    // also first bit of each byte must be discarded
    for (let i = numSubArray.byteLength - 1; i >= 0; i--) {
        temp[0] =
            temp[0] |
            ((numSubArray[i] & 0x7f) << (7 * (numSubArray.byteLength - 1 - i)));
    }
    result.number = temp[0];
    return result;
}

export function serializeTag(
    tagInfo: ITagInfo,
    outBuffer?: ArrayBuffer | ArrayBufferView,
    outOffset: number = 0,
): Uint8Array {
    if (!isTagInfo(tagInfo)) throw new Error('Unknown tag info format');

    if (tagInfo.number < 0 || tagInfo.number > MAX_TAG_SAFE_NUMBER)
        throw new Error(
            `Tag number value not allowed. Min: 0, max: ${MAX_TAG_SAFE_NUMBER}, received: ${tagInfo.number}`,
        );

    const extraBytes: number =
        tagInfo.number < 31 ? 0 : getMinWordNum(tagInfo.number, 7);
    const requiredByteLength: number = 1 + extraBytes;

    let outByteArray: Uint8Array = new Uint8Array(0);

    if (typeof outBuffer === 'undefined') {
        outByteArray = new Uint8Array(requiredByteLength);
    } else {
        if (outBuffer instanceof ArrayBuffer) {
            outByteArray = new Uint8Array(outBuffer);
        } else if (ArrayBuffer.isView(outBuffer)) {
            outByteArray = new Uint8Array(outBuffer.buffer).subarray(
                outBuffer.byteOffset,
                outBuffer.byteOffset + outBuffer.byteLength,
            );
        } else {
            throw new TypeError(
                'outBuffer must be an ArrayBuffer or ArrayBufferView',
            );
        }

        if (outOffset < 0 || outOffset >= outBuffer.byteLength)
            throw new Error(
                `outOffset value out of bounds; value: ${outOffset}`,
            );

        outByteArray = outByteArray.subarray(outOffset);

        if (requiredByteLength > outByteArray.byteLength)
            throw new Error('Not enough space in the provided outBuffer');
    }

    const classNumber: number =
        typeof tagInfo.class === 'number'
            ? tagInfo.class
            : tlvClassNumber[tagInfo.class];
    outByteArray[0] = 0;
    outByteArray[0] |= classNumber << 6;
    outByteArray[0] |= (tagInfo.isConstructed ? 1 : 0) << 5;

    if (tagInfo.number < 31) {
        outByteArray[0] |= tagInfo.number;
    } else {
        outByteArray[0] |= 0x1f;
        for (let i = 1; i <= extraBytes; i++) {
            outByteArray[i] = 0;
            if (i < extraBytes) {
                outByteArray[i] |= 0x80;
            }
            outByteArray[i] |=
                (tagInfo.number >> ((extraBytes - i) * 7)) & 0x7f;
        }
    }

    return outByteArray.subarray(0, requiredByteLength);
}

export interface ILengthParseResult {
    /** Actual length value. if `-1`, then the length is in indefinite form */
    value: number;
    /** Number of bytes used by the length field */
    byteLength: number;
}

export function parseLength(
    input: TBinData,
    startOffset: number = 0,
): ILengthParseResult {
    let inBuffer: Uint8Array;
    try {
        inBuffer = importBinData(input);
    } catch (error: any) {
        throw new Error(`Error decoding binary data: ${error.message}`);
    }

    if (inBuffer.byteLength < 1) throw new Error('Unexpected end of data');

    if (startOffset < 0 || startOffset >= inBuffer.byteLength)
        throw new RangeError(
            `Start offset "${startOffset}" is outside of byte array range. Received byte array length: ${inBuffer.byteLength}`,
        );

    inBuffer = inBuffer.subarray(startOffset);

    if (inBuffer[0] === 0x80) return { value: -1, byteLength: 1 };

    if ((inBuffer[0] & 0x80) === 0) {
        return { value: inBuffer[0], byteLength: 1 };
    }

    const extraLenBytes = inBuffer[0] & 0x7f;

    if (extraLenBytes > MAX_LEN_BYTE_LENGTH - 1)
        throw new Error(
            `Length field must be at most ${MAX_LEN_BYTE_LENGTH} bytes long`,
        );

    if (inBuffer.byteLength < extraLenBytes + 1)
        throw new Error('Unexpected end of data');

    let tempVal = new Uint32Array([0]);

    for (let i = 1; i <= extraLenBytes; i++) {
        tempVal[0] |= inBuffer[i] << (8 * (extraLenBytes - i));
    }

    return { value: tempVal[0], byteLength: 1 + extraLenBytes };
}

export function serializeLength(
    lengthValue: number,
    outBuffer?: ArrayBuffer | ArrayBufferView,
    outOffset: number = 0,
): Uint8Array {
    if (lengthValue < 0 || lengthValue > MAX_LEN_SAFE_NUMBER)
        throw new Error(
            `Length value not allowed. Min: 0, max: ${MAX_LEN_SAFE_NUMBER}, received: ${lengthValue}`,
        );

    const extraBytes: number =
        lengthValue < 128 ? 0 : getMinWordNum(lengthValue, 8);
    const requiredByteLength: number = 1 + extraBytes;

    let outByteArray: Uint8Array = new Uint8Array(0);

    if (typeof outBuffer === 'undefined') {
        outByteArray = new Uint8Array(requiredByteLength);
    } else {
        if (outBuffer instanceof ArrayBuffer) {
            outByteArray = new Uint8Array(outBuffer);
        } else if (ArrayBuffer.isView(outBuffer)) {
            outByteArray = new Uint8Array(outBuffer.buffer).subarray(
                outBuffer.byteOffset,
                outBuffer.byteOffset + outBuffer.byteLength,
            );
        } else {
            throw new TypeError(
                'outBuffer must be an ArrayBuffer or ArrayBufferView',
            );
        }

        if (outByteArray.byteLength < 1)
            throw new Error('Not enough space in the provided outBuffer');

        if (outOffset < 0 || outOffset >= outBuffer.byteLength)
            throw new Error(
                `outOffset value out of bounds; value: ${outOffset}`,
            );

        outByteArray = outByteArray.subarray(outOffset);

        if (requiredByteLength > outByteArray.byteLength)
            throw new Error('Not enough space in the provided outBuffer');
    }

    outByteArray[0] = 0;

    if (lengthValue < 128) {
        outByteArray[0] |= lengthValue & 0x7f;
    } else {
        outByteArray[0] |= 0x80;
        outByteArray[0] |= extraBytes;

        for (let i = 1; i <= extraBytes; i++) {
            outByteArray[i] = 0;
            outByteArray[i] |= (lengthValue >> (8 * (extraBytes - i))) & 0xff;
        }
    }

    return outByteArray.subarray(0, requiredByteLength);
}
