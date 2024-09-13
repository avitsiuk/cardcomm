import {
    importBinData,
    isBinData,
    TBinData,
    getMinWordNum,
    hexEncode,
} from '../utils';
import { serializeLength } from './berUtils';
import Tag from './tag';
import { IBerObjInfo, IBerObj, parseBer } from './parser';

export interface IBerObjPrimitive extends IBerObj {
    tag: Tag,
    length: number;
    value: Uint8Array
}

export interface IBerObjConstructed extends IBerObj {
    tag: Tag,
    length: number;
    value: BerObject[]
}

/** Path to a tag inside a ber object */
type TBerObjectPath = {
    /** Path that uses tag hex names as it's nodes. This can be used for string-based search (e.g. regex). However it's possible to have same named paths for two or more distinct values. For this reason the corresponding indexed path must be used for the actual access. */
    hex: string;
    /** Path that uses tag numerical indexes as it's nodes. Indicates the exact value that the corresponding named path refers to. */
    indexes: number[];
};

const berSearchQueryValidationRegex = /^(\/[0-9a-fA-F]+|\/\*|\/\*\*)+$/g;

export function isValidBerSearchQuery(str: string): boolean {
    if (str.length < 1) return false;
    if (str.match(berSearchQueryValidationRegex)) return true;
    return false;
}

export class BerObject implements IBerObj {

    private _tag: Tag = new Tag();
    private _len: number = 0;
    private _val: Uint8Array | BerObject[] = [];

    static parse(input: TBinData, startOffset: number = 0): BerObject {
        return new BerObject().parse(input, startOffset);
    }

    static create(input?: IBerObjInfo): BerObject {
        return new BerObject(input);
    }

    static serialize(input: IBerObjInfo, outBuffer: ArrayBuffer | ArrayBufferView, outOffset: number = 0): Uint8Array {
        return BerObject.create(input).serialize(outBuffer, outOffset);
    }

    isRoot(): boolean {
        return this.tag.byteLength === 0;
    }

    isPrimitive(): this is IBerObjPrimitive {
        return this._tag.isPrimitive && !this.isRoot();
    }

    isConstructed(): this is IBerObjConstructed {
        return this._tag.isConstructed || this.isRoot();
    }

    get tag(): Tag {
        return this._tag;
    }

    get length(): number {
        return this._len;
    }

    get value(): BerObject[] | Uint8Array {
        return this._val;
    }

    constructor(input?: IBerObjInfo) {
        if (typeof input === 'undefined') {
            return this;
        }
        return this.create(input);
    }

    parse(input: TBinData, startOffset: number = 0): this {
        let parseResult: IBerObj[];
        try {
            parseResult = parseBer(input, startOffset);
        } catch (error: any) {
            throw new Error(`Error parsing ber data: ${error.message}`)
        }
        return this.setConstructedValue(parseResult);
    }

    create(input: IBerObjInfo): this {
        if (typeof input === 'object' && typeof this['tag'] !== 'undefined' && typeof this['value'] !== 'undefined') {
            let tag: Tag;
            try {
                tag = new Tag(input.tag);
            } catch (error: any) {
                throw new Error(`Ber object creation error: Could not import tag: ${error.message}`);
            }
            if (isBinData(input.value)) {
                if (tag.isPrimitive) { // primitive tag, do not decode value
                    try {
                        this._val = importBinData(input.value);
                    } catch (error: any) {
                        throw new Error(`Ber object creation error: Could not import binary value for primitive tag "${tag.hex}": ${error.message}`);
                    }
                    this._len = this._val.byteLength;
                    this._tag = new Tag(input.tag);
                    return this;
                } else { // constructed tag, parse binary value
                    let parseResult: IBerObj[];
                    try {
                        parseResult = parseBer(input.value);
                    } catch (error: any) {
                        throw new Error(`Ber object creation error: Could not parse binary value for constructed tag "${tag.hex}": ${error.message}`);
                    }

                    this._tag = tag;
                    return this.setConstructedValue(parseResult);
                }
            } else {
                if (tag.isPrimitive && tag.byteLength > 0) {
                    throw new Error(`Tag "${tag.hex}" is primitive, while the value is not.`);
                }

                this._tag = tag;
                return this.setConstructedValue(input.value);

                // create other objects from object array in value
            }
        } else {
            throw new Error('Unknown format of BerObject creation info')
        }
    }

    serialize(outBuffer?: ArrayBuffer | ArrayBufferView, outOffset: number = 0): Uint8Array {
        let requiredByteLength = this._len;

        if(!this.isRoot()) {
            requiredByteLength += this._tag.byteLength;
            requiredByteLength += (1 + (this._len < 128 ? 0 : getMinWordNum(this._len, 8)));
        }

        let outByteArray: Uint8Array;
        if (typeof outBuffer === 'undefined') {
            outByteArray = new Uint8Array(requiredByteLength);
        } else {
            if (outBuffer instanceof ArrayBuffer) {
                outByteArray = new Uint8Array(outBuffer);
            } else if (ArrayBuffer.isView(outBuffer)) {
                outByteArray = new Uint8Array(outBuffer.buffer).subarray(outBuffer.byteOffset, outBuffer.byteOffset + outBuffer.byteLength);
            } else {
                throw new TypeError('outBuffer must be an ArrayBuffer or ArrayBufferView');
            }

            if ((outOffset < 0) || (outOffset >= outBuffer.byteLength)) throw new Error(`outOffset value out of bounds; value: ${outOffset}`);

            outByteArray = outByteArray.subarray(outOffset);

            if (requiredByteLength > outByteArray.byteLength)
                throw new Error('Not enough space in the provided outBuffer');
        }

        let serOffset: number = 0;

        if (!this.isRoot()) {
            outByteArray.set(this._tag.toByteArray(), serOffset);
            // console.log(hexEncode(outByteArray));
            serOffset += this._tag.byteLength;
            serOffset += serializeLength(this._len, outByteArray, serOffset).byteLength;
        }

        if (this.isPrimitive()) {
            outByteArray.set(this.value, serOffset);
            serOffset += this.value.byteLength;
        } else if (this.isConstructed()) {
            for (let i = 0; i < this.value.length; i++) {
                serOffset += this.value[i].serialize(outByteArray, serOffset).byteLength;
            }
        }
        return outByteArray.subarray(0, serOffset);
    }

