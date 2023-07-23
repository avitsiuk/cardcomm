import crypto from 'crypto';
import { arrayToHex, hexToArray } from '../../utils';
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

    private _prevMacChaining: number[];
    private _prevEncryptCounter: number[];

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

        this._prevEncryptCounter = this._encryptCounter;
        this._prevMacChaining = this._macChainingValue;

        this.reset();
    }

    reset() {
        this._isActive = false;
        this._authenticateFunction = undefined;
        this._sessionKeys = undefined;
        this._macChainingValue = new Array<number>(BLOCK_BYTE_LEN).fill(0);;
        this._encryptCounter = new Array<number>(BLOCK_BYTE_LEN).fill(0);
        this._encryptCounter[this._encryptCounter.length - 1] = 0x01;

        this._prevEncryptCounter = this._encryptCounter;
        this._prevMacChaining = this._macChainingValue;
    }

    get isActive(): boolean {
        return this._isActive;
    }

    private increaseCounter() {
        this._prevEncryptCounter = new Array<number>(...this._encryptCounter);
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

        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this._sessionKeys.sEnc), icv);
        const encryptedData =  Buffer.concat([cipher.update(dataToEncrypt), cipher.final()]);

        // const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this._sessionKeys.sEnc), icv);
        // const plain = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
        // console.log(`P: [${dataToEncrypt.toString('hex')}]`);
        // console.log(`E: [${encryptedData.toString('hex')}]`);
        // console.log(`D: [${plain.toString('hex')}]`);

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
        const missingPaddingBytes = BLOCK_BYTE_LEN - ((BLOCK_BYTE_LEN + 5 + origData.length) % BLOCK_BYTE_LEN);
        let dataToAuthenticate = Buffer.alloc(21 + origData.length + missingPaddingBytes, 0);
        dataToAuthenticate.set(this._macChainingValue, 0);
        dataToAuthenticate.set(newHeader, this._macChainingValue.length);
        dataToAuthenticate.set([origData.length + CMAC_BYTE_LEN], (this._macChainingValue.length + 4));
        dataToAuthenticate.set(origData, (this._macChainingValue.length + 5));
        dataToAuthenticate.set([0x80], (this._macChainingValue.length + 5 + origData.length));

        const icvCipher = crypto
            .createCipheriv('aes-256-cbc', Buffer.from(this._sessionKeys.sEnc), Buffer.alloc(BLOCK_BYTE_LEN, 0))
            .setAutoPadding(false);
            // console.log(`CNT: [${arrayToHex(this._encryptCounter)}]`);
        const icv = Buffer.concat([icvCipher.update(Buffer.from(this._encryptCounter)), icvCipher.final()]).subarray(0, BLOCK_BYTE_LEN);

        // prepend BLOCK_BYTE_LEN-byte mac chaining value to the data before 
        const macCipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this._sessionKeys.sMac), icv);
        const macCipherResult = Buffer.concat([macCipher.update(dataToAuthenticate), macCipher.final()]);
        const macStartIdx = BLOCK_BYTE_LEN * Math.max((Math.floor(macCipherResult.length / BLOCK_BYTE_LEN) - 2), 0)
        // also first 8 bytes of the new chaining value is the current C-MAC
        this._prevMacChaining = this._macChainingValue;
        this._macChainingValue = [...macCipherResult.subarray(macStartIdx, macStartIdx + BLOCK_BYTE_LEN)];

        // // remove padding (8000...) and append mac instead
        const paddingIdx = dataToAuthenticate.length - missingPaddingBytes;
        const newCmdBytes = Buffer.concat([
                dataToAuthenticate.subarray(this._macChainingValue.length, paddingIdx),
                Buffer.from(this._macChainingValue.slice(0, CMAC_BYTE_LEN)),
            ]);

        // console.log(`DTA: [${dataToAuthenticate.toString('hex')}]`);
        // console.log(`ICV: [${icv.toString('hex')}]`);
        // console.log(`RES: [${macCipherResult.toString('hex')}]`);
        // console.log(`MAC: [${arrayToHex(this._macChainingValue)}]`);
        // console.log();

        // // Do not forget to set original logical channel
        return new CommandApdu(newCmdBytes).setLogicalChannel(cmd.getLogicalChannel());
    }

    public isCMacValid(cmd: CommandApdu): boolean {
        // console.log();
        // console.log(`CMD: [${arrayToHex(cmd.toArray())}]`);
        if(cmd.getSecMgsType() === 0) {
            throw new Error('No secure messaging flag in the command apdu');
        }
        if (cmd.getLc() < CMAC_BYTE_LEN) {
            throw new Error('Not enough data in the command apdu');
        }

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
        if(this._prevEncryptCounter.length !== BLOCK_BYTE_LEN) {
            throw new Error(`Wrong prev encryption counter length; expected ${BLOCK_BYTE_LEN} bytes; received ${this._prevEncryptCounter.length} bytes`);
        }

        // c67da3b35214fcbc94eb78bc475828b98f8c0dde7065c2973997343c4f9b25fa870994af06e32c1b04f1783c3406d3e978b719ba44d158aedacd8cc29a6c78a6b1b2981954087631

        const header = new CommandApdu(cmd).setLogicalChannel(0).toArray().slice(0, 5);
        const data = cmd.getData().slice(0, cmd.getLc() - CMAC_BYTE_LEN);
        const missingPaddingBytes = BLOCK_BYTE_LEN - ((header.length + data.length) % BLOCK_BYTE_LEN);
        const dataToAuthenticate = Buffer.alloc(16 + header.length + data.length + missingPaddingBytes, 0);
        dataToAuthenticate.set(this._prevMacChaining, 0);
        dataToAuthenticate.set(header, this._prevMacChaining.length);
        dataToAuthenticate.set(data, this._prevMacChaining.length + header.length);
        dataToAuthenticate.set([0x80], this._prevMacChaining.length + data.length + header.length);

        const icvCipher = crypto
            .createCipheriv('aes-256-cbc', Buffer.from(this._sessionKeys.sEnc), Buffer.alloc(BLOCK_BYTE_LEN, 0))
            .setAutoPadding(false);
        // console.log(`CNT: [${arrayToHex(this._prevEncryptCounter)}]`);
        const icv = Buffer.concat([icvCipher.update(Buffer.from(this._prevEncryptCounter)), icvCipher.final()]).subarray(0, BLOCK_BYTE_LEN);

        // prepend BLOCK_BYTE_LEN-byte mac chaining value to the data before
        const macCipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this._sessionKeys.sMac), icv);
        const macCipherResult = Buffer.concat([macCipher.update(dataToAuthenticate), macCipher.final()]);
        const macStartIdx = BLOCK_BYTE_LEN * Math.max((Math.floor(macCipherResult.length / BLOCK_BYTE_LEN) - 2), 0);
        const mac = macCipherResult.subarray(macStartIdx, macStartIdx + CMAC_BYTE_LEN);
        // console.log(`DTA: [${dataToAuthenticate.toString('hex')}]`);
        // console.log(`ICV: [${icv.toString('hex')}]`);
        // console.log(`RES: [${macCipherResult.toString('hex')}]`);
        // console.log(`MAC: [${mac.toString('hex')}]`);

        const receivedMac = Buffer.from(cmd.getData().slice(cmd.getLc() - CMAC_BYTE_LEN));
        // console.log(`MAC: [${receivedMac.toString('hex')}]`);
        // console.log(`MAC: [${arrayToHex(cmd.getData())}]`);

        if (receivedMac.toString('hex') === mac.toString('hex')) {
            return true;
        } else {
            return false;
        }
    }

    public cDecryptWithCMac(cmd: CommandApdu): CommandApdu {
        // console.log();
        // console.log(`CMD: [${arrayToHex(cmd.toArray())}]`);
        if(cmd.getSecMgsType() === 0) {
            throw new Error('No secure messaging flag in the command apdu');
        }
        if (cmd.getLc() <= CMAC_BYTE_LEN) {
            throw new Error('Not enough data in the command apdu; ');
        }
        if (typeof this._sessionKeys === 'undefined') {
            throw new Error(`Session keys not defined`);
        }
        if(this._sessionKeys.sEnc.length !== KEY_BYTE_LEN) {
            throw new Error(`Wrong s-enc length; expected ${KEY_BYTE_LEN} bytes; received ${this._sessionKeys.sEnc.length} bytes`);
        }
        if(this._prevEncryptCounter.length !== BLOCK_BYTE_LEN) {
            throw new Error(`Wrong prev encryption counter length; expected ${BLOCK_BYTE_LEN} bytes; received ${this._prevEncryptCounter.length} bytes`);
        }

        const encryptedData = Buffer.from(cmd.getData().slice(0, cmd.getLc() - CMAC_BYTE_LEN));

        if (encryptedData.length < 1) {
            return cmd;
        }

        const icvCipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this._sessionKeys.sEnc), Buffer.alloc(BLOCK_BYTE_LEN, 0));
        const icv = Buffer.concat([icvCipher.update(Buffer.from(this._prevEncryptCounter)), icvCipher.final()]).subarray(0, BLOCK_BYTE_LEN);

        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this._sessionKeys!.sEnc), icv);
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

        // console.log(`DTA: [${encryptedData.toString('hex')}]`);
        // console.log(`ICV: [${icv.toString('hex')}]`);
        // console.log(`RES: [${Buffer.from(plainWithPadding.slice(0, paddingIdx)).toString('hex')}]`);
        // console.log(`IDX: [${paddingIdx}]`);

        // console.log(`CMD: [${new CommandApdu(cmd).toBuffer().toString('hex')}]`);

        return new CommandApdu(cmd).setData(plainWithPadding.slice(0, paddingIdx));
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

        // see 4.3.3. Key Derivation Functions:
        // https://www.bsi.bund.de/SharedDocs/Downloads/EN/BSI/Publications/TechGuidelines/TR03111/BSI-TR-03111_V-2-1_pdf.pdf
        this._sessionKeys = {
            sEnc:   [...crypto.createHash('sha256').update(Buffer.concat([shS, Buffer.from('00000001', 'hex')])).digest()],
            sMac:   [...crypto.createHash('sha256').update(Buffer.concat([shS, Buffer.from('00000002', 'hex')])).digest()],
            sRMac:  [...crypto.createHash('sha256').update(Buffer.concat([shS, Buffer.from('00000004', 'hex')])).digest()],
        }
    }


    /** Sends INITIALIZE_UPDATE and EXTERNAL AUTHENTICATE commands. Sets session as active on success */
    initAndAuth(keyVer: number = 0, keyId: number = 0): Promise<ResponseApdu> {
        return new Promise(async(resolve, reject) => {
            this.reset();

            // generate ephemeral asymmetric EC keys for key agreement
            const eSkOceEcka = hexToArray('b1c74760249d83c9ad70439338f746c1ea52f6f25b6d0d5f384176e529114146');
            const ePkOceEcka = hexToArray(
                '04927ea9624053449f8fce329228615408c748eb8d3009417df663f34c02aae4c467d414a1c164716412692f264b4a054ce515aa6337ff016d877d5f9d9f22db4d'
            );

            // // send ephemeral public key in a INTERNAL_AUTHENTICATE command
            const intAuthCmd = GPCommands.intAuth([...ePkOceEcka], this._secLvl, this._includeId, this._id);

            // get card static public key
            const pkSdEcka = hexToArray('046930f10f99eb9f3efcc793f79e76ce4bfb666ca22d1dca5ab0fb5d1c1caecb31f7ccc10b4063fddc76193107f6a20e99e75a31aacb183a3f1308a34955fc1fe8');
            // get card ephemeral public key from intAuth response
            const ePkSdEcka = hexToArray('0422987603e2cc0974aeefc3990263ae71b3a9a149f99ead6e7daaca2730d2ac42c1773289a2c8f69a52fcec1e77f2455c4cd220fcefdfd61ce9ecb9409fc10b2d');
            this.genSessionKeys(
                eSkOceEcka,
                pkSdEcka,
                ePkSdEcka,
            );

            for (let i = 0; i < 255; i++) {
                let testCmd = new CommandApdu(intAuthCmd);
                console.log();
                console.log(`CMD: [${testCmd.toBuffer().toString('hex')}]`);
                testCmd = this.cEnc(testCmd);
                testCmd = this.cMac(testCmd);
                this.increaseCounter();
                console.log(`ENC: [${testCmd.toBuffer().toString('hex')}]`);
                console.log(`AUTH: [${this.isCMacValid(testCmd)}]`);
                console.log(`DEC: [${Buffer.from(this.cDecryptWithCMac(testCmd).getData()).toString('hex')}]`);
            }

            return resolve(new ResponseApdu());
        });
    }
}