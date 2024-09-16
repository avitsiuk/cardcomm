import { TBinData, hexEncode, importBinData } from '../utils';

import {
    MAX_TAG_BYTE_LENGTH,
    MAX_TAG_SAFE_NUMBER,
    TTlvTagClassName,
    TTlvTagClassNumber,
    tlvClassName,
    tlvClassNumber,
    ITagInfo,
    TParseTagResult,
    isTagInfo,
    parseTag,
    serializeTag,
} from './berUtils';

export class Tag implements ITagInfo {
    static readonly MAX_BYTE_LENGTH = MAX_TAG_BYTE_LENGTH;
    static readonly MAX_NUMBER = MAX_TAG_SAFE_NUMBER;
    private byteArray: Uint8Array = new Uint8Array(Tag.MAX_BYTE_LENGTH);
    private bLength: number = 0;
    private _hex: string = '';
    private _class: TTlvTagClassNumber = 0;
    private _constructed: boolean = false;
    private _number: number = 0;

    /** Returns an empty tag, which can be used as the root of a new BER object */
    static get root(): Tag {
        return new Tag();
    }

    /** Creates a new BER Tag from an input
     * @param input - An object describing tag, binary data or another tag object
     * @param startOffset - Used to indicate an offset from which to start parsing in case input is of binary type. Has no effect otherwise
     */
    static from(
        input?: ITagInfo | TBinData | Tag,
        startOffset: number = 0,
    ): Tag {
        return new Tag(input, startOffset);
    }

    constructor(input?: ITagInfo | TBinData | Tag, startOffset: number = 0) {
        if (typeof input === 'undefined') {
            return this;
        }
        return this.from(input, startOffset);
    }

    /**
     * Creates a Tag object from input data
     * @param input - Binary data or an info object describing a Tag
     * @param startOffset - Used to indicate an offset from which to start parsing in case input is of binary type. Has no effect otherwise
     * @returns
     */
    from(input: ITagInfo | TBinData | Tag, startOffset: number = 0): this {
        if (input instanceof Tag) {
            this.byteArray.set(input.byteArray);
            this.bLength = input.bLength;
            this._hex = input._hex;
            this._class = input._class;
            this._constructed = input._constructed;
            this._number = input._number;
            return this;
        }
        if (isTagInfo(input)) {
            if (input.number > Tag.MAX_NUMBER) {
                throw new Error(
                    `Error parsing tag: Number exceeds max allowed value of ${Tag.MAX_NUMBER}; received: ${input.number}`,
                );
            }
            const classNumber: number =
                typeof input.class === 'number'
                    ? input.class
                    : tlvClassNumber[input.class];
            this._class = Math.floor(classNumber) as TTlvTagClassNumber;
            this._constructed = input.isConstructed;
            this._number = Math.floor(input.number);

            const encodeResult = serializeTag(input, this.byteArray);
            this.bLength = encodeResult.byteLength;
            this._hex = hexEncode(encodeResult);
        } else {
            let inBuffer: Uint8Array;
            try {
                inBuffer = importBinData(input);
            } catch (error: any) {
                throw new Error(`Error parsing tag: ${error.message}`);
            }

            let decodeResult: TParseTagResult;
            try {
                decodeResult = parseTag(inBuffer, startOffset);
            } catch (error: any) {
                throw new Error(`Error parsing tag: ${error.message}`);
            }

            this._class = decodeResult.class;
            this._constructed = decodeResult.isConstructed;
            this._number = decodeResult.number;
            this.byteArray.set(
                inBuffer.subarray(
                    startOffset,
                    startOffset + decodeResult.byteLength,
                ),
            );
            this.bLength = decodeResult.byteLength;
            this._hex = hexEncode(this.toByteArray());
        }
        return this;
    }

    /** Returns tag byte array */
    toByteArray(): Uint8Array {
        return this.byteArray.subarray(0, this.bLength);
    }

    /** Returns tag hex value */
    toString(): string {
        return this._hex;
    }

    /** Tag length in bytes */
    get byteLength(): number {
        return this.bLength;
    }

    /** Tag class as number */
    get class(): TTlvTagClassNumber {
        return this._class;
    }

    /** Tag class as name */
    get className(): TTlvTagClassName {
        return tlvClassName[this._class];
    }

    /** Constructed tags indicate a BER object that contains other BER objects */
    get isConstructed(): boolean {
        return this._constructed;
    }

    /** Primitive tags indicate a BER object that contains raw binary data */
    get isPrimitive(): boolean {
        return !this._constructed;
    }

    /** Tag number */
    get number(): number {
        return this._number;
    }

    /** Tag hexadecimal representation */
    get hex(): string {
        return this._hex;
    }
}

export default Tag;