    private setConstructedValue(input: IBerObjInfo[]): this {
        const berObjArray: BerObject[] = [];
        let length: number = 0;
        for (let i = 0; i < input.length; i++) {
            const berObj = new BerObject(input[i]);
            const lenFieldByteLength: number = 1 + (berObj._len < 128 ? 0 : getMinWordNum(berObj._len, 8));
            length += (berObj._tag.byteLength + lenFieldByteLength + berObj.length);
            berObjArray.push(berObj);
        }

        this._len = length;
        this._val = berObjArray;
        return this;
    }

    private printInternal(printFn?: (line: string) => void, spaces: number = 4, level: number = 0): void {
        const f: (line: string) => void = printFn ? printFn : console.log;
        let line: string = `${''.padEnd(level * spaces, ' ')}${this._tag.hex} (${this._len} bytes):`;
        if (this.isPrimitive()) {
            line += ` ${hexEncode(this.value)}`;
            f(line);
        } else if (this.isConstructed()) {
            f(line);
            for (let i = 0; i < this.value.length; i++) {
                (this.value[i] as BerObject).printInternal(printFn, spaces, level + 1);
            }
        }
    }

    print(printFn?: (line: string) => void, spaces: number = 4): void {
        this.printInternal(printFn, spaces, 0)
    }

    /** This method will return an array of all possible paths in two formats: named and indexed.
     * @example BerObject.parse('6F1A840E315041592E5359532E4444463031A5088801025F2D02656E6F1A840E315041592E5359532E4444463031A5088801025F2D02656E6F12840E315041592E5359532E4444463031A500').genPathList()  
     * ```
     *[
     *  { named: '/6f', indexed: [ 0 ] },
     *  { named: '/6f/84', indexed: [ 0, 0 ] },
     *  { named: '/6f/a5', indexed: [ 0, 1 ] },
     *  { named: '/6f/a5/88', indexed: [ 0, 1, 0 ] },
     *  { named: '/6f/a5/5f2d', indexed: [ 0, 1, 1 ] },
     *  { named: '/6f', indexed: [ 1 ] },
     *  { named: '/6f/84', indexed: [ 1, 0 ] },
     *  { named: '/6f/a5', indexed: [ 1, 1 ] },
     *  { named: '/6f/a5/88', indexed: [ 1, 1, 0 ] },
     *  { named: '/6f/a5/5f2d', indexed: [ 1, 1, 1 ] },
     *  { named: '/6f', indexed: [ 2 ] },
     *  { named: '/6f/84', indexed: [ 2, 0 ] },
     *  { named: '/6f/a5', indexed: [ 2, 1 ] }
     *]
    */
    genPathList(): TBerObjectPath[] {
        const result: TBerObjectPath[] = [];
        if (this.isConstructed()) {
            for (let childIdx = 0; childIdx < this.value.length; childIdx++) {
                result.push({hex: `/${this.value[childIdx].tag.hex}`, indexes: [childIdx]});
                this.value[childIdx].genPathList().reduce((_, childPath) => {
                    result.push({
                        hex: `/${this.value[childIdx].tag.hex}${childPath.hex}`,
                        indexes: [childIdx, ...childPath.indexes],
                    });
                    return null;
                }, null)
            }
        }
        return result;
    }

    search(query: string): BerObject[] {
        if (!isValidBerSearchQuery(query))
            throw new Error('Invalid search query');
    
        let regexString = query
            .replace(/\/\*\*/g, '(\\/[0-9a-fA-F]*)*')
            .replace(/\/\*/g, '(\\/[0-9a-fA-F]*)')
            .replace(/(\/)([0-9a-fA-F])/g, '\\/$2');
    
        regexString = `^${regexString}$`;
    
        const matchingPaths = this.genPathList().filter((path) => {
            if (path.hex.match(regexString)) {
                return true;
            } else {
                return false;
            }
        });

        const result: BerObject[] = new Array<BerObject>(matchingPaths.length);

        matchingPaths.reduce((_, currentPath, currentPathIdx)=>{
            let currBerObj: BerObject = this;
            currentPath.indexes.reduce((_, currPathNodeValue, currPathNodeIdx) => {
                if (!currBerObj.isConstructed() || (currBerObj.value.length <= currPathNodeValue))
                    throw new Error(`Error examining path "${currentPath.hex}"("/${currentPath.indexes.join('/')}"); BER object "${this._tag.hex}" does not have internal object with index "${currPathNodeValue}".`)
                currBerObj = currBerObj.value[currPathNodeValue];
                return null;
            }, null);
            result[currentPathIdx] = currBerObj;
            return null;
        }, null);

        return result;
    }
}

export default BerObject;