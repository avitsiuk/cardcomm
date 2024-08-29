import { bufferToArray, hexToArray, arrayToHex } from './utils';

// CASE   CMD-DATA(LC)   RSP-DATA(LE)
//  1     N             N
//  2     N             Y
//  3     Y             N
//  4     Y             Y

export class CommandApdu {
    static MAX_DATA_BYTES: number = 255;

    private _byteArray: number[] = [0x00, 0x00, 0x00, 0x00];

    static from(data?: string | number[] | Buffer | ArrayBuffer | ArrayBufferView | CommandApdu): CommandApdu {
        return new CommandApdu(data);
    }

    constructor(data?: string | number[] | Buffer | ArrayBuffer | ArrayBufferView | CommandApdu) {

        if (typeof data === 'undefined')
            return this;

        return this.from(data);
    }

    from(data: string | number[] | Buffer | ArrayBuffer | ArrayBufferView | CommandApdu): CommandApdu {
        if (typeof data === 'undefined')
            return this;

        let numArray: number[] = [];

        if (typeof data === 'string') {
            numArray = hexToArray(data);
        } else if (Buffer.isBuffer(data)) {
            numArray = [...data];
        } else if (data instanceof ArrayBuffer) {
            numArray = [...new Uint8Array(data)];
        } else if (ArrayBuffer.isView(data)) {
            numArray = [...new Uint8Array(data.buffer)];
        } else if (data instanceof CommandApdu) {
            numArray = data.toArray();
        } else if (Array.isArray(data)) {
            numArray = data;
        } else {
            throw new TypeError('Accepted CommandApdu constructor types: hex string, number[], Buffer, ArrayBuffer, ArrayBufferView, CommandApdu');
        }
        this.fromArray(numArray);
        return this;
    }

    get length(): number {
        return this._byteArray.length;
    }

    fromArray(data: number[]) {
        if (data.length < 4) {
            throw new Error(`Command array too short(min 4 bytes): [${data}]`);
        }
        this._byteArray = data;
        return this;
    }

    fromBuffer(data: Buffer): this {
        return this.fromArray(bufferToArray(data));
    }

    fromString(data: string): this {
        return this.fromArray(hexToArray(data));
    }

    toArray(): number[] {
        return this._byteArray;
    }

    toBuffer(): Buffer {
        return Buffer.from(this.toArray());
    }

    toString(): string {
        return arrayToHex(this.toArray());
    }

    // raw header bytes

    setCla(cla: number): this {
        this._byteArray[0] = cla;
        return this;
    }

    set cla(cla: number) {
        this.setCla(cla);
    }

    getCla(): number {
        return this._byteArray[0];
    }

    get cla(): number {
        return this.getCla();
    }

    setIns(ins: number): this {
        this._byteArray[1] = ins;
        return this;
    }

    set ins(ins: number) {
        this.setIns(ins);
    }

    getIns(): number {
        return this._byteArray[1];
    }

    get ins(): number {
        return this.getIns();
    }

    setP1(p1: number): this {
        this._byteArray[2] = p1;
        return this;
    }

    set p1(p1: number) {
        this.setP1(p1);
    }

    getP1(): number {
        return this._byteArray[2];
    }

    get p1(): number {
        return this.getP1();
    }

    setP2(p2: number): this {
        this._byteArray[3] = p2;
        return this;
    }

    set p2(p2: number) {
        this.setP2(p2);
    }

    getP2(): number {
        return this._byteArray[3];
    }

    get p2(): number {
        return this.getP2();
    }

    setData(data: string | number[] | Buffer | ArrayBuffer | ArrayBufferView): this {
        let numArray: number[] = [];

        if (typeof data === 'string') {
            numArray = hexToArray(data);
        } else if (Buffer.isBuffer(data)) {
            numArray = [...data];
        } else if (data instanceof ArrayBuffer) {
            numArray = [...new Uint8Array(data)];
        } else if (ArrayBuffer.isView(data)) {
            numArray = [...new Uint8Array(data.buffer)];
        } else if (Array.isArray(data)) {
            numArray = data;
        } else {
            throw new TypeError('Accepted CommandApdu data types: string, number[], Buffer, BinaryData, ResponseApdu');
        }

        if (numArray.length > CommandApdu.MAX_DATA_BYTES) {
            throw new Error(
                `Data too long; Max: ${CommandApdu.MAX_DATA_BYTES} bytes; Received: ${numArray.length} bytes`,
            );
        }
        const header = this._byteArray.slice(0, 4);
        let le: number;
        if (this._byteArray.length > 4) {
            le = this._byteArray[this._byteArray.length - 1];
        } else {
            le = 0;
        }
        this._byteArray = new Array<number>(...header);
        const lc = numArray.length;
        if (lc > 0) {
            this._byteArray.push(lc);
            this._byteArray.push(...numArray);
        }
        this._byteArray.push(le);
        return this;
    }

    set data(data: string | number[] | Buffer | ArrayBuffer | ArrayBufferView) {
        this.setData(data);
    }

    getData(): number[] {
        let data = new Array<number>(0);
        if (this._byteArray.length > 5) {
            const dataWithLc = this._byteArray.slice(4);
            if (dataWithLc.length > 1)
                data = dataWithLc.slice(1, 1 + dataWithLc[0]);
        }
        return data;
    }

