import {
    importBinData,
    isBinData,
    TBinData,
    getMinWordNum,
    hexEncode,
} from '../utils';
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
    value: IBerObj[]
}

export class BerObject {

    private _tag: Tag = new Tag();
    private _len: number = 0;
    private _val: Uint8Array | BerObject[] = [];

    static parse(input: TBinData, startOffset: number = 0): BerObject {
        return new BerObject().parse(input, startOffset);
    }

    static create(input?: IBerObjInfo): BerObject {
        return new BerObject(input);
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
        return this;
    }

    private setConstructedValue(input: IBerObjInfo[]): this {
        const berObjArray: BerObject[] = [];
        let length: number = 0;
        for (let i = 0; i < input.length; i++) {
            const berObj = new BerObject(input[i]);
            const lenFieldByteLength: number = 1 + (berObj.length < 128 ? 0 : getMinWordNum(berObj.length, 8));
            length += (berObj.tag.byteLength + lenFieldByteLength + berObj.length);
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
}

export default BerObject;