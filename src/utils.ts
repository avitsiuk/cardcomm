const hexRegex = /^[0-9A-Fa-f]*$/g;

export function isHex(str: string): boolean {
    if (!str.match(hexRegex)) {
        return false;
    };
    return true;
}

export function bufferToArray(buffer: Buffer): number[] {
    if (buffer.length > 0) {
        const array = new Array<number>(buffer.length);
        for (let i = 0; i < buffer.length; i = i + 1) {
            array[i] = buffer.readUInt8(i);
        }
        return array;
    }
    return [];
}

/**
 * @param wrapOverflow - if true(default) 256 gets enoded as '00' otherwise '0100'
 */
export function arrayToHex(array: number[], wrapOverflow: boolean = true): string {
    if (array && array.length > 0) {
        let str = '';
        for (let i = 0; i < array.length; i = i + 1) {
            let hex = array[i].toString(16);
            hex = `${hex.length % 2 ? '0': ''}${hex}`;
            str += wrapOverflow ? hex.substring(hex.length - 2) : hex;
        }
        return str;
    }
    return '';
}

export function hexToArray(hex: string): number[] {
    if (hex.length < 1) {
        return [];
    }
    if (!isHex(hex)) {
        throw new Error('Not a hex string');
    }
    const paddedHex = hex.padStart(hex.length + (hex.length % 2), '0');
    const arrayLen = paddedHex.length / 2;
    const array = new Array<number>(arrayLen);
    for (let i = 0; i < arrayLen; i = i + 1) {
        array[i] = parseInt(paddedHex.substring(i * 2, i * 2 + 2), 16);
    }
    return array;
}
