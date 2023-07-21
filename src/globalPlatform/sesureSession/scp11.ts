import crypto from 'crypto';
import { arrayToHex, hexToArray } from '../../utils';
import ResponseApdu, {assertOk} from '../../responseApdu';
import CommandApdu from '../../commandApdu';
import * as Iso7816Commands from '../../iso7816/commands';
import * as GPCommands from '../commands';
import Card from '../../card';

const KEY_BYTE_LEN = 32;
const BLOCK_BYTE_LEN = 16;

/**
 * 0x34: C-MAC and R-MAC only
 * 0x3C: C-MAC, C-DECRYPTION, and R-MAC, R-ENCRYPTION
 */
type TSecLvl = 0x34 | 0x3C;

interface ISessionKeys {
    /** Secure Channel command and response encryption key */
    sEnc: number[],
    /** Secure Channel C-MAC session key */
    sMac: number[],
    /** Secure Channel R-MAC session key */
    sRMac: number[],
}

interface ISessionInfo {
    /** Get set to true after a sussessful authorization. */
    isActive: boolean,
    /** Secure channel protocol(SCP) number */
    protocol: number,
    /** Session security level. Read the setSecurityLevel() method documentation to know more. */
    secLvl: TSecLvl,
    /** */
    includeId: boolean;
    /** */
    id: number[];
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

export default class SCP11 {
    // private _card: Card;
    private _secLvl: TSecLvl = 0x34;
    private _includeId: boolean = false;
    private _id: number[] = [];
    private _protocolVersion: number = 11;

    private _isActive: boolean = false;
    private _sessionKeys: ISessionKeys | undefined;
    private _macChainingValue: number[];
    private _encryptCounter: number[];

    private _authenticateFunction: ((cmd: CommandApdu) => CommandApdu) | undefined;
    private _doAuthenticate = (cmd: CommandApdu) => {
        if (!this.isActive
        || typeof this._authenticateFunction === 'undefined'
        ) {
            return cmd;
        }
        return this._authenticateFunction(cmd);
    }

    constructor(card?: Card) {
        // this._card = card;
        this._macChainingValue = new Array<number>(BLOCK_BYTE_LEN).fill(0);
        this._encryptCounter = new Array<number>(BLOCK_BYTE_LEN).fill(0);
        this._encryptCounter[this._encryptCounter.length - 1] = 1;
        this.reset();
    }

    reset() {
        this._isActive = false;
        this._authenticateFunction = undefined;
        this._sessionKeys = undefined;
        this._macChainingValue = new Array<number>(BLOCK_BYTE_LEN).fill(0);;
        this._encryptCounter = new Array<number>(BLOCK_BYTE_LEN).fill(0);
        this._encryptCounter[this._encryptCounter.length - 1] = 0x01;
    }

    get isActive(): boolean {
        return this._isActive;
    }

    private increaseCounter() {
        for (let i = (this._encryptCounter.length - 1); i >= 0; i -=1) {
            if (this._encryptCounter[i] < 0xFF) {
                this._encryptCounter[i] += 1;
                break;
            } else {
                this._encryptCounter[i] = 0;
            }
        }
    }

