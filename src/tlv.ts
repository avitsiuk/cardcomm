import { isHexString as isHex, removeHexPrefix, arrayToHex, hexToArray} from './utils';

interface ItlvObj {
    [key: string]: {
        length: number;
        value: ItlvObj | number[];
    };
}

const ERR_DATA_END = 'Unexpected data end';

export function simpleDecode(data: number[]): ItlvObj {
    const tvlObj: ItlvObj = {};
    if (data.length <= 0) {
        return tvlObj;
    }
    if (data.length === 1) throw new Error(ERR_DATA_END);
    for (let tagIdx = 0; tagIdx < data.length; ) {
        if (data[tagIdx] === 0x00 || data[tagIdx] === 0xff) {
            throw new Error(
                `Invalid tag: [${data[tagIdx].toString(16).padStart(2, '0')}]`,
            );
        }
        const tagHex = data[tagIdx].toString(16).toUpperCase().padStart(2, '0');
        const lenIdx = tagIdx + 1;
        if (lenIdx >= data.length) throw new Error(ERR_DATA_END);
        let valueIdx: number;
        let valueLen = 0;
        if (data[lenIdx] === 0xff) {
            if (data.length <= lenIdx + 2) {
                throw new Error(ERR_DATA_END);
            }
            valueLen = new Uint16Array(
                new Uint8Array(
                    data.slice(lenIdx + 1, lenIdx + 3),
                ).reverse().buffer,
            ).at(0)!;
            if (valueLen > 0 && data.length <= lenIdx + 2 + valueLen) {
                throw new Error(ERR_DATA_END);
            }
            valueIdx = lenIdx + (valueLen > 0 ? 3 : 2);
        } else {
            valueLen = data[lenIdx];
            valueIdx = lenIdx + (valueLen > 0 ? 1 : 0);
        }
        if (valueIdx + valueLen > data.length) {
            throw new Error(ERR_DATA_END);
        }
        if (typeof tvlObj[tagHex] !== 'undefined') {
            throw new Error(`Duplicate tag: [${tagHex}]`);
        }
        const value = data.slice(valueIdx, valueIdx + valueLen);
        tvlObj[tagHex] = {
            length: valueLen,
            value,
        };
        // advance at least by 1
        tagIdx = valueIdx + Math.max(1, valueLen);
    }
    return tvlObj;
}

type TTagClass = 'universal' | 'application' | 'context-specific' | 'private';

const BerTlvTagClassNames: TTagClass[] = [
    'universal', // 0b00(0)
    'application', // 0b01(1)
    'context-specific', // 0b10(2)
    'private', // 0b11(3)
];

interface IBerTlvObj {
    [key: string]: {
        class: TTagClass;
        constructed: boolean;
        number: number;
        value: number[] | IBerTlvObj;
    };
}

export function berTlvDecode(data: number[]): IBerTlvObj {
    const berTvlObj: IBerTlvObj = {};
    if (data.length <= 0) {
        return berTvlObj;
    }
    if (data.length === 1) throw new Error(ERR_DATA_END);
    for (let tagIdx = 0; tagIdx < data.length; ) {
        const tagClass = data[tagIdx] >> 6;
        const constructed = (data[tagIdx] & 0x20) > 0;
        let tagNumber = data[tagIdx] & 0x1f;
        let lenIdx = tagIdx + 1;
        if (tagNumber === 0x1f) {
            const tagArr: number[] = [];
            let tagEndIdx = tagIdx;
            while (true) {
                tagEndIdx++;
                if (tagEndIdx >= data.length) throw new Error(ERR_DATA_END);
                if (tagEndIdx - tagIdx > 4)
                    throw new Error('Tag field too long. Max 5 bytes total.'); //
                tagArr.push(data[tagEndIdx] & 0x7f);
                if ((data[tagEndIdx] & 0x80) === 0) break;
            }
            let compiledNumber = new Uint32Array([0]);
            tagArr.reverse();
            for (let i = 0; i < tagArr.length; i++) {
                compiledNumber[0] |= tagArr[i] << (7 * i);
            }
            tagNumber = compiledNumber[0];
            lenIdx = tagEndIdx + 1;
        }
        if (lenIdx >= data.length) throw new Error(ERR_DATA_END);
        let valueLen = data[lenIdx];
        let valueIdx = lenIdx + (valueLen > 0 ? 1 : 0);
        if ((valueLen & 0x80) > 0) {
            const lenNBytes = data[lenIdx] & 0x7f;
            if (lenNBytes > 4)
                throw new Error('Length field too long. Max 5 bytes total.');
            if (lenIdx + lenNBytes >= data.length)
                throw new Error(ERR_DATA_END);
            let tmp = new Uint32Array([0]);
            const bytes = data.slice(lenIdx + 1, lenIdx + lenNBytes + 1);
            bytes.reverse();
            for (let i = 0; i < bytes.length; i++) {
                tmp[0] |= bytes[i] << (8 * i);
            }
            valueLen = tmp[0];
            valueIdx = lenIdx + lenNBytes + (valueLen > 0 ? 1 : 0);
        }
        if (data.length < valueIdx + valueLen) throw new Error(ERR_DATA_END);
        const value = data.slice(valueIdx, valueIdx + valueLen);
        let tagHex = arrayToHex(data.slice(tagIdx, lenIdx));
        if (typeof berTvlObj[tagHex] !== 'undefined')
            throw new Error(`Duplicate tag: [${tagHex}]`);
        berTvlObj[tagHex] = {
            class: BerTlvTagClassNames[tagClass],
            constructed,
            number: tagNumber,
            value: constructed ? berTlvDecode(value) : value,
        };
        tagIdx = Math.max(1, valueIdx + valueLen);
    }
    return berTvlObj;
}

