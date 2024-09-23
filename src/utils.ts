/** Importable binary data. Can be one of following types:
 * - Valid hex string. With or without `0x` prefix. Case insensitive. Empty string is a valid hex string.
 * - Array of numbers
 * - ArrayBuffer
 * - ArrayBufferView
 */
export type TBinData = string | number[] | ArrayBuffer | ArrayBufferView;

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
    return `${str.length % 2 ? '0' : ''}${strHasHexPrefix(str) ? str.substring(2) : str}`;
}

/** Given a numeric value and a word length in bits, returns the minimum number of words needed to represent that value
 * @param value - numeric value
 * @param wordBitLen - length of word in bits. Default: `8`
 */
export function getMinWordNum(value: number, wordBitLen: number = 8): number {
    return Math.max(1, Math.ceil(Math.log2(value + 1) / wordBitLen));
}

/** Decodes a hex string. Case insensitive. Strings can have `0x` prefix. Throws if `outBuffer` is defined, but does not have enough space (considering `outOffset`, if any).
 * @param str - hex string to decode
 * @param outBuffer - if defined, the result of the decoding will be written to this/underlying ArrayBuffer. If defined, the returned Uint8Array will refecence the memory region to which data were written.
 * @param outOffset - This has effect ONLY IF `outBuffer` is defined. If specified, the result of the decoding will be written starting from this offset. In case `outBuffer` is an ArrayBufferView, this value is relative to the byteOffset of the view itself, not to the start of the underlying ArrayBuffer
 */
