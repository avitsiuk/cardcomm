import { bufferToArray, hexToArray, arrayToHex } from './utils';

// CASE   CMD-DATA(LC)   RSP-DATA(LE)
//  1     N             N
//  2     N             Y
//  3     Y             N
//  4     Y             Y

export class CommandApdu {
    static MAX_DATA_BYTES: number = 255;

    private _byteArray: number[] = [0x00, 0x00, 0x00, 0x00];

    constructor(command?: string | number[] | Buffer | CommandApdu) {
        this._byteArray = [0x00, 0x00, 0x00, 0x00];

        if (typeof command !== 'undefined') {
            if (typeof command === 'string') {
                this.fromString(command);
            } else if (Array.isArray(command)) {
                this.fromArray(command);
            } else if (Buffer.isBuffer(command)) {
                this.fromBuffer(command);
            } else {
                if (command.length > 0) this.fromArray(command.toArray());
            }
        }
    }

    get length(): number {
        return this._byteArray.length;
    }

    fromArray(array: number[]) {
        if (array.length < 4) {
            throw new Error(`Command array too short(min 5 bytes): [${array}]`);
        }
        this._byteArray = array;
        return this;
    }

    fromBuffer(buffer: Buffer): this {
        return this.fromArray(bufferToArray(buffer));
    }

    fromString(str: string): this {
        return this.fromArray(hexToArray(str));
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

    getCla(): number {
        return this._byteArray[0];
    }

    setIns(ins: number): this {
        this._byteArray[1] = ins;
        return this;
    }

    getIns(): number {
        return this._byteArray[1];
    }

    setP1(p1: number): this {
        this._byteArray[2] = p1;
        return this;
    }

    getP1(): number {
        return this._byteArray[2];
    }

    setP2(p2: number): this {
        this._byteArray[3] = p2;
        return this;
    }

    getP2(): number {
        return this._byteArray[3];
    }

    setData(data: number[]): this {
        if (data.length > CommandApdu.MAX_DATA_BYTES) {
            throw new Error(
                `Data too long; Max: ${CommandApdu.MAX_DATA_BYTES} bytes; Received: ${data.length} bytes`,
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
        const lc = data.length;
        if (lc > 0) {
            this._byteArray.push(lc);
            this._byteArray.push(...data);
        }
        this._byteArray.push(le);
        return this;
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

    getLc(): number {
        let lc = 0;
        if (this._byteArray.length > 5) lc = this._byteArray[4];
        return lc;
    }

    setLe(le: number = 0): this {
        if (this._byteArray.length > 4) {
            this._byteArray[this.length - 1] = le;
        } else {
            this._byteArray.push(le);
        }
        return this;
    }

    getLe(): number {
        let le = 0;
        if (this._byteArray.length > 4) {
            le = this._byteArray[this.length - 1];
        }
        return le;
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
     * `0` - no secure messaging; `Type4` and `Type16` APDUs
     * `1` - proprietary secure messaging (e.g. GP); `Type4` and `Type16` APDUs
     * `2` - Iso7816 secure messages; no header auth; only `Type4` APDUs
     * `3` - Iso7816 secure messages; with header auth; only `Type4` APDUs
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
