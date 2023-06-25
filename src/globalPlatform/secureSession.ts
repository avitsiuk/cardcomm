import crypto from 'crypto';
import { arrayToHex, hexToArray } from '../utils';
import ResponseApdu, {assertOk} from '../responseApdu';
import CommandApdu from '../commandApdu';
import * as Iso7816Commands from '../iso7816/commands';
import * as GPCommands from './commands';
import Card from '../card';

interface ISessionKeys {
    enc: number[],
    mac: number[],
    dek: number[],
}

const defKey = [0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F];
const defStaticKeys: ISessionKeys = {
    enc: defKey,
    mac: defKey,
    dek: defKey,
}

function tDesCbcEnc(data: Buffer, key: Buffer, iv: Buffer): Buffer {
    const cipher = crypto
        .createCipheriv('des-ede3-cbc', key, iv)
        .setAutoPadding(true);
    return Buffer.concat([cipher.update(data), cipher.final()]);
}

function tDesCbcDec(data: Buffer, key: Buffer, iv: Buffer): Buffer {
    const decipher = crypto
        .createDecipheriv('des-ede3-cbc', key, iv)
        .setAutoPadding(true);
    return Buffer.concat([decipher.update(data), decipher.final()]);
}

function genSessionKey(
    type: 'enc' | 'mac' | 'dek',
    sequenceNumber: number[],
    staticSessionKey: number[] = defStaticKeys[type],
): number[] {
    if(sequenceNumber.length !== 2) {
        throw new Error('Wrong sequence number length');
    }
    if(staticSessionKey.length !== 16) {
        throw new Error('Wrong static key length');
    }
    const derivationData = Buffer.alloc(16, 0);
    switch (type) { // const values defined by GP
        case 'enc':
            derivationData.set([0x01, 0x82]);
            break;
        case 'mac':
            derivationData.set([0x01, 0x01]);
            break;
        case 'dek':
            derivationData.set([0x01, 0x81]);
            break;
        default:
            throw new Error(`Unknown key type: '${type}'`);
    }
    // sequence counter, card challenge first 2 bytes
    // remaining bytes are set to 0
    derivationData.set(sequenceNumber, 2);
    // 3 keys, 8 bytes each
    const tDesKey = Buffer.alloc(24 , 0);
    // staticSessionKey = K1K2
    tDesKey.set(staticSessionKey);
    // K3=K1, actual bytes are K1K2K1
    tDesKey.set(staticSessionKey.slice(0, 8), 16);

    // 2key-3DES
    const iv = Buffer.alloc(8, 0);
    return [...tDesCbcEnc(derivationData, tDesKey, iv).subarray(0, 16)];
}

function genSessionKeys(
    sequenceNumber: number[],
    staticKeys: ISessionKeys = defStaticKeys,
): ISessionKeys {
    return {
        enc: genSessionKey('enc', sequenceNumber, staticKeys.enc),
        mac: genSessionKey('mac', sequenceNumber, staticKeys.mac),
        dek: genSessionKey('dek', sequenceNumber, staticKeys.dek),
    }
}

function genCardCryptogram(
    cardChallenge: number[],
    hostChallenge: number[],
    enc: number[],
) {
    if(cardChallenge.length !== 8) {
        throw new Error('Wrong card challenge length');
    }
    if(hostChallenge.length !== 8) {
        throw new Error('Wrong host challenge length');
    }
    if(cardChallenge.length !== 8) {
        throw new Error('Wrong ENC key length');
    }
    // host + card + 80000...
    const data = Buffer.alloc(24, 0);
    data.set(hostChallenge);
    data.set(cardChallenge, 8);
    data.set([0x80], 16);
    const tDesKey = Buffer.alloc(24 , 0);
    tDesKey.set(enc);
    tDesKey.set(enc.slice(0, 8), 16);
    const iv = Buffer.alloc(8, 0);
    return [...tDesCbcEnc(data, tDesKey, iv).subarray(16, 24)];
}

function genHostCryptogram(
    cardChallenge: number[],
    hostChallenge: number[],
    enc: number[],
) {
    if(cardChallenge.length !== 8) {
        throw new Error('Wrong card challenge length');
    }
    if(hostChallenge.length !== 8) {
        throw new Error('Wrong host challenge length');
    }
    if(cardChallenge.length !== 8) {
        throw new Error('Wrong ENC key length');
    }
    // card + host + 80000...
    const data = Buffer.alloc(24, 0);
    data.set(cardChallenge);
    data.set(hostChallenge, 8);
    data.set([0x80], 16);
    const tDesKey = Buffer.alloc(24 , 0)
    tDesKey.set(enc);
    tDesKey.set(enc.slice(0, 8), 16);
    const iv = Buffer.alloc(8, 0);
    return [...tDesCbcEnc(data, tDesKey, iv).subarray(16, 24)];
}

