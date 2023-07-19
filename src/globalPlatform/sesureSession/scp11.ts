import crypto from 'crypto';
import { arrayToHex, hexToArray } from '../../utils';
import ResponseApdu, {assertOk} from '../../responseApdu';
import CommandApdu from '../../commandApdu';
import * as Iso7816Commands from '../../iso7816/commands';
import * as GPCommands from '../commands';
import Card from '../../card';

/**
 * 0x34: C-MAC and R-MAC only
 * 0x3C: C-DECRYPTION, R-ENCRYPTION, C-MAC, and R-MAC
 */
type TSecLvl = 0x34 | 0x3C;

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
}

// function genSessionKeys(
//     sequenceNumber: number[],
//     staticKeys: ISessionKeys,
// ): ISessionKeys {
//     return {
//         enc: genSessionKey('enc', sequenceNumber, staticKeys.enc),
//         mac: genSessionKey('mac', sequenceNumber, staticKeys.mac),
//         dek: genSessionKey('dek', sequenceNumber, staticKeys.dek),
//     }
// }

function authenticateCmd(
    secLvl: TSecLvl,
    cmd: CommandApdu,
    sessionKeys: ISessionKeys,
    icv: number[] = new Array<number>(8).fill(0),
) {
    return cmd;
}

export default class SCP11 {
    private _card: Card;
    private _isActive: boolean = false;
    private _secLvl: TSecLvl = 0x34;
    private _sessionKeys: ISessionKeys | undefined;
    private _protocolVersion: number = 11;

    private _lastCmac: number[] = [];

    private _authenticateFunction: ((cmd: CommandApdu) => CommandApdu) | undefined;
    private _doAuthenticate = (cmd: CommandApdu) => {
        if (!this.isActive
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
    setSecurityLevel(secLvl: TSecLvl = 0x34): this {
        if(this.isActive) {
            throw new Error('Cannot set a secured level on an active session. Reset it first.');
        }
        this._secLvl = secLvl;
        return this;
    }

    get securityLevel(): TSecLvl {
        return this._secLvl;
    }

    get sessionKeys() {
        return this._sessionKeys;
    }

    get protocolVersion() {
        return this._protocolVersion;
    }

    get info(): ISessionInfo {
        return {
            isActive: this.isActive,
            /** Session security level. Read the setSecurityLevel() method documentation to know more. */
            secLvl: this.securityLevel,
            /** Secure channel protocol(SCP) number */
            protocol: this.protocolVersion,
        }
    }

    get authenticator(): (cmd: CommandApdu) => CommandApdu {
        return this._doAuthenticate;
    }

    /** Sends INITIALIZE_UPDATE and EXTERNAL AUTHENTICATE commands. Sets session as active on success */
    initAndAuth(keyVer: number = 0, keyId: number = 0): Promise<ResponseApdu> {
        return new Promise(async(resolve, reject) => {
            this.reset();

            // ephemeral keys
            const ecdh = crypto.createECDH('prime256v1');
            ecdh.generateKeys();

            const cmd = GPCommands.intAuth([...ecdh.getPublicKey()], 0x34, true, [0x01, 0x02, 0x03]);
            this._card.issueCommand(cmd)
                .then((result) => {
                    console.log(result.toString());
                    return resolve(new ResponseApdu());
                })
                .catch((err) => {
                    return reject(err);
                })
            // const hostChallenge = [...crypto.randomBytes(8)];
            // // sending INITIALIZE_UPDATE command with host challenge
            // this._card.issueCommand(GPCommands.initUpdate(hostChallenge, keyVer, keyId))
            //     .then((response) => {
            //         assertOk(response);
            //         if (response.dataLength !== 28) {
            //             this.reset();
            //             return reject(
            //                 new Error(`Secure session init error; Response length error; resp: [${response.toString()}]`),
            //             );
            //         }

            //         const keyDivData = response.data.slice(0, 10);
            //         const keyVersion = response.data[10];
            //         const protocolVersion = response.data[11];
            //         if(protocolVersion !== 0x02) {
            //             this.reset();
            //             return reject(new Error(`Only 0x02 protocol is supported. Received: 0x${protocolVersion.toString(16).padStart(2, '0').toUpperCase()}`));
            //         }
            //         const sequenceCounter = response.data.slice(12, 14);
            //         const cardChallenge = response.data.slice(12, 20);
            //         const cardCryptogram = response.data.slice(20);

            //         const sessionKeys = genSessionKeys(sequenceCounter, this.staticKeys!);
            //         const expectedCardCryptogram = genCryptogram(
            //             'card',
            //             cardChallenge,
            //             hostChallenge,
            //             sessionKeys.enc,
            //         );
            //         if (arrayToHex(cardCryptogram) !== arrayToHex(expectedCardCryptogram)) {
            //             this.reset();
            //             return reject(new Error('Card cryptogram does not match'));
            //         }
            //         const hostCryptogram = genCryptogram(
            //             'host',
            //             cardChallenge,
            //             hostChallenge,
            //             sessionKeys.enc,
            //         );
            //         const extAuthCmd = addMac(
            //             GPCommands.extAuth(hostCryptogram, this.securityLevel),
            //             sessionKeys,
            //         );
            //         this._card.issueCommand(extAuthCmd)
            //             .then((response) => {
            //                 assertOk(response);
            //                 this._sessionKeys = sessionKeys;
            //                 this._keyDivData = keyDivData;
            //                 this._keyVersion = keyVersion;
            //                 this._protocolVersion = protocolVersion;
            //                 this._sequenceCounter = sequenceCounter;
            //                 this._lastCmac = extAuthCmd.getData().slice(extAuthCmd.getLc() - 8);
            //                 this._authenticateFunction = (cmd: CommandApdu) => {
            //                     //this._lastCmac
            //                     const result = authenticateCmd(this.securityLevel, cmd, this._sessionKeys!, this._lastCmac);
            //                     this._lastCmac = result.getData().slice(result.getLc() - 8);
            //                     return result;
            //                 };
            //                 this._isActive = true;
            //                 resolve(response);
            //             })
            //             .catch((err) => {
            //                 reject(err);
            //             });
            //     })
            //     .catch((err) => {
            //         reject(err);
            //     });
        });
    }

    reset() {
        this._isActive = false;
        this._authenticateFunction = undefined;
        this._sessionKeys = undefined;
        this._protocolVersion = 0;
        this._lastCmac = [];
    }
}