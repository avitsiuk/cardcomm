import { isHex, arrayToHex } from './utils';

interface ItlvObj {
    [key: string]: {
        length: number,
        value: ItlvObj | number[],
    }
};

const ERR_DATA_END = 'Unexpected data end';

export function simpleDecode(data: number[]): ItlvObj {
    const tvlObj: ItlvObj = {};
    if (data.length <= 0) {
        return tvlObj;
    }
    if (data.length === 1) throw new Error(ERR_DATA_END);
    for (let tagIdx = 0; tagIdx < data.length;) {
        if (data[tagIdx] === 0x00 || data[tagIdx] === 0xFF) {
            throw new Error(`Invalid tag: [${data[tagIdx].toString(16).padStart(2, '0')}]`);
        }
        const tagHex = data[tagIdx].toString(16).toUpperCase().padStart(2, '0');
        const lenIdx = tagIdx + 1;
        if (lenIdx >= data.length) throw new Error(ERR_DATA_END);
        let valueIdx: number;
        let valueLen = 0;
        if (data[lenIdx] === 0xFF) {
            if (data.length <= lenIdx + 2) {
                throw new Error(ERR_DATA_END);
            }
            valueLen = new Uint16Array(
                    new Uint8Array(
                        data.slice(lenIdx + 1, lenIdx + 3)
                    ).reverse().buffer
                ).at(0)!;
            if ((valueLen > 0) && (data.length <= lenIdx + 2 + valueLen)) {
                throw new Error(ERR_DATA_END);
            }
            valueIdx = lenIdx + (valueLen > 0 ? 3 : 2);
        } else {
            valueLen = data[lenIdx];
            valueIdx = lenIdx + (valueLen > 0 ? 1 : 0);
        }
        if ((valueIdx + valueLen) > data.length) {
            throw new Error(ERR_DATA_END);
        }
        if (typeof tvlObj[tagHex] !== 'undefined') {
            throw new Error(`Duplicate tag: [${tagHex}]`);
        }
        const value = data.slice(valueIdx, valueIdx + valueLen);
        tvlObj[tagHex] = {
            length: valueLen,
            value,
        }
        // advance at least by 1
        tagIdx = valueIdx + Math.max(1, valueLen);
    }
    return tvlObj;
}

const BerTlvTagClassNames = [
    'universal',        // 00
    'application',      // 01
    'context-specific', // 10
    'private',          // 11
]

interface IBerTlvObj {
    [key: string]: {
        class: typeof BerTlvTagClassNames[number],
        constructed: boolean,
        value: number[] | IBerTlvObj,
    }
}

export function berDecode(data: number[]): IBerTlvObj {
    const berTvlObj: IBerTlvObj = {};
    if (data.length <= 0) {
        return berTvlObj;
    }
    if (data.length === 1) throw new Error(ERR_DATA_END);
    for (let tagIdx = 0; tagIdx < data.length;) {
        const tagClass = data[tagIdx] >> 6;
        const constructed = (data[tagIdx] & 0x20) > 0;
        let tagValue = data[tagIdx] & 0x1F;
        let lenIdx = tagIdx + 1;
        if (tagValue === 0x1F) {
            const tagArr: number[] = [];
            let tagEndIdx = tagIdx;
            while(true) {
                tagEndIdx++;
                if (tagEndIdx >= data.length ) throw new Error(ERR_DATA_END);
                if (tagEndIdx - tagIdx > 4 ) throw new Error('Tag field too long. Max 5 bytes total.'); //
                tagArr.push(data[tagEndIdx] & 0x7F);
                if ((data[tagEndIdx] & 0x80) === 0) break;
            }
            let compiledNumber = new Uint32Array([0]);
            tagArr.reverse();
            for (let i = 0; i < tagArr.length; i++) {
                compiledNumber[0] |= tagArr[i] << 7*i;
            }
            tagValue = compiledNumber[0];
            lenIdx = tagEndIdx + 1;
        }
        if (lenIdx >= data.length ) throw new Error(ERR_DATA_END);
        let valueLen = data[lenIdx];
        let valueIdx = lenIdx + (valueLen > 0 ? 1 : 0);
        if ((valueLen & 0x80) > 0) {
            const lenNBytes = data[lenIdx] & 0x7F;
            if (lenNBytes > 4) throw new Error('Length field too long. Max 5 bytes total.');
            if(lenIdx + lenNBytes >= data.length) throw new Error(ERR_DATA_END);
            let tmp = new Uint32Array([0]);
            const bytes = data.slice(lenIdx + 1, lenIdx + lenNBytes + 1);
            bytes.reverse();
            for (let i = 0; i < bytes.length; i++) {
                tmp[0] |= bytes[i] << (8*i);
            }
            valueLen = tmp[0];
            valueIdx = lenIdx + lenNBytes + (valueLen > 0 ? 1 : 0);
        }
        if (data.length < valueIdx + valueLen) throw new Error(ERR_DATA_END);
        const value = data.slice(valueIdx, valueIdx + valueLen);
        tagIdx = Math.max(1, (valueIdx + valueLen))
        let tagHex = tagValue.toString(16).toUpperCase();
        tagHex = tagHex.padStart(
            (tagHex.length % 2 > 0 ? tagHex.length + 1 : tagHex.length),
            '0'
        );
        if (typeof berTvlObj[tagValue] !== 'undefined') throw new Error(`Duplicate tag: [${tagValue}]`);
        berTvlObj[tagHex] = {
            class: BerTlvTagClassNames[tagClass],
            constructed,
            value: (constructed ? berDecode(value) : value),
        }
    }
    return berTvlObj;
}

