import crypto from 'crypto';
import { arrayToHex, hexToArray } from '../../utils';
import { berTlvDecode } from '../../tlv';
import ResponseApdu, {assertOk} from '../../responseApdu';
import CommandApdu from '../../commandApdu';
import * as Iso7816Commands from '../../iso7816/commands';
import * as GPCommands from '../commands';
import Card from '../../card';

const KEY_BYTE_LEN = 32;
const BLOCK_BYTE_LEN = 16;
const CMAC_BYTE_LEN = 8;

/**
 * 0x34: C-MAC and R-MAC only
 * 0x3C: C-MAC, C-DECRYPTION, and R-MAC, R-ENCRYPTION
 */
type TSecLvl = 0x34 | 0x3C;

interface ISessionKeys {
    /** ReceiptKey used only for initial card receipt verification */
    rKey: number[]
    /** Secure Channel command and response encryption key */
    sEnc: number[],
    /** Secure Channel C-MAC session key */
    sMac: number[],
    /** Secure Channel R-MAC session key */
    sRmac: number[],
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
    private _card: Card;
    private _secLvl: TSecLvl = 0x34;
    private _includeId: boolean = false;
    private _id: number[] = [];
    private _protocolVersion: number = 11;

    private _isActive: boolean = false;
    private _sessionKeys: ISessionKeys | undefined;
    private _macChainingValue: number[];
    private _encryptCounter: number[];

    private _commandAuthenticateFunction: ((cmd: CommandApdu) => CommandApdu) | undefined;
    private _responseAuthenticateFunction: ((resp: ResponseApdu) => ResponseApdu) | undefined;
    private _doCommandAuthenticate = (cmd: CommandApdu) => {
        if (!this.isActive
        || typeof this._commandAuthenticateFunction === 'undefined'
        ) {
            return cmd;
        }
        const newCmd = this._commandAuthenticateFunction(cmd);
        return newCmd;
    }
    private _doResponseAuthenticate = (rsp: ResponseApdu) => {
        if (!this.isActive
        || typeof this._responseAuthenticateFunction === 'undefined'
        || (rsp.dataLength < 1)
        || (!rsp.isOk())
        ) {
            return rsp;
        }
        return this._responseAuthenticateFunction(rsp);
    }

    constructor(card: Card) {
        this._card = card;
        this._macChainingValue = new Array<number>(BLOCK_BYTE_LEN).fill(0);
        this._encryptCounter = new Array<number>(BLOCK_BYTE_LEN).fill(0);
        this._encryptCounter[this._encryptCounter.length - 1] = 1;
        this.reset();
    }

