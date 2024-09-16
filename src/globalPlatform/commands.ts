import { BerObject, Tag, IBerObjInfo } from '../ber/index';
import CommandApdu from '../commandApdu';
import { importBinData, TBinData } from '../utils';

const insByteList = {
    INIT_UPDATE: 0x50,
    EXT_AUTH: 0x82,
    INT_AUTH: 0x88,

    DELETE: 0xe4,
    GET_DATA: 0xca,
    GET_STATUS: 0xf2,
};

export function initUpdate(
    hostChallenge: TBinData,
    keyVer: number = 0,
    keyId: number = 0,
) {
    let cmd = new CommandApdu()
        .setProprietary()
        .setIns(insByteList.INIT_UPDATE)
        .setP1(keyVer)
        .setP2(keyId)
        .setData(hostChallenge)
        .setLe(0);
    return cmd;
}

/**
 * External authenticate
 * @param secLvl - (Default:`0`) Defines the level of security for all secure messaging commands following this EXTERNAL AUTHENTICATE command (it does not apply to this command) and within this Secure Channel
 * Possible `secLvl` values:
 * `0` - No secure messaging expected
 * `1` - C-MAC
 * `3` - C-DECRYPTION and C-MAC
 */
export function extAuth(hostCryptogram: TBinData, secLvl: 0 | 1 | 3 = 0) {
    let cmd = new CommandApdu()
        .setProprietary()
        .setType(4)
        .setSecMgsType(1)
        .setIns(insByteList.EXT_AUTH)
        .setP1(secLvl)
        .setP2(0x00)
        .setData(hostCryptogram);
    return cmd;
}

/**
 * Internal authenticate
 * @param key - ephemeral OCE key agreement public key
 * @param secLvl - (Default:`0x34`) Defines the level of security for all secure messaging commands following this INTERNAL_AUTHENTICATE command (it does not apply to this command) and within this Secure Channel
 * Possible `secLvl` values:
 * `0x34` - C-MAC and R-MAC only
 * `0x3C` - C-MAC, C-DECRYPTION, R-MAC, R-ENCRYPTION
 * @param includeId - (Default: `false`) If true, a passed id can be included
 * @param id - id to include if `includeId` parameter has been set to `true`
 */
export function intAuth(
    key: TBinData,
    secLvl: 0x34 | 0x3c = 0x34,
    includeId: boolean = false,
    id: TBinData = new Uint8Array(0),
) {
    let _key: Uint8Array;
    try {
        _key = importBinData(key);
    } catch (error: any) {
        throw new Error(`Key error: ${error.message}`);
    }

    let berObjInfo: IBerObjInfo = {
        tag: Tag.root,
        value: [
            {
                tag: 'A6',
                value: [
                    { tag: '90', value: [0x11, includeId ? 0x04 : 0x00] },
                    { tag: '95', value: [secLvl] },
                    { tag: '80', value: [0x88] },
                    { tag: '81', value: [Math.floor(_key.byteLength / 2)] },
                ],
            },
            { tag: '5F49', value: _key },
        ],
    };

    if (includeId) {
        ((berObjInfo.value as IBerObjInfo[])[0].value as IBerObjInfo[]).push({
            tag: '84',
            value: id,
        });
    }

    let cmd = new CommandApdu()
        .setProprietary()
        .setType(4)
        .setSecMgsType(0)
        .setIns(insByteList.INT_AUTH)
        .setP1(0x00) // key version
        .setP2(0x00) // key identifier
        .setData(BerObject.create(berObjInfo).serialize());
    return cmd;
}