export function hexDecode(
    str: string,
    outBuffer?: ArrayBuffer | ArrayBufferView,
    outOffset: number = 0,
): Uint8Array {
    if (typeof str !== 'string') throw new TypeError('Not a string');

    if (!isHexString(str)) throw new Error(`Not a hex string: [${str}]`);

    const _str = normalizeHexString(str);
    const requiredByteLength = _str.length / 2;

    let res: Uint8Array;
    if (typeof outBuffer === 'undefined') {
        res = new Uint8Array(requiredByteLength);
    } else {
        if (outBuffer instanceof ArrayBuffer) {
            res = new Uint8Array(outBuffer);
        } else if (ArrayBuffer.isView(outBuffer)) {
            res = new Uint8Array(outBuffer.buffer).subarray(
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

        res = res.subarray(outOffset);

        if (requiredByteLength > res.byteLength)
            throw new Error('Not enough space in the provided outBuffer');
    }

    for (let byteIdx = 0; byteIdx < requiredByteLength; byteIdx++) {
        const strIdx = byteIdx * 2;
        res[byteIdx] = parseInt(`${_str[strIdx]}${_str[strIdx + 1]}`, 16);
    }
    return res.subarray(0, requiredByteLength);
}

export function hexEncode(
    data: number[] | ArrayBuffer | ArrayBufferView,
): string {
    let result = '';
    let byteArray: Uint8Array;
    try {
        byteArray = importBinData(data);
    } catch (error: any) {
        throw new Error(`Error hexencoding value: ${error.message}`);
    }
    for (let i = 0; i < byteArray.byteLength; i++) {
        const byteHex = byteArray[i].toString(16);
        result += `${byteHex.length % 2 ? '0' : ''}${byteHex}`;
    }
    return result;
}

export function isBinData(input: any): input is TBinData {
    if (typeof input === 'string' && isHexString(input)) {
        return true;
    } else if (input instanceof ArrayBuffer) {
        return true;
    } else if (ArrayBuffer.isView(input)) {
        return true;
    } else if (Array.isArray(input)) {
        for (let i = 0; i < input.length; i++) {
            if (typeof input[i] !== 'number') return false;
        }
        return true;
    }
    return false;
}

/** Converts various binary data representations to an Uint8Array. Where possible, the returned Uint8Array will reference the same memory region as input data. In case of hex strings and number arrays a new memory region will be allocated. If a copy of data is needed in any case, see the `outBuffer` parameter below. Throws if `outBuffer` is defined, but does not have enough space (considering `outOffset`, if any).
 * @param inData - input binary data. Strings must contain a valid hex value. If type is a numeric array, all values should be in the range 0-255, otherwise they will be wrapped around. For example -1 = 255 and 256/512 = 0
 * @param outBuffer - if defined, the result of the import will be copied to this/underlying ArrayBuffer. If defined, the returned Uint8Array will refecence the memory region to which data were written.
 * @param outOffset - This has effect ONLY IF `outBuffer` is defined. If specified, the result of the import will be written starting from this offset. In case `outBuffer` is an ArrayBufferView, this value is relative to the byteOffset of the view itself, not to the start of the underlying ArrayBuffer
 */
export function importBinData(
    inData: TBinData,
    outBuffer?: ArrayBuffer | ArrayBufferView,
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
    } else if (ArrayBuffer.isView(inData)) {
        inByteArray = new Uint8Array(inData.buffer).subarray(
            inData.byteOffset,
            inData.byteOffset + inData.byteLength,
        );
        requiredByteLength = inByteArray.byteLength;
    } else if (Array.isArray(inData)) {
        dataIsNumArray = true;
        requiredByteLength = inData.length;
    } else {
        throw new TypeError(
            'Accepted binary data types: hex string, number[], ArrayBuffer, ArrayBufferView',
        );
    }

    let outByteArray: Uint8Array = new Uint8Array(0);
    const copyRequired: boolean = typeof outBuffer !== 'undefined';

    if (!copyRequired) {
        if (dataIsNumArray) {
            outByteArray = new Uint8Array(requiredByteLength);
        } else {
            outByteArray = inByteArray!; // is undefined only if data is a number[]
        }
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

    if (dataIsNumArray) {
        for (let i = 0; i < (inData as number[]).length; i++) {
            if (typeof (inData as number[])[i] !== 'number')
                throw new TypeError('Data is not a numeric array');
            outByteArray[i] = (inData as number[])[i];
        }
    } else if (copyRequired) {
        outByteArray.set(inByteArray);
    }

    return outByteArray.subarray(0, requiredByteLength);
}

// ================ ATR =================================
/** Decoded Answer To Reset info*/
export interface IAtrInfo {
    /** The initial character TS encodes the convention used for encoding of the ATR, and further communications until the next reset. 0x3B - direct; 0x3F - inverse */
    TS: 'direct' | 'inverse';
    /** Format byte T0 encodes number of historical bytes and the presence of inerface bytes `TA1`, `TB1`, `TC1` and `TD1` */
    T0: {
        /** Number of historical bytes (0..15) */
        K: number;
        /** Encodes the presence of at most 4 other interface bytes: TD1, TC1, TB1, TA1. Binary string */
        Y: string;
    };
    TA: {
        [key: number]: any;
        /** Global. Interface byte TA1, if present, is global, and encodes the maximum clock frequency supported by the card, and the number of clock periods per ETU that it suggests to use after the ATR. When TA1 is absent, it's assumed default value is `0x11` (Di=1, Fi=372, fMax=5) */
        1?: {
            /** Maximum clock frequency supported by the card in MHz. Default: 5 */
            fMax: number;
            /** Clock Rate Conversion Factor. Default: 372 */
            Fi: number;
            /** Baud Rate Adjustment Factor. Default: 1 */
            Di: number;
            /** Number of cycles per ETU to use after the ATR. Expressed as the ratio Fi/Di. Default: 372 */
            cyclesPerETU: number;
        };
        /** Global. Specific mode byte */
        2?: {
            /** Protocol required by the card, in the convention used for TD(1) (EMV prescribes that a card which T encoded in TA2 does not match that in TD1 shall be rejected) */
            T: number;
            /** If false, indicates that the card is unable to change the negotiable/specific mode. If true, indicates that card has that ability (perhaps after a warm ATR) */
            canChange: boolean;
            /** If false, ETU duration is Fi/Di clock cycles as defined by TA1 (or its default value if absent). If true, indicates that the ETU duration is implicitly known (by some convention, or setting of the reader; EMV prescribes that such card shall be rejected) */
            implicitETUDuration: boolean;
        };
        /** Specific to T after T from 0 to 14 in TD(i–1). For T = 1: maximum block size the card can receive. Encodes IFSC. If T = 15: supported supply voltages and low power modes */
        3?: number;
    };
    TB: {
        [key: number]: any;
        /** Global. Deprecated, previously indicating (coarsely) the programming voltage VPP and maximum programming current required by some cards on the dedicated contact C6 during programming of their EPROM memory */
        1?: {
            connected: boolean;
            /** Value of VPP in Volts */
            PI1: number;
            /** Maximum programming current in milliAmperes */
            I: number;
        };
        /** Global. Deprecated. Encodes PI2, which when in range 50..250 (other values being RFU) encode VPP in increments of 0.1 V, and subsumes the coarser indication given by PI1 of TB1 */
        2?: number;
        /** For T=1 protocol the first TBi encodes BWI(high) and CWI(low). */
        3?: {
            /** Block Waiting Integer */
            BWI: number;
            /** Character Waiting Integer */
            CWI: number;
        };
    };
    TC: {
        [key: number]: any;
        /** Global. Extra guard time */
        1?: number;
        /** Specific to T=0. If present, encodes the waiting time integer WI, except the value '00' reserved for future use. If TC2 is absent, then the default value is 10. */
        2?: number;
    };
    /** Structural, encodes Y and T */
    TD: {
        [key: number]: {
            /** presence of at most 4 other interface bytes: TD(i+1), TC(i+1), TB(i+1), TA(i+1) */
            Y: string;
            /** Integer in range [0..15]. T = 15 is invalid in TD(1), and in other TDi qualifies the following TA(i+1) TB(i+1), TC(i+1), TD(i+1) (if present) as global interface bytes. Other values of T indicate a protocol that the card is willing to use, and that TA(i+1) TB(i+1), TC(i+1), TD(i+1) (if present) are specific interface bytes applying only to that protocol. T = 0 is a character-oriented protocol. T = 1 is a block-oriented protocol. T in the range [3..14] is RFU */
            T: number;
        };
    };
    historicalBytes: Uint8Array;
    /** Check byte, allows a check of the integrity of the data in the ATR. If present, TCK is the Exclusive OR of the bytes in the ATR from T0 (included) to TCK (excluded) */
    TCK?: number;
}

function decodeTA(byte: number, i: number): any {
    let result: any = byte;
    if (i === 1) {
        const low = byte & 0x0f;
        const high = (byte >> 4) & 0x0f;
        result = { fMax: -1, Fi: -1, Di: -1, cyclesPerETU: -1 };
        switch (low) {
            case 1:
                result.Di = 1;
                break;
            case 2:
                result.Di = 2;
                break;
            case 3:
                result.Di = 4;
                break;
            case 4:
                result.Di = 8;
                break;
            case 5:
                result.Di = 16;
                break;
            case 6:
                result.Di = 32;
                break;
            case 7:
                result.Di = 64;
                break;
            case 8:
                result.Di = 12;
                break;
            case 9:
                result.Di = 20;
                break;
            default:
                break;
        }
        switch (high) {
            case 0:
                result.Fi = 372;
                result.fMax = 4;
                break;
            case 1:
                result.Fi = 372;
                result.fMax = 5;
                break;
            case 2:
                result.Fi = 558;
                result.fMax = 6;
                break;
            case 3:
                result.Fi = 744;
                result.fMax = 8;
                break;
            case 4:
                result.Fi = 1116;
                result.fMax = 12;
                break;
            case 5:
                result.Fi = 1488;
                result.fMax = 16;
                break;
            case 6:
                result.Fi = 1860;
                result.fMax = 20;
                break;
            case 9:
                result.Fi = 512;
                result.fMax = 5;
                break;
            case 10:
                result.Fi = 768;
                result.fMax = 7.5;
                break;
            case 11:
                result.Fi = 1024;
                result.fMax = 10;
                break;
            case 12:
                result.Fi = 1536;
                result.fMax = 15;
                break;
            case 13:
                result.Fi = 2048;
                result.fMax = 20;
                break;
            default:
                break;
        }
        if (result.Fi > 0 && result.Di > 0)
            result.cyclesPerETU = result.Fi / result.Di;
    } else if (i === 2) {
        result = {
            T: byte & 0x0f,
            canChange: ((byte >> 7) & 0x01) === 0,
            implicitETUDuration: ((byte >> 4) & 0x01) > 0,
        };
    }
    return result;
}

function decodeTB(byte: number, i: number): any {
    let result: any = byte;
    if (i === 1) {
        result = { connected: false, PI1: -1, I: -1 };
        const PI1 = byte & 0x1f;
        const I = (byte >> 5) & 0x03;
        switch (true) {
            case PI1 > 0:
                result.connected = true;
                result.PI1 = PI1;
                switch (I) {
                    case 0:
                        result.I = 25;
                        break;
                    case 1:
                        result.I = 50;
                        break;
                    default:
                        break;
                }
                break;
            default:
                break;
        }
    } else if (i === 3) {
        result = {
            BWI: (byte >> 4) & 0x0f,
            CWI: byte & 0x0f,
        };
    }
    return result;
}

function decodeTC(byte: number, _i: number): any {
    return byte;
}

function isValidOffset(offset: number, length: number): boolean {
    if (offset < length) return true;
    return false;
}

export function decodeAtr(atr: TBinData): IAtrInfo {
    let inBuffer: Uint8Array;
    try {
        inBuffer = importBinData(atr);
    } catch (error: any) {
        throw new Error(
            `Error decoding ATR: Error importing ATR binary: ${error.message}`,
        );
    }

    if (inBuffer.byteLength < 2) {
        throw new Error(
            `Error decoding ATR: ATR length expected to be at least 2 bytes. Received: ${inBuffer.byteLength}`,
        );
    }

    const result: IAtrInfo = {
        TS: 'direct',
        T0: { K: 0, Y: '0b0000' },
        TA: {},
        TB: {},
        TC: {},
        TD: {},
        historicalBytes: new Uint8Array(0),
    };

    switch (inBuffer[0]) {
        case 0x3b:
            result.TS = 'direct';
            break;
        case 0x3f:
            result.TS = 'inverse';
            break;
        default:
            throw new Error('Error decoding ATR: invalid TS byte value');
    }

    result.T0.K = inBuffer[1] & 0x0f;
    result.T0.Y = `0b${((inBuffer[1] >> 4) & 0x0f).toString(2).padStart(4, '0')}`;

    let currI = 0;
    let currOffset = 1;
    let lastStructuralByte = inBuffer[1];
    while (true) {
        currI++;
        currOffset++;
        if ((lastStructuralByte & 0x10) > 0) {
            if (!isValidOffset(currOffset, inBuffer.byteLength))
                throw new Error(
                    `Error decoding ATR: Error decodinng TA(${currI}): unexpected end of data`,
                );
            result.TA[currI] = decodeTA(inBuffer[currOffset], currI);
            currOffset += 1;
        }
        if ((lastStructuralByte & 0x20) > 0) {
            if (!isValidOffset(currOffset, inBuffer.byteLength))
                throw new Error(
                    `Error decoding ATR: Error decodinng TB(${currI}): unexpected end of data`,
                );
            result.TB[currI] = decodeTB(inBuffer[currOffset], currI);
            currOffset += 1;
        }
        if ((lastStructuralByte & 0x40) > 0) {
            if (!isValidOffset(currOffset, inBuffer.byteLength))
                throw new Error(
                    `Error decoding ATR: Error decodinng TC(${currI}): unexpected end of data`,
                );
            result.TC[currI] = decodeTC(inBuffer[currOffset], currI);
            currOffset += 1;
        }
        if ((lastStructuralByte & 0x80) > 0) {
            if (!isValidOffset(currOffset, inBuffer.byteLength))
                throw new Error(
                    `Error decoding ATR: Error decodinng TD(${currI}): unexpected end of data`,
                );
            result.TD[currI] = {
                Y: `0b${((inBuffer[currOffset] >> 4) & 0x0f).toString(2).padStart(4, '0')}`,
                T: inBuffer[currOffset] & 0x0f,
            };
            lastStructuralByte = inBuffer[currOffset];
        } else {
            // no structural byte means no more interface bytes
            break;
        }
    }

    if (inBuffer.byteLength < currOffset + result.T0.K) {
        throw new Error(
            'Error decoding ATR: error reading historical bytes: unexpected end of data',
        );
    }

    if (result.T0.K > 0) {
        result.historicalBytes = new Uint8Array(result.T0.K);

        importBinData(
            inBuffer.subarray(currOffset, currOffset + result.T0.K),
            result.historicalBytes,
        );

        currOffset += result.T0.K;
    }

    if (currOffset < inBuffer.byteLength) result.TCK = inBuffer[currOffset];

    return result;
}