export interface IBerObj {
    [key: string]: {
        class?: TTagClass;
        value: number[] | IBerObj;
    };
}

function berTagEncode(
    tagClass: TTagClass,
    constructed: boolean,
    tagNumber: number,
): number[] {
    const classIdx = BerTlvTagClassNames.indexOf(tagClass);
    if (classIdx < 0) throw new Error(`Unknown class: "${classIdx}"`);

    let tagBytes: number[] = [0];
    tagBytes[0] |= classIdx << 6;

    if (constructed) tagBytes[0] |= 1 << 5;

    if (tagNumber < 31) {
        tagBytes[0] |= tagNumber;
    } else {
        if (tagNumber > 16383) {
            // 0x3FFF (2 groups of 7 bits)
            throw new Error(`Max tag number: 16383; received: ${tagNumber}`);
        }
        tagBytes[0] |= 31;
        const bitNum = Math.floor(Math.log2(tagNumber)) + 1;
        const additionalBytesNum = Math.ceil(bitNum / 7);
        const additionalTagBytes = new Array<number>(additionalBytesNum).fill(
            0,
        );

        const bitMask = 0x7f;

        for (let i = 0; i < additionalBytesNum; i++) {
            const shiftValue = 7 * (additionalBytesNum - i - 1);
            additionalTagBytes[i] =
                (tagNumber & (bitMask << shiftValue)) >> shiftValue;
            if (i < additionalBytesNum - 1) {
                additionalTagBytes[i] |= 0x80;
            }
        }
        tagBytes.push(...additionalTagBytes);
    }
    return tagBytes;
}

function berLengthEncode(length: number): number[] {
    const maxLen = 0xffff;
    if (length > maxLen) {
        throw new Error(
            `value too long; max: ${maxLen} bytes; received: ${length} bytes`,
        );
    }
    const result: number[] = [length];
    if (result[0] > 127) {
        const tmp = [...Buffer.from(arrayToHex(result, false), 'hex')];
        result[0] = 0x80;
        result[0] |= tmp.length;
        result.push(...tmp);
    }
    return result;
}

function isTagConstructed(tagBytes: number[]): boolean {
    if (tagBytes.length < 1) {
        throw new Error('Empty tag');
    }
    return (tagBytes[0] & (1 << 5)) > 0 ? true : false;
}

export function berTlvEncode(obj: IBerObj): number[] {
    let result: number[] = [];
    const tags = Object.keys(obj);
    for (let i = 0; i < tags.length; i++) {
        if (tags[i].length < 1 || !isHex(tags[i])) {
            throw new Error(`tag "${tags[i]}" is not a hex string`);
        }

        const isValueConstructed = Array.isArray(obj[tags[i]].value)
            ? false
            : true;

        let tagBytes: number[] = [];
        if (typeof obj[tags[i]].class === 'undefined') {
            // no "class" member. interpret tags[i] as ready-to-use tag
            tagBytes = hexToArray(tags[i]);
            if (tagBytes.length > 3) {
                throw new Error(`Tag "${tags[i]}" is too long; max 3 bytes`);
            }
            // logical XOR; throw if tag flag and value type mismatch
            if (
                isValueConstructed
                    ? !isTagConstructed(tagBytes)
                    : isTagConstructed(tagBytes)
            ) {
                throw new Error(
                    `Tag "${tags[i]}" is marked as${isTagConstructed(tagBytes) ? '' : ' not'} constructed, but the actual value is${isValueConstructed ? '' : ' not'} constructed`,
                );
            }
        } else {
            // "class" member defined. interpret tags[i] as tag number
            try {
                tagBytes = berTagEncode(
                    obj[tags[i]].class!,
                    isValueConstructed,
                    Number.parseInt(tags[i], 16),
                );
            } catch (e) {
                throw new Error(`Tag "${tags[i]}" error: ${e}`);
            }
        }

        let valueBytes: number[] = [];
        if (isValueConstructed) {
            try {
                valueBytes = berTlvEncode(obj[tags[i]].value as IBerObj);
            } catch (e) {
                throw new Error(`Tag "${tags[i]}" error: ${e}`);
            }
        } else {
            valueBytes = obj[tags[i]].value as number[];
        }

        let lengthBytes: number[] = [];
        try {
            lengthBytes = berLengthEncode(valueBytes.length);
        } catch (e) {
            throw new Error(`Tag "${tags[i]}" error: ${e}`);
        }

        result.push(...tagBytes);
        result.push(...lengthBytes);
        result.push(...valueBytes);
    }
    return result;
}

function innerPrintBerTlvObj(obj: IBerTlvObj, printFunction: (line: string)=>void, spaces: number, indentLevel: number): void {
    const tagsList = Object.keys(obj);
    for (let tagIdx = 0; tagIdx < tagsList.length; tagIdx++) {
        const currTag = tagsList[tagIdx];
        let currLine = ''.padStart(spaces * indentLevel, ' ').concat(`[${currTag}]:`);
        if (obj[currTag].constructed) {
            printFunction(currLine);
            innerPrintBerTlvObj((obj[currTag].value as IBerTlvObj), printFunction, spaces, (indentLevel + 1))
        } else {
            currLine += ` ${arrayToHex((obj[currTag].value as number[]))}`;
            printFunction(currLine);
        }
    }
}

export function printBerTlvObj(obj: IBerTlvObj, printFunction?: (line: string)=>void | null, spaces?: number): void {
    innerPrintBerTlvObj(obj, printFunction || console.log, spaces || 2, 0);
}
