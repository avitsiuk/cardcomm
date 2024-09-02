const hexValidationRegex = /^(0[xX])?[0-9A-Fa-f]+$/g; // '0x' prefix allowed

/** Checks if string is a valid hex string. Both with or without '0x' prefix. Case insensitive. Empty string is a valid hex string.*/
export function isHexString(str: string): boolean {
    if (str.match(hexValidationRegex)) return true;
    return false;
}

export function strHasHexPrefix(str: string): boolean {
    if (str.length < 2) return false;
    if (str[0] === '0' && (str[1] === 'x' || str[1] === 'X')) return true;
    return false;
}

/** Remove the initial `0x` (if any) from a string and add leading zero if length is odd */
export function normalizeHexString(str: string): string {
    return `${(str.length % 2) ? '0' : '' }${ strHasHexPrefix(str) ? str.substring(2) : str}`;
}

export function hexToArrayBuffer(str: string): ArrayBuffer {
    if (str.length < 1) {
        return new ArrayBuffer(0);
    }
    if (typeof str !== 'string') throw new TypeError('Not a string');
    if (!isHexString(str)) throw new Error(`Not a hex string: [${str}]`);
    const _str = normalizeHexString(str);
    const byteLength = _str.length / 2;
    const res = new ArrayBuffer(byteLength);
    const resView = new Uint8Array(res);
    for (let byteIdx = 0; byteIdx < byteLength; byteIdx++) {
        const strIdx = byteIdx * 2;
        resView[byteIdx] = parseInt(`${_str[strIdx]}${_str[strIdx+1]}`, 16);
    }
    return resView;
}

/** Resulting ArrayBuffer is safe to work with, as it contains a copy of data so it does not reference the same memory region as original data */
export function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/** Converts various binary data representations to an ArrayBuffer. Resulting ArrayBuffer is safe to work with, as it contains a copy of data so it does not reference the same memory region as original data.*/
export function importBinData(data: string | number[] | Buffer | ArrayBuffer | ArrayBufferView): ArrayBuffer {
    let result: ArrayBuffer = new ArrayBuffer(0);

    if (typeof data === 'string') {
        result = hexToArrayBuffer(data);
    } else if (Buffer.isBuffer(data)) {
        result = bufferToArrayBuffer(data);
    } else if (data instanceof ArrayBuffer) {
        result = new ArrayBuffer(data.byteLength);
        new Uint8Array(result).set(new Uint8Array(data));
    } else if (ArrayBuffer.isView(data)) {
        result = new ArrayBuffer(data.byteLength);
        new Uint8Array(result).set(new Uint8Array(data.buffer));
    } else if (Array.isArray(data)) {
        let isNumericArray = true;
        data.reduce((_, val)=>{
            if (typeof val !== 'number')
                isNumericArray = false;
            return null;
        }, null);
        if (!isNumericArray)
            throw new TypeError('Data is not a numeric array');
        result = new ArrayBuffer(data.length);
        new Uint8Array(result).set(data);
    } else {
        throw new TypeError('Accepted binary data types: hex string, number[], Buffer, ArrayBuffer, ArrayBufferView');
    }
    return result;
}
