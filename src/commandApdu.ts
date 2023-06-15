import { bufferToArray, hexToArray, arrayToHex } from './utils';

type TCommandType = ''

export class CommandApdu {
    private _byteArray: number[] = [0x00, 0x00, 0x00, 0x00];

    constructor() {
        // if (obj.buffer) {
        //     if (obj.buffer.length < 4) {
        //         throw new Error(`Command APDU must be at least 4 bytes long. Received: ${obj.buffer.length}`);
        //     }
        //     this.buffer = obj.buffer;
        // } else {
        //     let cla = obj.cla;
        //     let ins = obj.ins;
        //     let p1 = obj.p1;
        //     let p2 = obj.p2;
        //     let data = obj.data;
        //     let lc = 0;
        //     let le = obj.le || 0;

        //     if (!size && !data && !le) { // case 1
        //         size = 4;
        //     } else if (!size && !data) { // case 2
        //         size = 4 + 2;
        //     } else if (!size && !le) { // case 3
        //         size = data!.length + 5 + 4;
        //     } else if (!size) { // case 4
        //         size = data!.length + 5 + 4;
        //     }

        //     this.bytes = [];
        //     this.bytes.push(cla!);
        //     this.bytes.push(ins!);
        //     this.bytes.push(p1!);
        //     this.bytes.push(p2!);

        //     if (data) {
        //         lc = data.length;
        //         this.bytes.push(lc);
        //         this.bytes = this.bytes.concat(data);
        //     }
        //     this.bytes.push(le);
        // }
    }

    fromArray(array: number[]) {
        if(array.length < 4) {
            throw new Error(`Command array too short(min 4 bytes): [${array}]`);
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

    setClaByte(cla: number): this {
        this._byteArray[0] = cla;
        return this;
    }

    getClaByte(): number {
        return this._byteArray[0];
    }

    setInsByte(ins: number): this {
        this._byteArray[1] = ins;
        return this;
    }

    getInsByte(): number {
        return this._byteArray[1];
    }

    setP1Byte(p1: number): this {
        this._byteArray[2] = p1;
        return this;
    }

    getP1Byte(): number {
        return this._byteArray[2];
    }

    setP2Byte(p2: number): this {
        this._byteArray[3] = p2;
        return this;
    }

    getP2Byte(): number {
        return this._byteArray[3];
    }

    // setData(data: number[]) {
    //     const lc = data.length;
        
    //     const header = this._byteArray.slice(0, 4);
    //     const le = if(this._byteArray.length > 4)
    // }

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
        this._byteArray[0] &= 0x7F;
        return this;
    }

    /** Returns true if CLA bytes indicates a proprietary command format*/
    isProprietary():boolean {
        if (this._byteArray[0] & 0x80) return true;
        return false;
    }

    /** Type4 can use 4 logical channels (0-3) while type16 can use 16 logical channels (4-19)*/
    setType(type: 4 | 16): this {
        switch (type) {
            case 4:
                this._byteArray[0] &= 0x1F;
                break;
            case 16:
                this._byteArray[0] |= 0x40;
                break;
            default:
                throw new Error(`Type must be either 4 or 16. Received: ${type}`);
        }
        return this;
    }

    getType() {
        if ((this._byteArray[0] & 0xE0) === 0) {
            return 4;
        } else if ((this._byteArray[0] & 0xC0) === 0x40) {
            return 16;
        } else {
            throw new Error('Unknown type');
        }
    }

    /** marks command as the last (or only) command of a chain */
    last(): this {
        this._byteArray[0] &= 0xEF;
        return this;
    }

    /** marks command as NOT the last command of a chain */
    notLast(): this {
        this._byteArray[0] |= 0x10;
        return this;
    }

    /** marks command as not the last command of a chain */
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
                throw new Error(`Type4 supports channels 0-3. Received: ${channel}`);
            }
            this._byteArray[0] &= 0xFC;
            this._byteArray[0] |= channel;
            return this;
        } else {
            if (channel < 4 || channel > 19) {
                throw new Error(`Type16 supports channels 4-19. Received: ${channel}`);
            }
            this._byteArray[0] &= 0xF0;
            this._byteArray[0] |= channel - 4;
            return this;
        }
        return this;
    }

    /** Returns command logical channel. 0-3 for `Type4`, 4-19 for `Type16` commands */
    getLogicalChannel(): number {
        const type = this.getType();
        switch (type) {
            case 4:
                return this._byteArray[0] & 0x03;
            case 16:
                return (this._byteArray[0] & 0x0F) + 4;
            default:
                throw new Error(`Unknown command type: ${type}.`)
        }
    }




}

export default CommandApdu;
