import {
    hexEncode,
    importBinData,
    TBinData,
    isBinData,
} from '../utils';
import {
    ITagInfo,
    parseLength,
    serializeLength,
    isTagInfo,
} from './berUtils';
import {
    Tag,
} from './tag';

export interface IBerObjInfo {
    tag: ITagInfo | TBinData | Tag,
    value: TBinData | IBerObjInfo[]
}

export interface IBerObj extends IBerObjInfo {
    tag: Tag,
    length: number;
    value: Uint8Array | IBerObj[]
}

export function parseBer(input: TBinData, startOffset: number = 0): IBerObj[] {
    let inBuffer: Uint8Array;
    try {
        inBuffer = importBinData(input);
    } catch (error: any) {
        throw new Error(`Error decoding binary data: ${error.message}`);
    }
    if (inBuffer.byteLength === 0) return [];

    if(startOffset < 0 || (startOffset >= inBuffer.byteLength))
        throw new RangeError(`Start offset "${startOffset}" is outside of byte array range. Received byte array length: ${inBuffer.byteLength}`);

    inBuffer = inBuffer.subarray(startOffset);

    const result: IBerObj[] = [];

    let currInOffset: number = 0;

    while(currInOffset < inBuffer.length) {
        let parsedTag: Tag;
        try {
            parsedTag = Tag.from(inBuffer, currInOffset);
        } catch (error: any) {
            throw error;
        }
        // console.log(parsedTag);
        currInOffset += parsedTag.byteLength;

        let parsedLen: {value: number, byteLength: number};
        try {
            parsedLen = parseLength(inBuffer, currInOffset);
        } catch (error: any) {
            throw new Error(`Error parsing length: ${error.message}`)
        }

        if (inBuffer.byteLength < (currInOffset + parsedLen.byteLength + parsedLen.value))
            throw new Error('Unexpected end of data');

        currInOffset += parsedLen.byteLength;

        let parsedValue: Uint8Array | IBerObj[]

        if (parsedTag.isPrimitive) {
            if (parsedLen.value === 0) {
                parsedValue = new Uint8Array(0);
            } else {
                parsedValue = inBuffer.subarray(currInOffset, currInOffset + parsedLen.value);
            }
        } else {
            if (parsedLen.value === 0) {
                parsedValue = new Uint8Array(0);
            } else {
                try {
                    parsedValue = parseBer(inBuffer.subarray(currInOffset, currInOffset + parsedLen.value));
                } catch (error: any) {
                    throw error;
                }
            }
        }

        result.push({tag: parsedTag, length: parsedLen.value, value: parsedValue});

        currInOffset += parsedLen.value
    }
    return result;
}
