export function toByteArray(hexStr: string) {
    const hex: number[] = [];
    const arr = hexStr.match(/[0-9a-fA-F]{2}/g);
    if (arr) {
        arr.forEach((h) => {
            hex.push(parseInt(h, 16));
        });
    }
    return hex;
}

export function toHexString(byteArray: number[]) {
    let str = '';
    byteArray.forEach((b) => {
        const hex = (b.toString(16));
        str += (hex.length < 2 ? '0' + hex : hex);
    });
    return str;
}

export function bufferToArray(buffer: Buffer) {
    if (buffer.length > 0) {
        const data = new Array<number>(buffer.length);
        for (let i = 0; i < buffer.length; i = i+1) {
            data[i] = buffer[i];
        }
        return data;
    }
    return [];
}