    get data(): number[] {
        return this.getData();
    }

    getLc(): number {
        let lc = 0;
        if (this._byteArray.length > 5) lc = this._byteArray[4];
        return lc;
    }

    get lc(): number {
        return this.getLc();
    }

    setLe(le: number = 0): this {
        if (this._byteArray.length > 4) {
            this._byteArray[this.length - 1] = le;
        } else {
            this._byteArray.push(le);
        }
        return this;
    }

    set le(le: number) {
        this.setLe(le);
    }

    getLe(): number {
        let le = 0;
        if (this._byteArray.length > 4) {
            le = this._byteArray[this.length - 1];
        }
        return le;
    }

    get le(): number {
        return this.getLe();
    }

    // =========================================================================

    // class byte

    /** Sets m.s.b. of CLA byte to 1, marking command as having proprietary format */
    setProprietary(): this {
        this._byteArray[0] |= 0x80;
        return this;
    }

    /** Sets m.s.b. of CLA byte to 0, marking command as having interindustry format
     * All newly created commands are set as interindustry by default
     */
    setInterindustry(): this {
        this._byteArray[0] &= 0x7f;
        return this;
    }

    /** Returns true if CLA bytes indicates a proprietary command format*/
    isProprietary(): boolean {
        if (this._byteArray[0] & 0x80) return true;
        return false;
    }

    /** Type4 can use 4 logical channels (0-3) while type16 can use 16 logical channels (4-19)*/
    setType(type: 4 | 16): this {
        switch (type) {
            case 4:
                this._byteArray[0] &= 0x9f;
                break;
            case 16:
                this._byteArray[0] |= 0x40;
                break;
            default:
                throw new Error(
                    `Type must be either 4 or 16. Received: ${type}`,
                );
        }
        return this;
    }

    getType(): 4 | 16 {
        if ((this._byteArray[0] & 0x60) === 0) {
            // 0XX0 0000
            return 4;
        } else if ((this._byteArray[0] & 0x40) > 0) {
            // 0X00 0000
            return 16;
        } else {
            throw new Error('Unknown type');
        }
    }

    /** marks command as the last (or only) command of a chain */
    last(): this {
        this._byteArray[0] &= 0xef;
        return this;
    }

    /** marks command as NOT the last command of a chain */
    notLast(): this {
        this._byteArray[0] |= 0x10;
        return this;
    }

    isLast(): boolean {
        if ((this._byteArray[0] & 0x10) === 0) {
            return true;
        }
        return false;
    }

    /** selects logical channel to use
     * `Type4` supports channels 0-3
     * `Type16` supports channels 4-19
     */
    setLogicalChannel(channel: number): this {
        if (this.getType() === 4) {
            if (channel < 0 || channel > 3) {
                throw new Error(
                    `Type4 supports channels 0-3. Received: ${channel}`,
                );
            }
            this._byteArray[0] &= 0xfc;
            this._byteArray[0] |= channel;
            return this;
        } else {
            if (channel < 4 || channel > 19) {
                throw new Error(
                    `Type16 supports channels 4-19. Received: ${channel}`,
                );
            }
            this._byteArray[0] &= 0xf0;
            this._byteArray[0] |= channel - 4;
            return this;
        }
        return this;
    }

    /** Returns command logical channel.
     * 0-3 for `Type4`, 4-19 for `Type16` commands */
    getLogicalChannel(): number {
        const type = this.getType();
        switch (type) {
            case 4:
                return this._byteArray[0] & 0x03;
            case 16:
                return (this._byteArray[0] & 0x0f) + 4;
            default:
                throw new Error(`Unknown command type: ${type}.`);
        }
    }

    /**
     * Sets secure messaging bits in CLA byte
     * `0` - no secure messaging; `Type4` and `Type16` APDUs
     * `1` - proprietary secure messaging (e.g. GP); `Type4` and `Type16` APDUs
     * `2` - Iso7816 secure messages; no header auth; only `Type4` APDUs
     * `3` - Iso7816 secure messages; with header auth; only `Type4` APDUs
     */
    setSecMgsType(type: 0 | 1 | 2 | 3): this {
        const cmdType = this.getType();
        if (type < 0 || type > 3)
            throw new Error(`Unsupported secure message type: ${type}`);
        if (cmdType === 4) {
            this.setCla(this.getCla() & 0xf3); // zero both bits
            this.setCla(this.getCla() | (type << 2));
        } else {
            if (type > 1)
                throw new Error(
                    'Type16 APDUs support only 0 or 1 for secure message type',
                );
            this.setCla(this.getCla() | (type << 5));
        }
        return this;
    }

    /**
     * Gets secure messaging type from CLA byte
     * 
     * `0` - no secure messaging; `Type4` and `Type16` APDUs;
     * 
     * `1` - proprietary secure messaging (e.g. GP); `Type4` and `Type16` APDUs;
     * 
     * `2` - Iso7816 secure messages; no header auth; only `Type4` APDUs;
     * 
     * `3` - Iso7816 secure messages; with header auth; only `Type4` APDUs;
     */
    getSecMgsType(): number {
        const cmdType = this.getType();
        let result = 0;
        if (cmdType === 4) {
            result = (this.getCla() >> 2) & 0x03;
        } else {
            result = (this.getCla() >> 5) & 0x01;
        }
        return result;
    }
}

export default CommandApdu;
