import { EventEmitter } from 'events';
import { CardReader, PCSCLite } from './typesPcsclite';
import CommandApdu from './commandApdu';
import ResponseApdu from './responseApdu';

export type TCardEventName = 'command-issued' | 'response-received';

export interface ICard {
    atr: Buffer;

    toString: () => string;

    issueCommand(
        commandApdu: Buffer | number[] | string | CommandApdu,
        callback: (err: any, response: ResponseApdu) => void,
    ): Promise<ResponseApdu>;
    issueCommand(
        commandApdu: Buffer | number[] | string | CommandApdu,
        callback: (err: any, response: ResponseApdu) => void,
    ): void;
    issueCommand(
        commandApdu: Buffer | number[] | string | CommandApdu,
        callback?: (err: any, response: ResponseApdu) => void,
    ): void | Promise<ResponseApdu>;

    on(
        eventName: 'command-issued',
        eventHandler: (event: { card: ICard; command: CommandApdu }) => void,
    ): ICard;
    on(
        eventName: 'response-received',
        eventHandler: (event: {
            card: ICard;
            command: CommandApdu;
            response: ResponseApdu;
        }) => void,
    ): ICard;
    once(
        eventName: 'command-issued',
        eventHandler: (event: { card: ICard; command: CommandApdu }) => void,
    ): ICard;
    once(
        eventName: 'response-received',
        eventHandler: (event: {
            card: ICard;
            command: CommandApdu;
            response: ResponseApdu;
        }) => void,
    ): ICard;
}

export type TDeviceEventName = 'error' | 'card-inserted' | 'card-removed';

export interface IDevice {
    _eventEmitter: EventEmitter;
    reader: CardReader;
    name: string;
    card: ICard | null;

    transmit: (
        data: Buffer,
        res_len: number,
        protocol: number,
        cb: (err: any, response: Buffer) => void,
    ) => void;
    getName: () => string;
    toString: () => string;
    on(eventName: 'error', eventHandler: (error: any) => void): IDevice;
    on(
        eventName: 'card-inserted',
        eventHandler: (event: { device: IDevice; card: ICard }) => void,
    ): IDevice;
    on(
        eventName: 'card-removed',
        eventHandler: (event: { name: string; card: ICard }) => void,
    ): IDevice;
    once(eventName: 'error', eventHandler: (error: any) => void): IDevice;
    once(
        eventName: 'card-inserted',
        eventHandler: (event: { device: IDevice; card: ICard }) => void,
    ): IDevice;
    once(
        eventName: 'card-removed',
        eventHandler: (event: { name: string; card: ICard }) => void,
    ): IDevice;
}

export type TDevicesManagerEventName = 'device-activated' | 'device-deactivated';

export interface IDevicesManager {
    _eventEmitter: EventEmitter;
    pcsc: PCSCLite;
    devices: { [key: string]: IDevice };

    onActivated: () => Promise<{ device: IDevice; devManager: IDevicesManager }>;
    onDeactivated: () => Promise<{ device: IDevice; devManager: IDevicesManager }>;
    listDevices: () => IDevice[];
    lookup: (name: string) => IDevice | null;
    toString: () => string;

    on(
        eventName: 'device-activated',
        eventHandler: (event: { device: IDevice; devManager: IDevicesManager }) => void,
    ): IDevicesManager;
    on(
        eventName: 'device-deactivated',
        eventHandler: (event: { device: IDevice; devManager: IDevicesManager }) => void,
    ): IDevicesManager;
    once(
        eventName: 'device-activated',
        eventHandler: (event: { device: IDevice; devManager: IDevicesManager }) => void,
    ): IDevicesManager;
    once(
        eventName: 'device-deactivated',
        eventHandler: (event: { device: IDevice; devManager: IDevicesManager }) => void,
    ): IDevicesManager;
}
