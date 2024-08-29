const hexRegex = /^[0-9A-Fa-f]*$/g;

function trimHexPrefix(inStr: string): string {
    if (inStr.length > 1 && (inStr.substring(0, 2).toLowerCase() === '0x')) {
        return inStr.substring(2);
    }
    return inStr;
}

export function isHex(str: string): boolean {
    if (!trimHexPrefix(str).match(hexRegex)) {
        return false;
    }
    return true;
}

export function bufferToArray(buffer: Buffer): number[] {
    if (buffer.byteLength > 0) {
        const array = new Array<number>(buffer.byteLength);
        for (let i = 0; i < buffer.byteLength; i++) {
            array[i] = buffer.readUInt8(i);
        }
        return array;
    }
    return [];
}

/**
 * @param wrapOverflow - if `false`(default), 256 gets encoded as `0100`; otherwise '00'
 */
export function arrayToHex(
    array: number[],
    wrapOverflow: boolean = false,
): string {
    if (array && array.length > 0) {
        let str = '';
        for (let i = 0; i < array.length; i = i + 1) {
            let iHex = array[i].toString(16);
            iHex = `${iHex.length % 2 ? '0' : ''}${iHex}`;
            str += wrapOverflow ? iHex.substring(iHex.length - 2) : iHex;
        }
        return str;
    }
    return '';
}

export function hexToArray(hex: string): number[] {
    if (hex.length < 1) {
        return [];
    }
    if (!isHex(hex)) {
        throw new Error('Not a hex string');
    }
    let _hex = trimHexPrefix(hex);
    _hex = `${_hex.length % 2 ? '0' : ''}${_hex}`;
    const arrayLen = _hex.length / 2;
    const array = new Array<number>(arrayLen);
    for (let i = 0; i < arrayLen; i = i + 1) {
        array[i] = parseInt(_hex.substring(i * 2, i * 2 + 2), 16);
    }
    return array;
}

export function binToNumArray(data: string | Buffer | ArrayBuffer | ArrayBufferView | number[]): number[] {
    let result: number[] = [];

    if (typeof data === 'string') {
        result = hexToArray(data);
    } else if (Buffer.isBuffer(data)) {
        result = [...data];
    } else if (data instanceof ArrayBuffer) {
        result = [...new Uint8Array(data)];
    } else if (ArrayBuffer.isView(data)) {
        result = [...new Uint8Array(data.buffer)];
    } else if (Array.isArray(data)) {
        result = data;
    } else {
        throw new TypeError('Accepted binary data types: hex string, Buffer, ArrayBuffer, ArrayBufferView, number[]');
    }
    return result;
}

export class Timer {

    private static r: boolean = false;
    private static s: number = 0;

    private r: boolean = false;
    private s: number = 0;

    /** Returns current Unix timestamp in milliseconds */
    static get now(): number {
        return new Date().getTime();
    }

    static get isRunning(): boolean {
        return Timer.r;
    }

    get isRunning(): boolean {
        return this.r;
    }

    private static set isRunning(val: boolean) {
        Timer.r = val;
    }

    private set isRunning(val: boolean) {
        this.r = val;
    }

    /** Returns time at which global timer was started (0 if global timer is not running) */
    static get startTime(): number {
        return Timer.isRunning ? Timer.s : 0;
    }

    /** Returns time at which timer was started (0 if timer is not running) */
    get startTime(): number {
        return this.isRunning ? this.s : 0;
    }

    private static set startTime(val: number) {
        Timer.s = val;
    }

    private set startTime(val: number) {
        this.s = val;
    }

    /** Starts global timer and returns start time. Does nothing if already running (see `restart()`) */
    static start(): number {
        if (Timer.isRunning)
            return Timer.startTime;
        Timer.isRunning = true;
        Timer.startTime = Timer.now;
        return Timer.startTime;
    }

    /** Starts timer and returns start time. Does nothing if already running (see `restart()`) */
    start(): number {
        if (this.isRunning)
            return this.startTime;
        this.isRunning = true;
        this.startTime = Timer.now;
        return this.startTime;
    }

    /** (Re)Starts global timer and returns start time */
    static restart(): number {
        Timer.isRunning = true;
        Timer.startTime = Timer.now;
        return Timer.startTime;
    }

    /** (Re)Starts timer and returns start time */
    restart(): number {
        this.isRunning = true;
        this.startTime = Timer.now;
        return this.startTime;
    }

    /** Stops global timer and returns elapsed time since start (0 if global timer was not started) */
    static stop(): number {
        const result = Timer.startTime;
        Timer.startTime = 0;
        Timer.isRunning = false;
        return result;
    }

    /** Stops timer and returns elapsed time since start (0 if timer was not started) */
    stop(): number {
        const result = this.startTime;
        this.startTime = 0;
        this.isRunning = false;
        return result;
    }

    /** Returns elapsed time since global timer was started (0 if global timer is not running) */
    static get elapsed(): number {
        return Timer.isRunning ? Timer.now - Timer.startTime : 0;
    }

    /** Returns elapsed time since timer was started (0 if timer is not running) */
    get elapsed(): number {
        return this.isRunning ? Timer.now - this.startTime : 0;
    }
}
