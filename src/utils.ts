/** Importable binary data. Can be one of following types:
 * - Valid hex string. With or without `0x` prefix. Case insensitive. Empty string is a valid hex string.
 * - Array of numbers
 * - ArrayBuffer
 * - ArrayBufferView
 * - Buffer
*/
export type TBinData = string | number[] | Buffer | ArrayBuffer | ArrayBufferView;

const hexValidationRegex = /^(0[xX])?[0-9A-Fa-f]+$/g; // '0x' prefix allowed

/** Checks if string is a valid hex string. Both with or without `0x` prefix. Case insensitive. Empty string is a valid hex string.
 */
export function isHexString(str: string): boolean {
    if (str.length < 1) return true;
    if (str.match(hexValidationRegex)) return true;
    return false;
}

/** Returns true if string begins with `0x`. Case insensitive. */
export function strHasHexPrefix(str: string): boolean {
    if (str.length < 2) return false;
    if (str[0] === '0' && (str[1] === 'x' || str[1] === 'X')) return true;
    return false;
}

/** Removes the initial `0x` (if any) from a string and adds a leading zero if length is odd. Case insensitive. */
export function normalizeHexString(str: string): string {
    return `${(str.length % 2) ? '0' : '' }${ strHasHexPrefix(str) ? str.substring(2) : str}`;
}

/** Decodes a hex string. Case insensitive. Strings can have `0x` prefix. Throws if `outBuffer` is defined, but does not have enough space (considering `outOffset`, if any).
 * @param str - hex string to decode
 * @param outBuffer - if defined, the result of the decoding will be written to this/underlying ArrayBuffer. If defined, the returned Uint8Array will refecence the memory region to which data were written.
 * @param outOffset - This has effect ONLY IF `outBuffer` is defined. If specified, the result of the decoding will be written starting from this offset. In case `outBuffer` is an ArrayBufferView, this value is relative to the byteOffset of the view itself, not to the start of the underlying ArrayBuffer
 */
export function hexDecode(str: string, outBuffer?: ArrayBuffer | ArrayBufferView | Buffer, outOffset: number = 0): Uint8Array {
    if (typeof str !== 'string')
        throw new TypeError('Not a string');

    if (!isHexString(str)) throw new Error(`Not a hex string: [${str}]`);

    const _str = normalizeHexString(str);
    const requiredByteLength = _str.length / 2;

    let res: Uint8Array;
    if (typeof outBuffer === 'undefined') {
        res = new Uint8Array(requiredByteLength);
    } else {
        if (outBuffer instanceof ArrayBuffer) {
            res = new Uint8Array(outBuffer);
        } else if (ArrayBuffer.isView(outBuffer) || Buffer.isBuffer(outBuffer)) {
            res = new Uint8Array(outBuffer.buffer).subarray(outBuffer.byteOffset, outBuffer.byteOffset + outBuffer.byteLength);
        } else {
            throw new TypeError('outBuffer must be an ArrayBuffer or ArrayBufferView');
        }

        if ((outOffset < 0) || (outOffset >= outBuffer.byteLength)) throw new Error(`outOffset value out of bounds; value: ${outOffset}`);

        res = res.subarray(outOffset);

        if (requiredByteLength > res.byteLength)
            throw new Error('Not enough space in the provided outBuffer');
    }

    for (let byteIdx = 0; byteIdx < requiredByteLength; byteIdx++) {
        const strIdx = byteIdx * 2;
        res[byteIdx] = parseInt(`${_str[strIdx]}${_str[strIdx+1]}`, 16);
    }
    return res.subarray(0, requiredByteLength);
}

// /**
//  * @param wrapOverflow - if `false`(default), 256 gets encoded as `0100`; otherwise '00'
//  */
// export function arrayToHex(
//     array: number[],
//     wrapOverflow: boolean = false,
// ): string {
//     if (array && array.length > 0) {
//         let str = '';
//         for (let i = 0; i < array.length; i = i + 1) {
//             let iHex = array[i].toString(16);
//             iHex = `${iHex.length % 2 ? '0' : ''}${iHex}`;
//             str += wrapOverflow ? iHex.substring(iHex.length - 2) : iHex;
//         }
//         return str;
//     }
//     return '';
// }

