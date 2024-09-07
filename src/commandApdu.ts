import {
    TBinData,
    importBinData,
    hexEncode,
} from './utils';
/*

CASE   CMD-DATA(LC)   RSP-DATA(LE)
 1         N             N         81828384
 2         N             Y         81828384 ff
 3         Y             N         81828384 03 717273
 4         Y             Y         81828384 03 717273 ff

81828384 00 ff

if (bytes.len == 4) {
    case 1
} else if (bytes.len == 5) {
    case 2
} else {
    const lc = bytes[4]
    if (bytes.len == (4 + 1 + lc)) {
        case 3
    } else if (bytes.len == (4 + 1 + lc + 1)) {
        case 4
    } else {
        error
    }
}
*/

export class CommandApdu {
    static readonly CLA_OFFSET  = 0;
    static readonly INS_OFFSET  = 1;
    static readonly P1_OFFSET   = 2;
    static readonly P2_OFFSET   = 3;
    static readonly LC_OFFSET   = 4;
    static readonly DATA_OFFSET = 5;
    static readonly MAX_DATA_BYTE_LENGTH = 255;

    // header(4) + lc(1) + data + le(1)
    private byteArray: Uint8Array = new Uint8Array(CommandApdu.MAX_DATA_BYTE_LENGTH + 6); // header(4) + Lc(1) + data + Le(1)
    private bLength = 5;

    static from(data?: TBinData | CommandApdu): CommandApdu {
        return new CommandApdu(data);
    }

    constructor(data?: TBinData | CommandApdu) {
        this.clear();
        if (typeof data === 'undefined')
            return this;
        return this.from(data);
    }

    /** Any input data is copied into internal ArrayBuffer meaning the original data can be modified without changing this CommandAPDU */
    from(inData: TBinData | CommandApdu): CommandApdu {
        let inBuffer: Uint8Array = new Uint8Array(0);
        if (inData instanceof CommandApdu) {
            inBuffer = inData.toByteArray();
        } else {
            try {
                inBuffer = importBinData(inData)
            } catch (error: any) {
                throw new Error(`Could not create CommandAPDU from provided data: ${error.message}`);
            }
        }
        if (inBuffer.byteLength < 4)
            throw new Error(`Expected at least 4 bytes of input data, received: ${inBuffer.byteLength} bytes`);
        if (inBuffer.byteLength > (CommandApdu.MAX_DATA_BYTE_LENGTH + 6))
            throw new Error(`Expected at most ${CommandApdu.MAX_DATA_BYTE_LENGTH + 6} bytes of input data, received: ${inBuffer.byteLength} bytes`);
        if (inBuffer.byteLength <= 5) {
            this.bLength = 5;
        } else {
            const lc = inBuffer[CommandApdu.LC_OFFSET];
            const noLeLength = 5 + lc; // 4(head) + 1(lc) + lc(data)
            if (noLeLength === 5)
                throw new Error(`Lc value cannot be 0; received data: [${Buffer.from(inBuffer).toString('hex')}]`);
            if (inBuffer.byteLength === noLeLength) {
                this.bLength = inBuffer.byteLength + 1;
            } else if (inBuffer.byteLength === noLeLength + 1) {
                this.bLength = inBuffer.byteLength;
            } else {
                throw new Error(`Based on input Lc value(${lc}), input data was expected to be ${noLeLength}(no Le value) or ${noLeLength + 1}(with Le value) bytes long. Received ${inBuffer.byteLength} bytes: [${Buffer.from(inBuffer).toString('hex')}]`);
            }
        }
        this.byteArray.set(inBuffer, 0);
        return this;
    }

    /** Returned byte array will reference same memory as this CommandAPDU, meaning that any change made to it will reflect on this CommandAPDU */
    toByteArray(): Uint8Array {
        return this.byteArray.subarray(0, this.bLength);
    }

    /** Returns hex string */
    toString(): string {
        return hexEncode(this.toByteArray());
    }

    // Clears this CommandAPDU by setting it's content to "0x0000000000"
    clear(): this {
        this.byteArray.set([0,0,0,0,0]);
        this.bLength = 5;
        return this;
    }

