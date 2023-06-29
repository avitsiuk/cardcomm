import crypto from 'crypto';
import { arrayToHex, hexToArray } from '../utils';
import ResponseApdu, {assertOk} from '../responseApdu';
import CommandApdu from '../commandApdu';
import * as Iso7816Commands from '../iso7816/commands';
import * as GPCommands from './commands';
import Card from '../card';

type TSecLvl = 0 | 1 | 3;

interface ISessionKeys {
    enc: number[],
    mac: number[],
    dek: number[],
}

interface ISessionInfo {
    /** Get set to true after a sussessful authorization. */
    isActive: boolean,
    /** Session security level. Read the setSecurityLevel() method documentation to know more. */
    secLvl: TSecLvl,
    /** Secure channel protocol(SCP) number */
    protocol: number,
    /** Key diversification data */
    keyDivData: number[],
    /** Used key version */
    keyVersion: number,
    /**  Secure Channel Sequence Counter */
    seqCount: number[],
}

const defKey = [0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4E, 0x4F];

export const defStaticKeys: ISessionKeys = {
    enc: defKey,
    mac: defKey,
    dek: defKey,
}

function tDesCbcEnc(data: Buffer, key: Buffer, iv: Buffer): Buffer {
    const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
    return Buffer.concat([cipher.update(data), cipher.final()]);
}

function tDesCbcDec(data: Buffer, key: Buffer, iv: Buffer): Buffer {
    const decipher = crypto.createDecipheriv('des-ede3-cbc', key, iv);
    return Buffer.concat([decipher.update(data), decipher.final()]);
}

