import { EventEmitter } from 'events';
import { CardReader, PCSCLite } from './typesPcsclite';
import { CommandApdu } from './commandApdu';
import { ResponseApdu } from './responseApdu';

export type TCardEventName = 'command-issued' | 'response-received';

export interface ICard {
    _eventEmitter: EventEmitter;
    device: IDevice;
    protocol: number;
    atr: string;

    getAtr: () => string;
    toString: () => string;
    issueCommand(
        commandApdu: Buffer | number[] | string | CommandApdu,
        callback?: (err: any, response: Buffer) => void,
    ): void | Promise<Buffer>;
    on(eventName: 'command-issued', eventHandler: (event: {card: ICard, command: CommandApdu}) => void): ICard;
    on(eventName: 'response-received', eventHandler: (event: { card: ICard, command: CommandApdu, response: ResponseApdu }) => void): ICard;
    once(eventName: 'command-issued', eventHandler: (event: {card: ICard, command: CommandApdu}) => void): ICard;
    once(eventName: 'response-received', eventHandler: (event: { card: ICard, command: CommandApdu, response: ResponseApdu }) => void): ICard;
}

export type TDeviceEventName = 'error' | 'card-inserted' | 'card-removed';

export interface IDevice {
    _eventEmitter: EventEmitter;
    reader: CardReader;
    name: string;
    card: ICard | null;

    transmit: (data: Buffer, res_len: number, protocol: number, cb: (err: any, response: Buffer) => void) => void;
    getName: () => string;
    toString: () => string;
    on(eventName: 'error', eventHandler: (error: any) => void): IDevice;
    on(eventName: 'card-inserted', eventHandler: (event: {device: IDevice, card: ICard}) => void): IDevice;
    on(eventName: 'card-removed', eventHandler: (event: {name: string, card: ICard}) => void): IDevice;
    once(eventName: 'error', eventHandler: (error: any) => void): IDevice;
    once(eventName: 'card-inserted', eventHandler: (event: {device: IDevice, card: ICard}) => void): IDevice;
    once(eventName: 'card-removed', eventHandler: (event: {name: string, card: ICard}) => void): IDevice;
}

export type TDevicesEventName = 'device-activated' | 'device-deactivated';

export interface IDevices {
    _eventEmitter: EventEmitter;
    pcsc: PCSCLite;
    devices: {[key: string]: IDevice};

    onActivated: () => Promise<{ device: IDevice, devices: IDevices }>;
    onDeactivated: () => Promise<{ device: IDevice, devices: IDevices }>;
    listDevices: () => IDevice[];
    lookup: (name: string) => IDevice | null;
    toString: () => string;

    on(eventName: 'device-activated', eventHandler: (event: { device: IDevice, devices: IDevices }) => void): IDevices;
    on(eventName: 'device-deactivated', eventHandler: (event: { device: IDevice, devices: IDevices }) => void): IDevices;
    once(eventName: 'device-activated', eventHandler: (event: { device: IDevice, devices: IDevices }) => void): IDevices;
    once(eventName: 'device-deactivated', eventHandler: (event: { device: IDevice, devices: IDevices }) => void): IDevices;
}

export type TIso7816AppEventName = 'application-selected';

export interface IIso7816Application {
    _eventEmitter: EventEmitter;
    card: ICard

    issueCommand: (commandApdu: CommandApdu) => Promise<ResponseApdu>;
    selectFile: (bytes: number[], p1: number, p2: number) => Promise<ResponseApdu>;
    getResponse: (length: number) => Promise<ResponseApdu>;
    readRecord: (sfi: number, record: number) => Promise<ResponseApdu>;
    getData: (p1: number, p2: number) => Promise<ResponseApdu>;

    on(eventName: 'application-selected', eventHandler: (event: { application: string }) => void): IIso7816Application;
    once(eventName: 'application-selected', eventHandler: (event: { application: string }) => void): IIso7816Application;
}