export interface IBerObj {
    [key: string]: {
        class: typeof BerTlvTagClassNames[number],
        value: number[] | IBerObj,
    }
}

export function berTlvEncode(obj: IBerObj): number[] {
    let result: number[] = [];
    const tags = Object.keys(obj);
    for (let i = 0; i < tags.length; i++) {
        const tagStr = tags[i];
        if (!isHex(tagStr)) {
            throw new Error(`tag "${tagStr}" is not a hex string`);
        }

        const tagClass = BerTlvTagClassNames.indexOf(obj[tagStr].class);
        if (tagClass < 0) throw new Error(`Unknown class: "${obj[tagStr].class}"`);

        const tagNum = Number.parseInt(tagStr, 16);

        let tagBytes: number[] = [0];
        tagBytes[0] |= tagClass << 6;

        if (tagNum < 31) {
            tagBytes[0] |= tagNum;
        } else {
            tagBytes[0] |= 31;
            const bitNum = Math.floor(Math.log2(tagNum)) + 1;
            const additionalBytesNum = Math.ceil(bitNum / 7);
            const additionalTagBytes = new Array<number>(additionalBytesNum).fill(0);

            const bitMask = 0x7F;

            for (let i = 0; i < additionalBytesNum; i++) {
                const shiftValue = 7*(additionalBytesNum - i - 1);
                additionalTagBytes[i] = (tagNum & (bitMask << shiftValue)) >> shiftValue;
                if (i < (additionalBytesNum - 1)) {
                    additionalTagBytes[i] |= 0x80;
                }
            }
            tagBytes.push(...additionalTagBytes);
        }

        let valueBytes: number[] = [];
        if(Array.isArray(obj[tagStr].value)) {
            valueBytes = obj[tagStr].value as number[];
        } else {
            tagBytes[0] |= 0x20;
            valueBytes = berTlvEncode(obj[tagStr].value as IBerObj);
        }

        const maxLen = 0xFFFFFFFF;
        if (valueBytes.length > maxLen) {
            throw new Error(`value for tag ${tagStr} is too long; max: ${maxLen} bytes; received: ${valueBytes.length} bytes`);
        }
        const lenBytes: number[] = [valueBytes.length];
        if (lenBytes[0] > 127) {
            const tmp = [...Buffer.from(arrayToHex(lenBytes, false), 'hex')];
            lenBytes[0] = 0x80;
            lenBytes[0] |= tmp.length;
            lenBytes.push(...tmp);
        }

        result.push(...tagBytes);
        result.push(...lenBytes);
        result.push(...valueBytes);
    }
    return result;
}