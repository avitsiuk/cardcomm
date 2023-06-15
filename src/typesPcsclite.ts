import { EventEmitter } from "events";

export type ConnectOptions = {
	share_mode?: number;
	protocol?: number;
};

export type Status = {
	atr?: Buffer;
	state: number;
};

export type AnyOrNothing = any | undefined | null;

export interface CardReader extends EventEmitter {
    // Share Mode
    SCARD_SHARE_EXCLUSIVE: number; //1;
    SCARD_SHARE_SHARED: number; //2;
    SCARD_SHARE_DIRECT: number; //3;

    // Protocol
    SCARD_PROTOCOL_T0: number; //1;
    SCARD_PROTOCOL_T1: number; //2;
    SCARD_PROTOCOL_RAW: number; //4;

    //  State
    SCARD_STATE_UNAWARE: number; //0;
    SCARD_STATE_IGNORE: number; //1;
    SCARD_STATE_CHANGED: number; //2;
    SCARD_STATE_UNKNOWN: number; //4;
    SCARD_STATE_UNAVAILABLE: number; //8;
    SCARD_STATE_EMPTY: number; //16;
    SCARD_STATE_PRESENT: number; //32;
    SCARD_STATE_ATRMATCH: number; //64;
    SCARD_STATE_EXCLUSIVE: number; //128;
    SCARD_STATE_INUSE: number; //256;
    SCARD_STATE_MUTE: number; //512;

    // Disconnect disposition
    SCARD_LEAVE_CARD: number; //0;
    SCARD_RESET_CARD: number; //1;
    SCARD_UNPOWER_CARD: number; //2;
    SCARD_EJECT_CARD: number; //3;

    name: string;
    state: number;
    connected: boolean;
    on(type: "error", listener: (this: CardReader, error: any) => void): this;
    on(type: "end", listener: (this: CardReader) => void): this;
    on(type: "status", listener: (this: CardReader, status: Status) => void): this;
    once(type: "error", listener: (this: CardReader, error: any) => void): this;
    once(type: "end", listener: (this: CardReader) => void): this;
    once(type: "status", listener: (this: CardReader, status: Status) => void): this;
    SCARD_CTL_CODE(code: number): number;
    get_status(cb: (err: AnyOrNothing, state: number, atr?: Buffer) => void): void;
    connect(callback: (err: AnyOrNothing, protocol: number) => void): void;
    connect(options: ConnectOptions, callback: (err: AnyOrNothing, protocol: number) => void): void;
    disconnect(callback: (err: AnyOrNothing) => void): void;
    disconnect(disposition: number, callback: (err: AnyOrNothing) => void): void;
    transmit(data: Buffer, res_len: number, protocol: number, cb: (err: AnyOrNothing, response: Buffer) => void): void;
    control(data: Buffer, control_code: number, res_len: number, cb: (err: AnyOrNothing, response: Buffer) => void): void;
    close(): void;
}

export interface PCSCLite extends EventEmitter {
	on(type: "error", listener: (error: any) => void): this;
	once(type: "error", listener: (error: any) => void): this;
	on(type: "reader", listener: (reader: CardReader) => void): this;
	once(type: "reader", listener: (reader: CardReader) => void): this;
	close(): void;
}
