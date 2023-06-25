import CommandApdu from '../commandApdu';
import { hexToArray } from '../utils';

const insByteList = {
    INIT_UPDATE: 0x50,
    EXT_AUTH: 0x82,
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