    get byteLength(): number {
        return this.bLength;
    }

    setCla(cla: number): this {
        this.byteArray.set([cla], CommandApdu.CLA_OFFSET);
        return this;
    }

    set cla(cla: number) {
        this.setCla(cla);
    }

    getCla(): number {
        return this.byteArray[CommandApdu.CLA_OFFSET];
    }

    get cla(): number {
        return this.getCla();
    }

    setIns(ins: number): this {
        this.byteArray.set([ins], CommandApdu.INS_OFFSET);
        return this;
    }

    set ins(ins: number) {
        this.setIns(ins);
    }

    getIns(): number {
        return this.byteArray[CommandApdu.INS_OFFSET];
    }

    get ins(): number {
        return this.getIns();
    }

    setP1(p1: number): this {
        this.byteArray.set([p1], CommandApdu.P1_OFFSET);
        return this;
    }

    set p1(p1: number) {
        this.setP1(p1);
    }

    getP1(): number {
        return this.byteArray[CommandApdu.P1_OFFSET];
    }

    get p1(): number {
        return this.getP1();
    }

    setP2(p2: number): this {
        this.byteArray.set([p2], CommandApdu.P2_OFFSET);
        return this;
    }

    set p2(p2: number) {
        this.setP2(p2);
    }

    getP2(): number {
        return this.byteArray[CommandApdu.P2_OFFSET];
    }

    get p2(): number {
        return this.getP2();
    }

    // no Lc setters as it gets set automatically when command data is set

    getLc(): number {
        let lc = 0;
        if (this.bLength > 5)
            lc = this.byteArray[CommandApdu.LC_OFFSET];
        return lc;
    }

    get lc(): number {
        return this.getLc();
    }

    setData(data: TBinData): this {
        const le = this.le;
        let importedBytes: Uint8Array;
        // let inBuffer: Uint8Array = new Uint8Array(0);
        try {
            importedBytes = importBinData(data, this.byteArray.subarray(CommandApdu.DATA_OFFSET, CommandApdu.DATA_OFFSET + CommandApdu.MAX_DATA_BYTE_LENGTH));
        } catch (error: any) {
            throw new Error(`Could not set CommandAPDU data field: ${error.message}`);
        }

        if (importedBytes.byteLength < 1) {
            this.byteArray[CommandApdu.LC_OFFSET] = le;
            this.bLength = CommandApdu.LC_OFFSET + 1;
        } else {
            this.byteArray[CommandApdu.LC_OFFSET] = importedBytes.byteLength;
            this.byteArray[CommandApdu.DATA_OFFSET + importedBytes.byteLength] = le;
            this.bLength = CommandApdu.DATA_OFFSET + importedBytes.byteLength + 1; //(header + lc)(5) + data + le
        }

        return this;
    }

    set data(data: TBinData) {
        this.setData(data);
    }

    /** Returned Buffer will reference same memory as this CommandAPDU, meaning that any change made to it will reflect on this CommandAPDU */
    getData(): Uint8Array {
        if (this.bLength <= 5)
            return this.byteArray.subarray(CommandApdu.DATA_OFFSET, CommandApdu.DATA_OFFSET);

        return this.byteArray.subarray(CommandApdu.DATA_OFFSET, CommandApdu.DATA_OFFSET + this.byteArray[CommandApdu.LC_OFFSET]);
    }

    /** Returned Buffer will reference same memory as this CommandAPDU, meaning that any change made to it will reflect on this CommandAPDU */
    get data(): Uint8Array {
        return this.getData();
    }

    /** If no value is provided, Le is set to 0 */
    setLe(le: number = 0): this {
        this.byteArray[this.bLength - 1] = le;
        return this;
    }

    set le(le: number) {
        this.setLe(le);
    }

    getLe(): number {
        return this.byteArray[this.bLength - 1];
    }

    get le(): number {
        return this.getLe();
    }

    // =========================================================================

    // class byte

    /** Sets m.s.b. of CLA byte to 1, marking command as having proprietary format */
    setProprietary(): this {
        this.byteArray[CommandApdu.CLA_OFFSET] |= 0x80;
        return this;
    }