function authenticateCmd(
    cmd: CommandApdu,
    macKey: number[],
) {
    if(macKey.length !== 16) {
        throw new Error('Wrong MAC key length');
    }
    const macLength = 8;
    const k1 = Buffer.from(macKey.slice(0, 8));
    const k2 = Buffer.from(macKey.slice(8));

    const dataWithMac = Buffer.alloc(cmd.getData().length + macLength, 0);
    dataWithMac.set(cmd.getData());
    const tempCmd = new CommandApdu(cmd).setData([...dataWithMac]);
    let dataToAuthenticate = Buffer.from(tempCmd.toArray());
    // remove Le and '00' mac bytes
    dataToAuthenticate = dataToAuthenticate.subarray(0, dataToAuthenticate.length - 9);

    const paddingLength = (((dataToAuthenticate.length + 1) % 8) > 0)
        ? (8 - ((dataToAuthenticate.length + 1) % 8)) : 0;

    const paddedData = Buffer.alloc(dataToAuthenticate.length + 1 + paddingLength, 0);
    paddedData.set(dataToAuthenticate);
    paddedData.set([0x80], dataToAuthenticate.length);
    const step1 = crypto.createCipheriv('des-cbc', k1, Buffer.alloc(8, 0));
    const step1res = Buffer.concat([step1.update(paddedData), step1.final()]).subarray(0, 16);
    const step2 = crypto
        .createDecipheriv('des-ecb', k2, Buffer.alloc(0))
        .setAutoPadding(true);
    const step2res = Buffer.concat([step2.update(step1res), step2.update(step1res)]).subarray(0, 16);
    const step3 = crypto
        .createCipheriv('des-ecb', k1, Buffer.alloc(0))
        .setAutoPadding(true);
    const dataMac = Buffer.concat([step3.update(step2res), step3.update(step2res)]).subarray(8, 16);
    dataWithMac.set(dataMac, cmd.getData().length);
    return new CommandApdu(cmd).setData([...dataWithMac]);
}

export default class SecureSession {
    private _card: Card;
    private _staticKeys: ISessionKeys = defStaticKeys;
    private _sessionKeys: ISessionKeys = defStaticKeys;

    private _hostChallenge: number[] = [];
    private _cardChallenge: number[] = [];

    private _keyDiversificationData: number[] = [];
    private _keyVersion: number = 0;
    private _protocolVersion: number = 0;
    private _sequenceCounter: number[] = []; // first 2 bytes of card challenge

    private _receivedCardCryptogram: number[] = [];
    private _calculatedCardCryptogram: number[] = [];
    private _hostCryptogram: number[] = [];


    constructor(card: Card) {
        this._card = card;
    }

    setStaticKeys(keys: ISessionKeys): this {
        this._staticKeys = keys;
        return this;
    }

    get staticKeys(): ISessionKeys {
        return this._staticKeys;
    }

    setSessionKeys(keys: ISessionKeys): this {
        this._sessionKeys = keys;
        return this;
    }

    get sessionKeys(): ISessionKeys {
        return this._sessionKeys;
    }

    init(secLvl: 0 | 1 | 3 = 0, keyVer: number = 0, keyId: number = 0): Promise<ResponseApdu> {
        return new Promise((resolve, reject) => {
            // selecting ISD applet first
            this._card.issueCommand(Iso7816Commands.select())
                .then((response) => {
                    assertOk(response);
                    // generating random host chalenge
                    this._hostChallenge = [...crypto.randomBytes(8)];
                    // sending INITIALIZE_UPDATE command with host challenge
                    this._card.issueCommand(GPCommands.initUpdate(this._hostChallenge, keyVer, keyId))
                        .then((response) => {
                            assertOk(response);
                            if (response.dataLength !== 28) {
                                throw new Error(`Secure session init error; response length error; resp: [${response.toString()}]`)
                            }

                            this._keyDiversificationData = response.data.slice(0, 10);
                            this._keyVersion = response.data[10];
                            this._protocolVersion = response.data[11];
                            this._sequenceCounter = response.data.slice(12, 14);
                            this._cardChallenge = response.data.slice(12, 20);
                            this._receivedCardCryptogram = response.data.slice(20);

                            this._sessionKeys = genSessionKeys(this._sequenceCounter, this._staticKeys);
                            this._calculatedCardCryptogram = genCardCryptogram(
                                this._cardChallenge,
                                this._hostChallenge,
                                this._sessionKeys.enc,
                            );
                            if (arrayToHex(this._receivedCardCryptogram) !== arrayToHex(this._calculatedCardCryptogram)) {
                                throw new Error('Card cryptogram does not match');
                            }
                            this._hostCryptogram = genHostCryptogram(
                                this._cardChallenge,
                                this._hostChallenge,
                                this._sessionKeys.enc,
                            );
                            let extAuthCmd = GPCommands.extAuth(this._hostCryptogram, secLvl);
                            // authenticating EXT_AUTH command using session key before senting
                            extAuthCmd = authenticateCmd(extAuthCmd, this._sessionKeys.mac);
                            this._card.issueCommand(extAuthCmd)
                                .then((response) => {
                                    assertOk(response);
                                    resolve(response);
                                })
                                .catch((err) => {
                                    reject(err);
                                });
                        })
                        .catch((err) => {
                            reject(err);
                        });
                })
                .catch((err) => {
                    reject(err);
                })
        });
    }
}