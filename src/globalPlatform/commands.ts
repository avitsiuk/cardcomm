import * as Tlv from '../tlv';
import CommandApdu from '../commandApdu';
import { hexToArray, arrayToHex } from '../utils';

const insByteList = {
    INIT_UPDATE: 0x50,
    EXT_AUTH: 0x82,
    INT_AUTH: 0x88,
};

export function initUpdate(
    hostChallenge: number[],
    keyVer: number = 0,
    keyId: number = 0,
) {
    if (hostChallenge.length !== 8) {
        throw new Error('Wrong host challenge length');
    }
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
export function extAuth(
    hostCryptogram: number[],
    secLvl: 0 | 1 | 3 = 0,
) {
    if (hostCryptogram.length !== 8) {
        throw new Error('Wrong host cryptogram length');
    }
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
    key: number[],
    secLvl: 0x34 | 0x3C = 0x34,
    includeId: boolean = false,
    id: number[] = [],
) {
    let berObj: Tlv.IBerObj = {
        'A6': {
            value: {
                '90': {
                    value: [0x11, (includeId ? 0x04 : 0x00)],
                },
                '95': {
                    value: [secLvl],
                },
                '80': {
                    value: [0x88],
                },
                '81': {
                    value: [Math.floor(key.length / 2)],
                },
            }
        },
        '5F49': {
            value: key,
        }
    };

    if (includeId) {
        (berObj['06'].value as Tlv.IBerObj)['84'] = {
            value: id
        };
    }

    const data: number[] = Tlv.berTlvEncode(berObj);

    let cmd = new CommandApdu()
        .setProprietary()
        .setType(4)
        .setSecMgsType(0)
        .setIns(insByteList.INT_AUTH)
        .setP1(0x00) // key version
        .setP2(0x00) // key identifier
        .setData(data);
    return cmd;
}
