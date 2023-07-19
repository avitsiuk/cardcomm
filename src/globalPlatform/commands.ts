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

export function intAuth(
    key: number[],
    secLvl: 0x34 | 0x3C = 0x34,
    includeId: boolean = false,
    id: number[] = [],
) {

    // const BerTlvTagClassNames = [
    //     'universal',        // 00
    //     'application',      // 01
    //     'context-specific', // 10
    //     'private',          // 11
    // ]


    // 95
    // 00010101 => 15

    let dataObj: Tlv.IBerObj = {
        // '49': {// 5F49
        //     class: 'application',
        //     value: key,
        // },
        '06': { // A6
            class: 'context-specific',
            value: {
                '10': { // 90
                    class: 'context-specific',
                    value: [0x11, (includeId ? 0x04 : 0x00)],
                },
                '15': { // 95
                    class: 'context-specific',
                    value: [secLvl],
                },
                '00': { // 80
                    class: 'context-specific',
                    value: [0x88],
                },
                '01': { // 81
                    class: 'context-specific',
                    value: [key.length],
                },
            }
        },
        '49': {// 5F49
            class: 'application',
            value: key,
        }
    };

    if (includeId) {
        const idElem = {
            class: 'context-specific',
            value: id
        };
        (dataObj['06'].value as Tlv.IBerObj)['04'] = idElem; // 84
    }

    // let data: number[] = Tlv.berTlvEncode(dataObj);
    const data1 = '5f4941049a914e68fcca0cabc14463af308a8800ff5cb260f217363100f50ac3bac5f7e096ee97e0a6cb194753a1dc83120b266de488fd29fb20bff98d269467266c8ba9a612900211049501348001888101418403010203';
    const data2 = 'a6129002110495013480018881014184030102035f4941049a914e68fcca0cabc14463af308a8800ff5cb260f217363100f50ac3bac5f7e096ee97e0a6cb194753a1dc83120b266de488fd29fb20bff98d269467266c8ba9';

    const data = hexToArray(data2);

    console.log(`DATA: [${arrayToHex(data)}]`);

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