function genSessionKey(
    type: 'enc' | 'mac' | 'dek',
    sequenceCounter: number[],
    staticSessionKey: number[],
): number[] {
    if(sequenceCounter.length !== 2) {
        throw new Error('Cequence counter must be 2 bytes long');
    }
    if(staticSessionKey.length !== 16) {
        throw new Error('Static key must be 16 bytes long');
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
    derivationData.set(sequenceCounter, 2);

    const tDesKey = Buffer.alloc(24 , 0);
    tDesKey.set(staticSessionKey);
    tDesKey.set(staticSessionKey.slice(0, 8), 16);

    const iv = Buffer.alloc(8, 0);

    return [...tDesCbcEnc(derivationData, tDesKey, iv).subarray(0, 16)];
}

function genSessionKeys(
    sequenceNumber: number[],
    staticKeys: ISessionKeys,
): ISessionKeys {
    return {
        enc: genSessionKey('enc', sequenceNumber, staticKeys.enc),
        mac: genSessionKey('mac', sequenceNumber, staticKeys.mac),
        dek: genSessionKey('dek', sequenceNumber, staticKeys.dek),
    }
}

function genCryptogram(
    type: 'card' | 'host',
    cardChallenge: number[],
    hostChallenge: number[],
    encKey: number[],
) {
    if(cardChallenge.length !== 8) {
        throw new Error('Card challenge must be 8 bytes long');
    }
    if(hostChallenge.length !== 8) {
        throw new Error('Host challenge must be 8 bytes long');
    }
    if(encKey.length !== 16) {
        throw new Error('ENC key must be 16 bytes long');
    }

    const data = Buffer.alloc(24, 0);
    switch (type) {
        case 'card':
            data.set(hostChallenge);
            data.set(cardChallenge, 8);
            break;
        case 'host':
            data.set(cardChallenge);
            data.set(hostChallenge, 8);
            break;
        default:
            throw new Error(`Unknown cryptogram type: "${type}"`)
    }
    data.set([0x80], 16);

    const tDesKey = Buffer.alloc(24 , 0);
    tDesKey.set(encKey);
    tDesKey.set(encKey.slice(0, 8), 16);

    const iv = Buffer.alloc(8, 0);

    return [...tDesCbcEnc(data, tDesKey, iv).subarray(16, 24)];
}

function addMac(
    cmd: CommandApdu,
    sessionKeys: ISessionKeys,
    icv: number[] = new Array<number>(8).fill(0),
) {
    const macLength = 8;
    if(cmd.getLc() + macLength > 255 ) {
        throw new Error(`Max ${255 - macLength} bytes of data`);
    }
    if(sessionKeys.mac.length !== 16) {
        throw new Error('Wrong MAC key length');
    }
    if(icv.length !== 8) {
        throw new Error('Wrong ICV length');
    }

    const k1 = Buffer.from(sessionKeys.mac.slice(0, 8));
    const k2 = Buffer.from(sessionKeys.mac.slice(8));
    const origData = cmd.getData();

    // using temp CommandAPDU to set secure messaging
    // and logical channel bits on the original header;
    // logical channel bits must be restored on final apdu
    const newHeader = new CommandApdu(cmd)
        .setSecMgsType(1)
        .setLogicalChannel(0)
        .toArray()
        .slice(0, 4);

    // Data to sign: newHeader + Lc(origData + cMac) + origData + '0x80' + zeroes
    // add zeroes so that total length must be a multiple of 8
    // no zeroes required if it's already a multiple of 8
    let missingBytes = (newHeader.length + 1 + origData.length + 1) % 8;
    missingBytes = missingBytes > 0 ? (8 - missingBytes) : 0;
    const dataToAuthenticate = Buffer.alloc(
        //    header       Lc     origData     '0x80'  zeroes
        newHeader.length + 1 + origData.length + 1 + missingBytes,
        0,
    );
    dataToAuthenticate.set(newHeader);
    dataToAuthenticate.set([origData.length + macLength], newHeader.length);
    dataToAuthenticate.set(origData, newHeader.length + 1);
    dataToAuthenticate.set([0x80], newHeader.length + 1 + origData.length);

    // calculating new ICV
    let newIcv = Buffer.alloc(8, 0);
    newIcv.set(icv);
    if (newIcv.some( value => value !== 0 )) {
        const icvCipher = crypto.createCipheriv('des-cbc', k1, Buffer.alloc(8, 0));
        newIcv = Buffer.concat([icvCipher.update(Buffer.from(icv)), icvCipher.final()])
            .subarray(0, 8);
    }


    const step1 = crypto.createCipheriv('des-cbc', k1, Buffer.from(newIcv));
    const step1res = Buffer.concat([step1.update(dataToAuthenticate), step1.final()])
        .subarray(0, 16);
    const step2 = crypto.createDecipheriv('des-ecb', k2, Buffer.alloc(0));
    const step2res = Buffer.concat([step2.update(step1res), step2.update(step1res)])
        .subarray(0, 16);
    const step3 = crypto.createCipheriv('des-ecb', k1, Buffer.alloc(0));
    const dataMac = Buffer.concat([step3.update(step2res), step3.update(step2res)])
        .subarray(8, 16);

    //                                           '0x80'   zeroes
    const paddingIdx = dataToAuthenticate.length - 1 - missingBytes;
    const newCmd = Buffer.alloc(paddingIdx + macLength + 1, 0);
    newCmd.set(dataToAuthenticate.subarray(0, paddingIdx));
    newCmd.set(dataMac, paddingIdx);
    return new CommandApdu(newCmd).setLogicalChannel(cmd.getLogicalChannel());
}

function encryptCmd(
    cmd: CommandApdu,
    sessionKeys: ISessionKeys,
) {
    if(sessionKeys.enc.length !== 16) {
        throw new Error('Wrong ENC session key length');
    }
    const k1 = Buffer.from(sessionKeys.enc.slice(0, 8));
    const k2 = Buffer.from(sessionKeys.enc.slice(8));
    const icv = Buffer.alloc(8, 0);

    const origData = cmd.getData().slice(0, cmd.getLc() - 8);
    const origMac = cmd.getData().slice(cmd.getLc() - 8);

    let paddingNeeded = (origData.length +1) % 8;
    paddingNeeded = paddingNeeded > 0 ? (8-paddingNeeded) : 0;
    const paddedData = Buffer.alloc(origData.length + 1 + paddingNeeded, 0);
    paddedData.set(origData);
    paddedData.set([0x80], origData.length);
    const encryptedData = tDesCbcEnc(paddedData, Buffer.concat([k1, k2, k1]), icv)
    .subarray(0, paddedData.length);

    const result = new CommandApdu(cmd).setData([...Buffer.concat([encryptedData, Buffer.from(origMac)])]);
    return result;
}

function authenticateCmd(
    secLvl: TSecLvl,
    cmd: CommandApdu,
    sessionKeys: ISessionKeys,
    icv: number[] = new Array<number>(8).fill(0),
) {
    let result = new CommandApdu(cmd);
    if (secLvl >= 1) {
        result = addMac(result, sessionKeys, icv);
    }
    if (secLvl >= 3) {
        result = encryptCmd(result, sessionKeys);
    }
    return result;
}

export default class SecureSession {
    private _card: Card;
    private _isActive: boolean = false;
    private _secLvl: TSecLvl = 0;
    private _staticKeys: ISessionKeys | undefined;
    private _sessionKeys: ISessionKeys | undefined;

    private _keyDivData: number[] = [];
    private _keyVersion: number = 0;
    private _protocolVersion: number = 0;
    private _sequenceCounter: number[] = [];

    private _lastCmac: number[] = [];

    private _authenticateFunction: ((cmd: CommandApdu) => CommandApdu) | undefined;
    private _doAuthenticate = (cmd: CommandApdu) => {
        if (!this.isActive
        || this.securityLevel < 1
        || typeof this._authenticateFunction === 'undefined'
        ) {
            return cmd;
        }
        return this._authenticateFunction(cmd);
    }

    constructor(card: Card) {
        this._card = card;
    }

    get isActive(): boolean {
        return this._isActive;
    }

    /**
     * Sets the security level for this session. Must be called before initAndAuth.
     * @param secLvl - (Default:`0`) Defines the level of security for all secure messaging commands following this EXTERNAL AUTHENTICATE command (it does not apply to this command) and within this Secure Channel  
     * Possible `secLvl` values:  
     * `0` - No secure messaging expected  
     * `1` - C-MAC  
     * `3` - C-DECRYPTION and C-MAC  
     */
    setSecurityLevel(secLvl: TSecLvl = 0): this {
        if(this.isActive) {
            throw new Error('Cannot set a secured level on an active session. Reset it first.');
        }
        this._secLvl = secLvl;
        return this;
    }

    get securityLevel(): TSecLvl {
        return this._secLvl;
    }

    setStaticKeys(keys: ISessionKeys | undefined): this {
        this._staticKeys = keys;
        return this;
    }

    get staticKeys() {
        return this._staticKeys;
    }

    get sessionKeys() {
        return this._sessionKeys;
    }

    get protocolVersion() {
        return this._protocolVersion;
    }

    /** Key diversification data */
    get keyDivData() {
        return this._keyDivData
    }

    get keyVersion() {
        return this._keyVersion;
    }

    get sequenceCounter() {
        return this._sequenceCounter;
    }

    get info(): ISessionInfo {
        return {
            isActive: this.isActive,
            /** Session security level. Read the setSecurityLevel() method documentation to know more. */
            secLvl: this.securityLevel,
            /** Secure channel protocol(SCP) number */
            protocol: this.protocolVersion,
            /** Key diversification data */
            keyDivData: this.keyDivData,
            /** Used key version */
            keyVersion: this.keyVersion,
            /**  Secure Channel Sequence Counter */
            seqCount: this.sequenceCounter,
        }
    }

    get authenticator(): (cmd: CommandApdu) => CommandApdu {
        return this._doAuthenticate;
    }

    /** Sends INITIALIZE_UPDATE and EXTERNAL AUTHENTICATE commands. Sets session as active on success */
    initAndAuth(keyVer: number = 0, keyId: number = 0): Promise<ResponseApdu> {
        return new Promise((resolve, reject) => {
            if (typeof this.staticKeys === 'undefined') {
                return reject(new Error('Cannot initialize secure session. No static keys have been set.'));
            }
            this.reset();
            const hostChallenge = [...crypto.randomBytes(8)];
            // sending INITIALIZE_UPDATE command with host challenge
            this._card.issueCommand(GPCommands.initUpdate(hostChallenge, keyVer, keyId))
                .then((response) => {
                    assertOk(response);
                    if (response.dataLength !== 28) {
                        this.reset();
                        return reject(
                            new Error(`Secure session init error; Response length error; resp: [${response.toString()}]`),
                        );
                    }

                    const keyDivData = response.data.slice(0, 10);
                    const keyVersion = response.data[10];
                    const protocolVersion = response.data[11];
                    if(protocolVersion !== 0x02) {
                        this.reset();
                        return reject(new Error(`Only 0x02 protocol is supported. Received: 0x${protocolVersion.toString(16).padStart(2, '0').toUpperCase()}`));
                    }
                    const sequenceCounter = response.data.slice(12, 14);
                    const cardChallenge = response.data.slice(12, 20);
                    const cardCryptogram = response.data.slice(20);

                    const sessionKeys = genSessionKeys(sequenceCounter, this.staticKeys!);
                    const expectedCardCryptogram = genCryptogram(
                        'card',
                        cardChallenge,
                        hostChallenge,
                        sessionKeys.enc,
                    );
                    if (arrayToHex(cardCryptogram) !== arrayToHex(expectedCardCryptogram)) {
                        this.reset();
                        return reject(new Error('Card cryptogram does not match'));
                    }
                    const hostCryptogram = genCryptogram(
                        'host',
                        cardChallenge,
                        hostChallenge,
                        sessionKeys.enc,
                    );
                    const extAuthCmd = addMac(
                        GPCommands.extAuth(hostCryptogram, this.securityLevel),
                        sessionKeys,
                    );
                    this._card.issueCommand(extAuthCmd)
                        .then((response) => {
                            assertOk(response);
                            this._sessionKeys = sessionKeys;
                            this._keyDivData = keyDivData;
                            this._keyVersion = keyVersion;
                            this._protocolVersion = protocolVersion;
                            this._sequenceCounter = sequenceCounter;
                            this._lastCmac = extAuthCmd.getData().slice(extAuthCmd.getLc() - 8);
                            this._authenticateFunction = (cmd: CommandApdu) => {
                                const result = authenticateCmd(this.securityLevel, cmd, this._sessionKeys!, this._lastCmac);
                                this._lastCmac = result.getData().slice(result.getLc() - 8);
                                return result;
                            };
                            this._isActive = true;
                            resolve(response);
                        })
                        .catch((err) => {
                            reject(err);
                        });
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    reset() {
        this._isActive = false;
        this._authenticateFunction = undefined;
        this._sessionKeys = undefined;
        this._keyDivData = [];
        this._keyVersion = 0;
        this._protocolVersion = 0;
        this._sequenceCounter = [];
        this._lastCmac = [];
    }
}