// /** Resulting ArrayBuffer is safe to work with, as it contains a copy of data so it does not reference the same memory region as original data */
// export function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
//     return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
// }

/** Converts various binary data representations to an Uint8Array. Where possible, the returned Uint8Array will reference the same memory region as input data. In case of hex strings and number arrays a new memory region will be allocated. If a copy of data is needed in any case, see the `outBuffer` parameter below. Throws if `outBuffer` is defined, but does not have enough space (considering `outOffset`, if any).
 * @param inData - input binary data. Strings must contain a valid hex value. If type is a numeric array, all values should be in the range 0-255, otherwise they will be wrapped around. For example -1 = 255 and 256/512 = 0
 * @param outBuffer - if defined, the result of the import will be copied to this/underlying ArrayBuffer. If defined, the returned Uint8Array will refecence the memory region to which data were written.
 * @param outOffset - This has effect ONLY IF `outBuffer` is defined. If specified, the result of the ijmport will be written starting from this offset. In case `outBuffer` is an ArrayBufferView, this value is relative to the byteOffset of the view itself, not to the start of the underlying ArrayBuffer
 */
export function importBinData(
    inData: TBinData,
    outBuffer?: ArrayBuffer | ArrayBufferView | Buffer,
    outOffset: number = 0,
): Uint8Array {

    if (typeof inData === 'string') {
        try {
            return hexDecode(inData, outBuffer, outOffset);
        } catch (error: any) {
            throw new Error(`Error decoding hex string: ${error.message}`);
        }
    }

    let inByteArray: Uint8Array = new Uint8Array(0);
    let requiredByteLength: number;
    let dataIsNumArray: boolean = false;

    if (inData instanceof ArrayBuffer) {
        inByteArray = new Uint8Array(inData);
        requiredByteLength = inByteArray.byteLength;
    } else if (ArrayBuffer.isView(inData) || Buffer.isBuffer(inData)) {
        inByteArray = new Uint8Array(inData.buffer).subarray(inData.byteOffset, inData.byteOffset + inData.byteLength);
        requiredByteLength = inByteArray.byteLength;
    } else if (Array.isArray(inData)) {
        dataIsNumArray = true;
        requiredByteLength = inData.length;
    } else {
        throw new TypeError('Accepted binary data types: hex string, number[], Buffer, ArrayBuffer, ArrayBufferView');
    }

    let outByteArray: Uint8Array = new Uint8Array(0);
    const copyRequired: boolean = (typeof outBuffer !== 'undefined');

    if (!copyRequired) {
        if (dataIsNumArray) {
            outByteArray = new Uint8Array(requiredByteLength)
        } else {
            outByteArray = inByteArray!; // is undefined only if data is a number[]
        }
    } else {
        if (outBuffer instanceof ArrayBuffer) {
            outByteArray = new Uint8Array(outBuffer);
        } else if (ArrayBuffer.isView(outBuffer) || Buffer.isBuffer(outBuffer)) {
            outByteArray = new Uint8Array(outBuffer.buffer).subarray(outBuffer.byteOffset, outBuffer.byteOffset + outBuffer.byteLength);
        } else {
            throw new TypeError('outBuffer must be an ArrayBuffer, ArrayBufferView or Buffer');
        }

        if ((outOffset < 0) || (outOffset >= outBuffer.byteLength)) throw new Error(`outOffset value out of bounds; value: ${outOffset}`);

        outByteArray = outByteArray.subarray(outOffset);

        if (requiredByteLength > outByteArray.byteLength)
            throw new Error('Not enough space in the provided outBuffer');
    }

    if (dataIsNumArray) {
        for (let i = 0; i < (inData as number[]).length; i++) {
            if (typeof (inData as number[])[i] !== 'number')
                throw new TypeError('Data is not a numeric array');
            outByteArray[i] = (inData as number[])[i];
        }
    } else if (copyRequired) {
        outByteArray.set(inByteArray)
    }

    return outByteArray.subarray(0, requiredByteLength);
}