    /**
     * Sets the security level for this session. Must be called before initAndAuth.
     * @param secLvl - (Default:`0x34`) Defines the level of security for all secure messaging commands following this EXTERNAL AUTHENTICATE command (it does not apply to this command) and within this Secure Channel  
     * Possible `secLvl` values:  
     * `0x34` - C-MAC and R-MAC only  
     * `0x3C` - C-MAC, C-DECRYPTION, R-MAC, R-ENCRYPTION
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

    setIncludeId(doIncludeId: boolean = true) {
        this._includeId = doIncludeId;
        return this;
    }

    get includeId(): boolean {
        return this._includeId;
    }

    setId(id: number[] = []) {
        this._id = id;
        return this;
    }

    get id(): number[] {
        return this._id;
    }

    get info(): ISessionInfo {
        return {
            isActive: this.isActive,
            /** Session security level. Read the setSecurityLevel() method documentation to know more. */
            secLvl: this.securityLevel,
            /** Secure channel protocol(SCP) number */
            protocol: this.protocolVersion,
            /**  */
            includeId: this._includeId,
            /** */
            id: this._id,
        }
    }

    get authenticator(): (cmd: CommandApdu) => CommandApdu {
        return this._doAuthenticate;
    }

    private addMac(
        cmd: CommandApdu,
    ) {
        const macLength = 8;
        if(cmd.getLc() + macLength > 255 ) {
            throw new Error(`Max ${255 - macLength} bytes of data`);
        }
        if (typeof this._sessionKeys === 'undefined') {
            throw new Error(`Session keys not defined`);
        }
        if(this._sessionKeys.sMac.length !== KEY_BYTE_LEN) {
            throw new Error(`Wrong s-mac length; expected ${KEY_BYTE_LEN} bytes; received ${this._sessionKeys.sMac.length} bytes`);
        }
        if(this._sessionKeys.sEnc.length !== KEY_BYTE_LEN) {
            throw new Error(`Wrong s-enc length; expected ${KEY_BYTE_LEN} bytes; received ${this._sessionKeys.sEnc.length} bytes`);
        }
        if(this._encryptCounter.length !== BLOCK_BYTE_LEN) {
            throw new Error(`Wrong encryption counter length; expected ${BLOCK_BYTE_LEN} bytes; received ${this._encryptCounter.length} bytes`);
        }
        if(this._macChainingValue.length !== BLOCK_BYTE_LEN) {
            throw new Error(`Wrong mac chaining value length; expected ${BLOCK_BYTE_LEN} bytes; received ${this._macChainingValue.length} bytes`);
        }

        const origData = cmd.getData();

        // If any logical channel is used, version with base channel gets
        // authenticated and original logical channed must be restored at the end
        const newHeader = new CommandApdu(cmd).setSecMgsType(1).setLogicalChannel(0)
            .toArray().slice(0, 4);

        // data: [macChainingValue](BLOCK_BYTE_LEN) + [newHeader](4) + [Lc(data+mac)](1) + [data](Lc) + [8000...00](missingPaddingBytes)
        // total data len must be multiple of BLOCK_BYTE_LEN
        const missingPaddingBytes = BLOCK_BYTE_LEN - ((BLOCK_BYTE_LEN + 5 + origData.length) % BLOCK_BYTE_LEN);
        let dataToAuthenticate = Buffer.alloc(21 + origData.length + missingPaddingBytes, 0);
        dataToAuthenticate.set(this._macChainingValue, 0);
        dataToAuthenticate.set(newHeader, this._macChainingValue.length);
        dataToAuthenticate.set([origData.length + macLength], (this._macChainingValue.length + 4));
        dataToAuthenticate.set(origData, (this._macChainingValue.length + 5));
        dataToAuthenticate.set([0x80], (this._macChainingValue.length + 5 + origData.length));

        const icvCipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this._sessionKeys.sEnc), Buffer.alloc(BLOCK_BYTE_LEN, 0));
        const icv = Buffer.concat([icvCipher.update(Buffer.from(this._encryptCounter)), icvCipher.final()]).subarray(0, BLOCK_BYTE_LEN);

        // prepend BLOCK_BYTE_LEN-byte mac chaining value to the data before 
        const macCipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this._sessionKeys.sMac), icv);
        this._macChainingValue = [...Buffer.concat([macCipher.update(dataToAuthenticate), macCipher.final()]).subarray(0, BLOCK_BYTE_LEN)];

        // // remove padding (8000...) and append mac instead
        const paddingIdx = dataToAuthenticate.length - missingPaddingBytes;
        const newCmdBytes = Buffer.concat([
                dataToAuthenticate.subarray(this._macChainingValue.length, paddingIdx),
                Buffer.from(this._macChainingValue.slice(0, macLength))
            ]);

        // // Do not forget to set original logical channel
        return new CommandApdu(newCmdBytes).setLogicalChannel(cmd.getLogicalChannel());
    }

    /** Sends INITIALIZE_UPDATE and EXTERNAL AUTHENTICATE commands. Sets session as active on success */
    initAndAuth(keyVer: number = 0, keyId: number = 0): Promise<ResponseApdu> {
        return new Promise(async(resolve, reject) => {
            this.reset();

            // generate ephemeral asymmetric EC keys
            const eEcka = crypto.createECDH('prime256v1');
            const eSkOceEcka = Buffer.from('b1c74760249d83c9ad70439338f746c1ea52f6f25b6d0d5f384176e529114146', 'hex');
            eEcka.setPrivateKey(eSkOceEcka);
            const ePkOceEcka = Buffer.from('04927ea9624053449f8fce329228615408c748eb8d3009417df663f34c02aae4c467d414a1c164716412692f264b4a054ce515aa6337ff016d877d5f9d9f22db4d', 'hex');

            // const shSee = Buffer.from('ff7b1c8a6e2c0a61e10047960f79e1babf445f94ecca665b55d34a0acb3293a3', 'hex');
            // const shSes = Buffer.from('c9115c67873d130b9472b3799867b29fd240c4f9ccff29bdf0a965ac8468b549', 'hex');

            // ff7b1c8a6e2c0a61e10047960f79e1babf445f94ecca665b55d34a0acb3293a3c9115c67873d130b9472b3799867b29fd240c4f9ccff29bdf0a965ac8468b549
            // 313ad390a1f46d5fc0c1b62736d337936ede69c468af11b40384acb08f04d6ba

            // build INTERNAL_AUTHENTICATE command
            const intAuthCmd = GPCommands.intAuth([...ePkOceEcka], this._secLvl, this._includeId, this._id);

            // get card public keys from intAuth response
            const pkSdEcka = Buffer.from('046930f10f99eb9f3efcc793f79e76ce4bfb666ca22d1dca5ab0fb5d1c1caecb31f7ccc10b4063fddc76193107f6a20e99e75a31aacb183a3f1308a34955fc1fe8', 'hex');
            const ePkSdEcka = Buffer.from('0422987603e2cc0974aeefc3990263ae71b3a9a149f99ead6e7daaca2730d2ac42c1773289a2c8f69a52fcec1e77f2455c4cd220fcefdfd61ce9ecb9409fc10b2d', 'hex');

            const shSee = eEcka.computeSecret(ePkSdEcka);
            console.log(`shSee: [${shSee.toString('hex')}]`);
            const shSes = eEcka.computeSecret(pkSdEcka);
            console.log(`shSes: [${shSes.toString('hex')}]`);

            const key = crypto.createHash('sha256').update(Buffer.concat([shSee, shSes])).digest();
            console.log(`Key:   [${key.toString('hex')}]`);

            this._sessionKeys = {
                sEnc:   [...key],
                sMac:   [...key],
                sRMac:  [...key],
            }

            const testCmd = new CommandApdu().setProprietary().setLogicalChannel(1).setIns(0xFF).setData([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);

            for (let i = 0; i < 100; i++) {
                this.addMac(testCmd);
                this.increaseCounter();
            }

            return resolve(new ResponseApdu());

            // this._card.issueCommand(cmd)
            //     .then((result) => {
            //         console.log(result.toString());
            //         return resolve(new ResponseApdu());
            //     })
            //     .catch((err) => {
            //         return reject(err);
            //     })
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

            //

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
}