    /** Sets m.s.b. of CLA byte to 0, marking command as having interindustry format
     * All newly created commands are set as interindustry by default
     */
    setInterindustry(): this {
        this.byteArray[CommandApdu.CLA_OFFSET] &= 0x7f;
        return this;
    }

    /** Returns true if CLA bytes indicates a proprietary command format*/
    get isProprietary(): boolean {
        if (this.byteArray[CommandApdu.CLA_OFFSET] & 0x80) return true;
        return false;
    }

    /** Type4 can use 4 logical channels (0-3) while type16 can use 16 logical channels (4-19)*/
    setType(type: 4 | 16): this {
        switch (type) {
            case 4:
                this.byteArray[CommandApdu.CLA_OFFSET] &= 0x9f;
                break;
            case 16:
                this.byteArray[CommandApdu.CLA_OFFSET] |= 0x40;
                break;
            default:
                throw new Error(
                    `Type must be either 4 or 16. Received: ${type}`,
                );
        }
        return this;
    }

    /** Type4 can use 4 logical channels (0-3) while type16 can use 16 logical channels (4-19)*/
    get type(): 4 | 16 {
        if ((this.byteArray[CommandApdu.CLA_OFFSET] & 0x60) === 0) { // & 0110 0000
            // 0XX0 0000
            return 4;
        } else if ((this.byteArray[CommandApdu.CLA_OFFSET] & 0x40) > 0) { // & 0100 0000
            // 0X00 0000
            return 16;
        } else {
            throw new Error('Unknown type');
        }
    }

    /** Marks command as the last (or only) command of a chain. This is the default state for every new CommandAPDU */
    setLastOfChain(): this {
        this.byteArray[CommandApdu.CLA_OFFSET] &= 0xef;
        return this;
    }

    /** Marks command as NOT the last command of a chain */
    setNotLastOfChain(): this {
        this.byteArray[CommandApdu.CLA_OFFSET] |= 0x10;
        return this;
    }

    /** Returns true if the CommandAPDU is marked as the last (or only) command of a chain */
    get isLastOfChain(): boolean {
        if ((this.byteArray[CommandApdu.CLA_OFFSET] & 0x10) === 0) {
            return true;
        }
        return false;
    }

    /** selects logical channel to use
     * `Type4` supports channels 0-3
     * `Type16` supports channels 4-19
     */
    setLogicalChannel(channel: number): this {
        if (this.type === 4) {
            if (channel < 0 || channel > 3) {
                throw new Error(
                    `Type4 supports channels 0-3. Received: ${channel}`,
                );
            }
            this.byteArray[CommandApdu.CLA_OFFSET] &= 0xfc;
            this.byteArray[CommandApdu.CLA_OFFSET] |= channel;
            return this;
        } else {
            if (channel < 4 || channel > 19) {
                throw new Error(
                    `Type16 supports channels 4-19. Received: ${channel}`,
                );
            }
            this.byteArray[CommandApdu.CLA_OFFSET] &= 0xf0;
            this.byteArray[CommandApdu.CLA_OFFSET] |= channel - 4;
            return this;
        }
    }

    /** Returns command logical channel.
     * 0-3 for `Type4`, 4-19 for `Type16` commands */
    get logicalChannel(): number {
        const type = this.type;
        switch (type) {
            case 4:
                return this.byteArray[CommandApdu.CLA_OFFSET] & 0x03;
            case 16:
                return (this.byteArray[CommandApdu.CLA_OFFSET] & 0x0f) + 4;
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
        if (type < 0 || type > 3)
            throw new Error(`Unsupported secure message type: ${type}`);
        const cmdType = this.type;
        if (cmdType === 4) {
            this.setCla(this.getCla() & 0xf3); // zero both bits
            this.setCla(this.getCla() | (type << 2));
        } else {
            switch (type) {
                case 0:
                    this.setCla(this.getCla() & 0xdf);
                    break;
                case 1:
                    this.setCla(this.getCla() | 0x20);
                    break;
                default:
                    throw new Error('Type16 APDUs support only 0 or 1 for secure message type');
            }
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
    get secMgsType(): number {
        const cmdType = this.type;
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