    reset() {
        this._isActive = false;
        this._commandAuthenticateFunction = undefined;
        this._sessionKeys = undefined;
        this._macChainingValue = new Array<number>(BLOCK_BYTE_LEN).fill(0);;
        this._encryptCounter = new Array<number>(BLOCK_BYTE_LEN).fill(0);
        this._encryptCounter[this._encryptCounter.length - 1] = 0x01;
        this._commandAuthenticateFunction = undefined;
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
            throw new Error('Cannot set a security level on an active session. Reset it first.');
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

    get commandAuthenticator(): (cmd: CommandApdu) => CommandApdu {
        return this._doCommandAuthenticate;
    }

    get responseAuthenticator(): (rsp: ResponseApdu) => ResponseApdu {
        return this._doResponseAuthenticate;
    }

    private cEnc(
        cmd: CommandApdu,
    ) {
        // do not apply encryption if there are no data.
        if(cmd.getLc() <= 0) {
            return cmd;
        }
        if (typeof this._sessionKeys === 'undefined') {
            throw new Error(`Session keys not defined`);
        }
        if(this._sessionKeys.sEnc.length !== KEY_BYTE_LEN) {
            throw new Error(`Wrong s-enc length; expected ${KEY_BYTE_LEN} bytes; received ${this._sessionKeys.sEnc.length} bytes`);
        }
        if(this._encryptCounter.length !== BLOCK_BYTE_LEN) {
            throw new Error(`Wrong encryption counter length; expected ${BLOCK_BYTE_LEN} bytes; received ${this._encryptCounter.length} bytes`);
        }

        // data: [cmd.data](Lc) + [8000...00](missingPaddingBytes)
        // total data len must be multiple of BLOCK_BYTE_LEN
        const missingPaddingBytes = BLOCK_BYTE_LEN - ( cmd.getLc() % BLOCK_BYTE_LEN);
        let dataToEncrypt = Buffer.alloc((cmd.getLc() + missingPaddingBytes), 0);
        dataToEncrypt.set(cmd.getData());
        dataToEncrypt[cmd.getLc()] = 0x80;

        const icvCipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this._sessionKeys.sEnc), Buffer.alloc(BLOCK_BYTE_LEN, 0));
        const icv = Buffer.concat([icvCipher.update(Buffer.from(this._encryptCounter)), icvCipher.final()]).subarray(0, BLOCK_BYTE_LEN);
        // console.log(`ENC CNT: [${arrayToHex(this._encryptCounter)}]`);

        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this._sessionKeys.sEnc), icv).setAutoPadding(false);
        const encryptedData =  Buffer.concat([cipher.update(dataToEncrypt), cipher.final()]);

        return new CommandApdu(cmd).setSecMgsType(1).setData([...encryptedData]);
    }

    private cMac(
        cmd: CommandApdu,
    ) {
        if(cmd.getLc() + CMAC_BYTE_LEN > 255 ) {
            throw new Error(`Max ${255 - CMAC_BYTE_LEN} bytes of data`);
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
        const missingPaddingBytes = BLOCK_BYTE_LEN - ((5 + origData.length) % BLOCK_BYTE_LEN);
        let dataToAuthenticate = Buffer.alloc(BLOCK_BYTE_LEN + 5 + origData.length + missingPaddingBytes, 0);
        dataToAuthenticate.set(this._macChainingValue, 0);
        dataToAuthenticate.set(newHeader, BLOCK_BYTE_LEN);
        dataToAuthenticate.set([origData.length + CMAC_BYTE_LEN], (BLOCK_BYTE_LEN + 4));
        dataToAuthenticate.set(origData, (BLOCK_BYTE_LEN + 5));
        dataToAuthenticate.set([0x80], (BLOCK_BYTE_LEN + 5 + origData.length));

        const icvCipher = crypto
            .createCipheriv('aes-256-cbc', Buffer.from(this._sessionKeys.sEnc), Buffer.alloc(BLOCK_BYTE_LEN, 0))
            .setAutoPadding(false);
        const icv = Buffer.concat([icvCipher.update(Buffer.from(this._encryptCounter)), icvCipher.final()]).subarray(0, BLOCK_BYTE_LEN);
        // console.log(`MAC CNT: [${arrayToHex(this._encryptCounter)}]`);

        // prepend BLOCK_BYTE_LEN-byte mac chaining value to the data before 
        const macCipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this._sessionKeys.sMac), icv).setAutoPadding(false);
        const macCipherResult = Buffer.concat([macCipher.update(dataToAuthenticate), macCipher.final()]);
        // also first 8 bytes of the new chaining value is the current C-MAC
        this._macChainingValue = [...macCipherResult.subarray(macCipherResult.length - BLOCK_BYTE_LEN)];

        // // remove padding (8000...) and append mac instead
        const paddingIdx = dataToAuthenticate.length - missingPaddingBytes;
        const newCmdBytes = Buffer.concat([
                dataToAuthenticate.subarray(this._macChainingValue.length, paddingIdx),
                Buffer.from(this._macChainingValue.slice(0, CMAC_BYTE_LEN)),
            ]);

        // // Do not forget to set original logical channel
        return new CommandApdu(newCmdBytes).setLogicalChannel(cmd.getLogicalChannel());
    }

    public decryptResponse(rsp: ResponseApdu): ResponseApdu {
        if (rsp.dataLength < 1) {
            return rsp;
        }
        if (typeof this._sessionKeys === 'undefined') {
            throw new Error(`Session keys not defined`);
        }
        if(this._sessionKeys.sEnc.length !== KEY_BYTE_LEN) {
            throw new Error(`Wrong s-enc length; expected ${KEY_BYTE_LEN} bytes; received ${this._sessionKeys.sEnc.length} bytes`);
        }
        if(this._encryptCounter.length !== BLOCK_BYTE_LEN) {
            throw new Error(`Wrong encryption counter length; expected ${BLOCK_BYTE_LEN} bytes; received ${this._encryptCounter.length} bytes`);
        }

        const encryptedData = Buffer.from(rsp.data);

        const icvCipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this._sessionKeys.sEnc), Buffer.alloc(BLOCK_BYTE_LEN, 0));
        const icv = Buffer.concat([icvCipher.update(Buffer.from(this._encryptCounter)), icvCipher.final()]).subarray(0, BLOCK_BYTE_LEN);
        // console.log(`DEC CNT: [${arrayToHex(this._encryptCounter)}]`);

        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this._sessionKeys.sEnc), icv).setAutoPadding(false);
        const plainWithPadding = [...Buffer.concat([decipher.update(encryptedData), decipher.final()])];

        let paddingIdx = plainWithPadding.length;
        for (let i = plainWithPadding.length - 1; i >= 0; i -= 1) {
            if (plainWithPadding[i] === 0x80) {
                paddingIdx = i;
                break;
            }
            if (plainWithPadding[i] !== 0) {
                break;
            }
        }

        return new ResponseApdu([...plainWithPadding.slice(0, paddingIdx), ...rsp.status]);
    }

    /**
     * 
     * @param eSkOceEcka - Off-card entity ephemeral private(secret) key for EC key agreement protocol
     * @param pkSdEcka - secure domain(applet) static public key for EC key agreement protocol
     * @param ePkSdEcka - secure domain(applet) ephemeral public key for EC key agreement protocol
     */
    private genSessionKeys(
        eSkOceEcka: number[],
        pkSdEcka: number[],
        ePkSdEcka: number[],
    ): void {
        const eEcka = crypto.createECDH('prime256v1');
        eEcka.setPrivateKey(Buffer.from(eSkOceEcka));
        const shSee = eEcka.computeSecret(Buffer.from(ePkSdEcka));
        const shSes = eEcka.computeSecret(Buffer.from(pkSdEcka));
        const shS = Buffer.concat([shSee, shSes]);

        const sharedInfo = Buffer.from([this._secLvl, 0x88, 0x20]);

        const derivationData = Buffer.concat([shS, Buffer.alloc(8, 0), sharedInfo]);
        const rKey = [...crypto.createHash('sha256').update(derivationData).digest()];
        derivationData[shS.length + 7] = 0x01;
        const sEnc = [...crypto.createHash('sha256').update(derivationData).digest()];
        derivationData[shS.length + 7] = 0x02;
        const sMac = [...crypto.createHash('sha256').update(derivationData).digest()];
        derivationData[shS.length + 7] = 0x04;
        const sRmac = [...crypto.createHash('sha256').update(derivationData).digest()];

        // see 4.3.3. Key Derivation Functions:
        // https://www.bsi.bund.de/SharedDocs/Downloads/EN/BSI/Publications/TechGuidelines/TR03111/BSI-TR-03111_V-2-1_pdf.pdf
        this._sessionKeys = {rKey, sEnc, sMac, sRmac};
    }

    isReceiptValid(intAuthCmd: CommandApdu, intAuthResp: ResponseApdu): boolean {
        const rspBerObj = berTlvDecode(intAuthResp.data);
        const missingPaddingBytes = BLOCK_BYTE_LEN - ((intAuthCmd.getLc() + 68) % BLOCK_BYTE_LEN);
        const dataToAuthenticate = Buffer.alloc(this._macChainingValue.length + intAuthCmd.getLc() + 68 + missingPaddingBytes, 0);
        dataToAuthenticate.set([
            ...this._macChainingValue,
            ...intAuthCmd.getData(),
            0x5F, 0x49, 0x41,
            ...(rspBerObj['5f49'].value as number[]),
            0x80
        ], 0);

        const icvCipher = crypto
        .createCipheriv('aes-256-cbc', Buffer.from(this._sessionKeys!.sEnc), Buffer.alloc(BLOCK_BYTE_LEN, 0))
        .setAutoPadding(false);
        const icv = Buffer.concat([icvCipher.update(Buffer.from(this._encryptCounter)), icvCipher.final()]).subarray(0, BLOCK_BYTE_LEN);

        // prepend BLOCK_BYTE_LEN-byte mac chaining value to the data before 
        const macCipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this._sessionKeys!.rKey), icv).setAutoPadding(false);
        const macCipherResult = Buffer.concat([macCipher.update(dataToAuthenticate), macCipher.final()]);
        const newMacChainingValue = macCipherResult.subarray(macCipherResult.length - BLOCK_BYTE_LEN);

        if (arrayToHex(rspBerObj['86'].value as number[]) === newMacChainingValue.toString('hex')) {
            this._macChainingValue = [...newMacChainingValue];
            return true;
        }
        return false;
    }


    /** Sends INITIALIZE_UPDATE and EXTERNAL AUTHENTICATE commands. Sets session as active on success */
    initAndAuth(keyVer: number = 0, keyId: number = 0): Promise<ResponseApdu> {
        return new Promise(async(resolve, reject) => {
            this.reset();

            // getting card static public key
            this._card.issueCommand(new CommandApdu('8087000000'))
                .then(async(response) => {
                    const berObj = berTlvDecode(response.data);
                    const pkSdEcka =(berObj['5f49'].value as number[]);
                    // generating ephemeral OCE keypair
                    const ecdh = crypto.createECDH('prime256v1');
                    await ecdh.generateKeys();
                    const ePkOceEcka = ecdh.getPublicKey();

                    // sending int_auith command with OCE ephemeral public key and session settings
                    const intAuthCmd = GPCommands.intAuth([...ePkOceEcka], this._secLvl, this._includeId, this._id);
                    this._card.issueCommand(intAuthCmd)
                        .then((response) => {
                            const berObj = berTlvDecode(response.data);
                            // getting card ephemeral public key
                            const ePkSdEcka = (berObj['5f49'].value as number[]);
                            this.genSessionKeys(
                                    [...ecdh.getPrivateKey()],
                                    pkSdEcka,
                                    ePkSdEcka,
                                );
                            // validating receipt from intAuthCmd response
                            // if receipt is valid, it gets set as new mac chaining value
                            if (!this.isReceiptValid(intAuthCmd, response)) {
                                throw new Error(`Authentication receipt not valid`);
                            }

                            this._isActive = true;

                            this._commandAuthenticateFunction = (cmd: CommandApdu) => {
                                let authenticatedCmd = cmd;
                                if (this._secLvl === 0x3C) {
                                    authenticatedCmd = this.cEnc(cmd);
                                }
                                authenticatedCmd = this.cMac(authenticatedCmd);
                                this.increaseCounter();
                                return authenticatedCmd;
                            }
                            this._responseAuthenticateFunction = (rsp: ResponseApdu) => {
                                let authenticatedRsp = rsp;
                                if (this._secLvl === 0x3C) {
                                    authenticatedRsp = this.decryptResponse(authenticatedRsp);
                                }
                                this.increaseCounter();
                                return authenticatedRsp;
                            }
                            return resolve(response);
                        })
                        .catch((e) => {
                            return reject(e);
                        })
                })
                .catch((e) => {
                    return reject(new Error(`Error getting card static public key: ${e}`));
                })
        });
    }
}