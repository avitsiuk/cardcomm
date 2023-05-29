import { toHexString, bufferToArray } from './utils';

/*
CASE    COMMAND     RESPONSE
1       NO DATA     NO DATA
2       DATA        NO DATA
3       NO DATA     DATA
4       DATA        DATA
*/

export interface ICommandApduObj {
    bytes?: number[] | Buffer;
    size?: number;
    /** command class */
    cla?: number;
    /** instruction */
    ins?: number;
    /** first parameter */
    p1?: number;
    /** second parameter */
    p2?: number;
    /** data */
    data?: number[];
    /** expected response length */
    le?: number;
};

export class CommandApdu {
    bytes: number[] = [];

    constructor(obj: ICommandApduObj) {
        if (obj.bytes) {
            if (Buffer.isBuffer(obj.bytes)) {
                this.bytes = bufferToArray(obj.bytes);
            } else {
                this.bytes = obj.bytes;
            }
        } else {
            let size = obj.size;
            let cla = obj.cla;
            let ins = obj.ins;
            let p1 = obj.p1;
            let p2 = obj.p2;
            let lc: number;
            let data = obj.data;
            let le = obj.le || 0;

            if (!size && !data && !le) { // case 1
                size = 4;
            } else if (!size && !data) { // case 2
                size = 4 + 2;
            } else if (!size && !le) { // case 3
                size = data!.length + 5 + 4;
            } else if (!size) { // case 4
                size = data!.length + 5 + 4;
            }

            this.bytes = [];
            this.bytes.push(cla!);
            this.bytes.push(ins!);
            this.bytes.push(p1!);
            this.bytes.push(p2!);

            if (data) {
                lc = data.length;
                this.bytes.push(lc);
                this.bytes = this.bytes.concat(data);
            }
            this.bytes.push(le);
        }
    }

    toString() {
        return toHexString(this.bytes);
    }

    toByteArray() {
        return this.bytes;
    }

    toBuffer() {
        return Buffer.from(this.bytes);
    }

    setLe(le: number) {
        this.bytes.pop();
        this.bytes.push(le);
    }
}

export default CommandApdu;
