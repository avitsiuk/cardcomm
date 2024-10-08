import {
    isHexString,
    strHasHexPrefix,
    normalizeHexString,
    hexDecode,
    hexEncode,
    importBinData,
    getMinWordNum,
    isBinData,
    decodeAtr,
} from '../src/utils';

describe('utils', () => {
    test('isHexString()', () => {
        expect(isHexString('')).toBeTruthy();
        expect(isHexString('f')).toBeTruthy();
        expect(isHexString('F')).toBeTruthy();
        expect(isHexString('ff')).toBeTruthy();
        expect(isHexString('fF')).toBeTruthy();
        expect(isHexString('Ff')).toBeTruthy();
        expect(isHexString('FF')).toBeTruthy();
        expect(isHexString('oxff')).toBeFalsy();
        expect(isHexString('0xff')).toBeTruthy();
        expect(isHexString('0ff')).toBeTruthy();
        expect(isHexString('xff')).toBeFalsy();
        expect(isHexString(' 0xff')).toBeFalsy();
        expect(isHexString('0xff ')).toBeFalsy();
        expect(isHexString('0xf f')).toBeFalsy();
        expect(isHexString(' 0xff ')).toBeFalsy();
        expect(isHexString(' 0xf f ')).toBeFalsy();
        expect(isHexString('f f')).toBeFalsy();
    })
    test('strHasHexPrefix()', () => {
        expect(strHasHexPrefix('')).toBeFalsy();
        expect(strHasHexPrefix('f')).toBeFalsy();
        expect(strHasHexPrefix('F')).toBeFalsy();
        expect(strHasHexPrefix('ff')).toBeFalsy();
        expect(strHasHexPrefix('fF')).toBeFalsy();
        expect(strHasHexPrefix('Ff')).toBeFalsy();
        expect(strHasHexPrefix('FF')).toBeFalsy();
        expect(strHasHexPrefix('oxff')).toBeFalsy();
        expect(strHasHexPrefix('0xff')).toBeTruthy();
        expect(strHasHexPrefix('0ff')).toBeFalsy();
        expect(strHasHexPrefix('xff')).toBeFalsy();
        expect(strHasHexPrefix(' 0xff')).toBeFalsy();
        expect(strHasHexPrefix('0xff ')).toBeTruthy();
        expect(strHasHexPrefix('0xf f')).toBeTruthy();
        expect(strHasHexPrefix(' 0xff ')).toBeFalsy();
        expect(strHasHexPrefix(' 0xf f ')).toBeFalsy();
        expect(strHasHexPrefix('f f')).toBeFalsy();
    })
    test('normalizeHexString()', () => {
        expect(normalizeHexString('ff00ff')).toEqual('ff00ff');
        expect(normalizeHexString('0xff00ff')).toEqual('ff00ff');
        expect(normalizeHexString('0xf00ff')).toEqual('0f00ff');
        expect(normalizeHexString('0ff00ff')).toEqual('00ff00ff');
        expect(normalizeHexString('x0ff00ff')).toEqual('x0ff00ff');
    })
    test('hexDecode()', () => {
        //@ts-ignore
        expect(()=>{hexDecode(true)}).toThrow(new TypeError('Not a string'));

        //@ts-ignore
        expect(()=>{hexDecode('a string')}).toThrow(new TypeError('Not a hex string: [a string]'));
        expect(hexDecode('')).toEqual(new Uint8Array(0));
        expect(hexDecode('f')).toEqual(new Uint8Array([15]));
        expect(hexDecode('0f')).toEqual(new Uint8Array([15]));
        expect(hexDecode('0x0f')).toEqual(new Uint8Array([15]));
        expect(hexDecode('0X0f')).toEqual(new Uint8Array([15]));
        expect(hexDecode('0X0F')).toEqual(new Uint8Array([15]));

        //@ts-ignore
        expect(()=>{hexDecode('0102', true)}).toThrow(new Error('outBuffer must be an ArrayBuffer or ArrayBufferView'));
        const ab = new ArrayBuffer(5);
        expect(()=>{hexDecode('0102', ab, -1)}).toThrow(new Error('outOffset value out of bounds; value: -1'));
        expect(()=>{hexDecode('0102', ab, 5)}).toThrow(new Error('outOffset value out of bounds; value: 5'));
        expect(()=>{hexDecode('0102', ab, 4)}).toThrow(new Error('Not enough space in the provided outBuffer'));

        expect(hexDecode('0102', ab)).toEqual(new Uint8Array([1,2]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([1,2,0,0,0]));
        expect(hexDecode('0f10', ab, 1)).toEqual(new Uint8Array([15,16]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([1,15,16,0,0]));

        const u8 = new Uint8Array(ab).subarray(1, 4);
        expect(hexDecode('feff',u8)).toEqual(new Uint8Array([254,255]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([1,254,255,0,0]));
        expect(u8).toEqual(new Uint8Array([254,255,0]));
        expect(hexDecode('8081',u8, 1)).toEqual(new Uint8Array([128,129]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([1,254,128,129,0]));
        expect(u8).toEqual(new Uint8Array([254,128,129]));

        const buf = Buffer.from(ab, 1, 3);
        expect(hexDecode('a0a',buf)).toEqual(new Uint8Array([10,10]));
        expect(buf).toEqual(Buffer.from([10,10,129]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([1,10,10,129,0]));
        expect(hexDecode('0xb0b',buf, 1)).toEqual(new Uint8Array([11,11]));
        expect(buf).toEqual(Buffer.from([10,11,11]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([1,10,11,11,0]));
    })
    test('importBinData()', () => {

        //@ts-ignore
        expect(()=>{importBinData(true)}).toThrow(new Error('Accepted binary data types: hex string, number[], ArrayBuffer, ArrayBufferView'));
        //@ts-ignore
        expect(()=>{importBinData(['asd'])}).toThrow(new Error('Data is not a numeric array'));

        let ab = new ArrayBuffer(5);
        let u8 = new Uint8Array(ab).subarray(1, 4);
        let buf = Buffer.from(ab, 1, 3);

        expect(()=>{importBinData('zz')}).toThrow(new Error('Error decoding hex string: Not a hex string: [zz]'));
        expect(importBinData('')).toEqual(new Uint8Array(0));
        expect(importBinData('f')).toEqual(new Uint8Array([15]));
        expect(importBinData('0xf')).toEqual(new Uint8Array([15]));
        expect(importBinData('0Xf')).toEqual(new Uint8Array([15]));
        expect(importBinData('0xF')).toEqual(new Uint8Array([15]));
        expect(importBinData('0XF')).toEqual(new Uint8Array([15]));
        expect(importBinData('ff')).toEqual(new Uint8Array([255]));
        expect(importBinData('f0f')).toEqual(new Uint8Array([15, 15]));

        expect(()=>{importBinData('0f', ab, -1)}).toThrow(new Error('Error decoding hex string: outOffset value out of bounds; value: -1'));
        expect(()=>{importBinData('0f', ab, 5)}).toThrow(new Error('Error decoding hex string: outOffset value out of bounds; value: 5'));
        expect(()=>{importBinData('0faa', ab, 4)}).toThrow(new Error('Error decoding hex string: Not enough space in the provided outBuffer'));
        expect(importBinData('f', ab)).toEqual(new Uint8Array([15]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([15,0,0,0,0]));
        expect(importBinData('10', ab, 1)).toEqual(new Uint8Array([16]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([15,16,0,0,0]));

        expect(()=>{importBinData('0f', u8, -1)}).toThrow(new Error('Error decoding hex string: outOffset value out of bounds; value: -1'));
        expect(()=>{importBinData('0f', u8, 5)}).toThrow(new Error('Error decoding hex string: outOffset value out of bounds; value: 5'));
        expect(()=>{importBinData('0faa', u8, 2)}).toThrow(new Error('Error decoding hex string: Not enough space in the provided outBuffer'));
        expect(importBinData('11', u8)).toEqual(new Uint8Array([17]));
        expect(u8).toEqual(new Uint8Array([17,0,0]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([15,17,0,0,0]));
        expect(importBinData('1212', u8, 1)).toEqual(new Uint8Array([18, 18]));
        expect(u8).toEqual(new Uint8Array([17,18,18]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([15,17,18,18,0]));

        expect(()=>{importBinData('0f', buf, -1)}).toThrow(new Error('Error decoding hex string: outOffset value out of bounds; value: -1'));
        expect(()=>{importBinData('0f', buf, 5)}).toThrow(new Error('Error decoding hex string: outOffset value out of bounds; value: 5'));
        expect(()=>{importBinData('0faa', buf, 2)}).toThrow(new Error('Error decoding hex string: Not enough space in the provided outBuffer'));
        expect(importBinData('13', buf)).toEqual(new Uint8Array([19]));
        expect(buf).toEqual(Buffer.from([19,18,18]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([15,19,18,18,0]));
        expect(importBinData('1414', buf, 1)).toEqual(new Uint8Array([20, 20]));
        expect(buf).toEqual(Buffer.from([19,20,20]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([15,19,20,20,0]));

        ab = new ArrayBuffer(5);
        u8 = new Uint8Array(ab).subarray(1, 4);
        buf = Buffer.from(ab, 1, 3);

        expect(importBinData([1,1], u8, 1)).toEqual(new Uint8Array([1, 1]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([0,0,1,1,0]));
        expect(u8).toEqual(new Uint8Array([0,1,1]));

        expect(importBinData(new Uint8Array([10,10]), ab, 1)).toEqual(new Uint8Array([10, 10]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([0,10,10,1,0]));
        expect(u8).toEqual(new Uint8Array([10,10,1]));

        let testData = new Uint8Array(2);

        testData.set([2,3]);
        expect(importBinData(testData, u8, 1)).toEqual(new Uint8Array([2, 3]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([0,10,2,3,0]));
        expect(u8).toEqual(new Uint8Array([10,2,3]));

        testData.set([0,0]);
        expect(importBinData(testData.buffer, u8, 1)).toEqual(new Uint8Array([0, 0]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([0,10,0,0,0]));
        expect(u8).toEqual(new Uint8Array([10,0,0]));

        testData.set([1,1]);
        expect(importBinData(Buffer.from(testData), u8, 1)).toEqual(new Uint8Array([1, 1]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([0,10,1,1,0]));
        expect(u8).toEqual(new Uint8Array([10,1,1]));

        testData.set([5,5]);
        const result = importBinData(testData);
        expect(result).toEqual(testData);
        testData.set([6,6]);
        expect(result).toEqual(testData);
        //@ts-ignore
        expect(()=>{importBinData(testData, true)}).toThrow(new Error('outBuffer must be an ArrayBuffer or ArrayBufferView'));
        expect(()=>{importBinData(testData, new Uint8Array(5), -1)}).toThrow(new Error('outOffset value out of bounds; value: -1'));
        expect(()=>{importBinData(testData, new Uint8Array(5), 10)}).toThrow(new Error('outOffset value out of bounds; value: 10'));
        expect(()=>{importBinData(testData, new Uint8Array(5), 4)}).toThrow(new Error('Not enough space in the provided outBuffer'));
    })
    test('hexEncode()', () => {
        //@ts-ignore
        expect(()=>{hexEncode(['str'])}).toThrow(new TypeError('Error hexencoding value: Data is not a numeric array'));
        expect(hexEncode([0,1,2,3, 255])).toEqual('00010203ff');
    })
    test('getMinWordNum()', () => {
        expect(getMinWordNum(0, 7)).toEqual(1);
        expect(getMinWordNum(1, 7)).toEqual(1);
        expect(getMinWordNum(127, 7)).toEqual(1);
        expect(getMinWordNum(128, 7)).toEqual(2);
        expect(getMinWordNum(16383, 7)).toEqual(2);
        expect(getMinWordNum(16384, 7)).toEqual(3);
        expect(getMinWordNum(2097151, 7)).toEqual(3);
        expect(getMinWordNum(2097152, 7)).toEqual(4);
        expect(getMinWordNum(268435455, 7)).toEqual(4);
        expect(getMinWordNum(268435456, 7)).toEqual(5);
        expect(getMinWordNum(34359738367, 7)).toEqual(5);
        expect(getMinWordNum(34359738368, 7)).toEqual(6);
        expect(getMinWordNum(0, 8)).toEqual(1);
        expect(getMinWordNum(1, 8)).toEqual(1);
        expect(getMinWordNum(127, 8)).toEqual(1);
        expect(getMinWordNum(128, 8)).toEqual(1);
        expect(getMinWordNum(16383, 8)).toEqual(2);
        expect(getMinWordNum(16384, 8)).toEqual(2);
        expect(getMinWordNum(2097151, 8)).toEqual(3);
        expect(getMinWordNum(2097152, 8)).toEqual(3);
        expect(getMinWordNum(268435455, 8)).toEqual(4);
        expect(getMinWordNum(268435456, 8)).toEqual(4);
        expect(getMinWordNum(34359738367, 8)).toEqual(5);
        expect(getMinWordNum(34359738368, 8)).toEqual(5);
 
        // default value
        expect(getMinWordNum(34359738367)).toEqual(5);
        expect(getMinWordNum(34359738368)).toEqual(5);
    })
    test('isBinData()', () => {
        expect(isBinData('z')).toBeFalsy();
        expect(isBinData('')).toBeTruthy();
        expect(isBinData('0x')).toBeFalsy();
        expect(isBinData('0xf')).toBeTruthy();
        expect(isBinData('0xf')).toBeTruthy();
        expect(isBinData('0xF')).toBeTruthy();
        expect(isBinData('0Xf')).toBeTruthy();
        expect(isBinData([])).toBeTruthy();
        expect(isBinData([0, 1, true])).toBeFalsy();
        expect(isBinData([0])).toBeTruthy();
        expect(isBinData(new ArrayBuffer(0))).toBeTruthy();
        expect(isBinData(new Uint8Array(0))).toBeTruthy();
        expect(isBinData(new Uint32Array(0))).toBeTruthy();
        expect(isBinData(Buffer.from([]))).toBeTruthy();
    })
    test('decodeAtr()', () => {
        //@ts-ignore
        expect(()=>{decodeAtr(true)}).toThrow(new Error('Error decoding ATR: Error importing ATR binary: Accepted binary data types: hex string, number[], ArrayBuffer, ArrayBufferView'));
        expect(()=>{decodeAtr('')}).toThrow(new Error('Error decoding ATR: ATR length expected to be at least 2 bytes. Received: 0'));
        expect(()=>{decodeAtr('0001')}).toThrow(new Error('Error decoding ATR: invalid TS byte value'));
        expect(()=>{decodeAtr('3b01')}).toThrow(new Error('Error decoding ATR: error reading historical bytes: unexpected end of data'));
        expect(()=>{decodeAtr('3b10')}).toThrow(new Error('Error decoding ATR: Error decodinng TA(1): unexpected end of data'));
        expect(()=>{decodeAtr('3b20')}).toThrow(new Error('Error decoding ATR: Error decodinng TB(1): unexpected end of data'));
        expect(()=>{decodeAtr('3b40')}).toThrow(new Error('Error decoding ATR: Error decodinng TC(1): unexpected end of data'));
        expect(()=>{decodeAtr('3b80')}).toThrow(new Error('Error decoding ATR: Error decodinng TD(1): unexpected end of data'));
        expect(()=>{decodeAtr('3b8010')}).toThrow(new Error('Error decoding ATR: Error decodinng TA(2): unexpected end of data'));
        expect(()=>{decodeAtr('3b8020')}).toThrow(new Error('Error decoding ATR: Error decodinng TB(2): unexpected end of data'));
        expect(()=>{decodeAtr('3b8040')}).toThrow(new Error('Error decoding ATR: Error decodinng TC(2): unexpected end of data'));
        expect(()=>{decodeAtr('3b8080')}).toThrow(new Error('Error decoding ATR: Error decodinng TD(2): unexpected end of data'));
        expect(()=>{decodeAtr('3b809000')}).toThrow(new Error('Error decoding ATR: Error decodinng TD(2): unexpected end of data'));

        expect(decodeAtr('3f00')).toEqual({TS: 'inverse', T0: {K: 0, Y: '0b0000'}, TA:{}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3f00ff')).toEqual({TS: 'inverse', T0: {K: 0, Y: '0b0000'}, TA:{}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0), TCK: 255});
        expect(decodeAtr('3b0100')).toEqual({TS: 'direct', T0: {K: 1, Y: '0b0000'}, TA:{}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array([0])});
        expect(decodeAtr('3b0100ff')).toEqual({TS: 'direct', T0: {K: 1, Y: '0b0000'}, TA:{}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array([0]), TCK: 255});
        expect(decodeAtr('3b03010203')).toEqual({TS: 'direct', T0: {K: 3, Y: '0b0000'}, TA:{}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array([1,2,3])});
        expect(decodeAtr('3b03010203ff')).toEqual({TS: 'direct', T0: {K: 3, Y: '0b0000'}, TA:{}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array([1,2,3]), TCK: 255});

        // TA(1)
        expect(decodeAtr('3b10f0')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: -1, Fi: -1, fMax: -1, cyclesPerETU: -1}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b10f1')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 1, Fi: -1, fMax: -1, cyclesPerETU: -1}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b10f2')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 2, Fi: -1, fMax: -1, cyclesPerETU: -1}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b10f3')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 4, Fi: -1, fMax: -1, cyclesPerETU: -1}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b10f4')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 8, Fi: -1, fMax: -1, cyclesPerETU: -1}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b10f5')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 16, Fi: -1, fMax: -1, cyclesPerETU: -1}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b10f6')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 32, Fi: -1, fMax: -1, cyclesPerETU: -1}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b10f7')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 64, Fi: -1, fMax: -1, cyclesPerETU: -1}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b10f8')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 12, Fi: -1, fMax: -1, cyclesPerETU: -1}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b10f9')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 20, Fi: -1, fMax: -1, cyclesPerETU: -1}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});

        expect(decodeAtr('3b1001')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 1, Fi: 372, fMax: 4, cyclesPerETU: 372}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b1011')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 1, Fi: 372, fMax: 5, cyclesPerETU: 372}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b1021')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 1, Fi: 558, fMax: 6, cyclesPerETU: 558}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b1031')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 1, Fi: 744, fMax: 8, cyclesPerETU: 744}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b1041')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 1, Fi: 1116, fMax: 12, cyclesPerETU: 1116}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b1051')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 1, Fi: 1488, fMax: 16, cyclesPerETU: 1488}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b1061')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 1, Fi: 1860, fMax: 20, cyclesPerETU: 1860}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b1091')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 1, Fi: 512, fMax: 5, cyclesPerETU: 512}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b10a1')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 1, Fi: 768, fMax: 7.5, cyclesPerETU: 768}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b10b1')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 1, Fi: 1024, fMax: 10, cyclesPerETU: 1024}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b10c1')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 1, Fi: 1536, fMax: 15, cyclesPerETU: 1536}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b10d1')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0001'}, TA:{1:{Di: 1, Fi: 2048, fMax: 20, cyclesPerETU: 2048}}, TB:{}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});

        // TB(1)
        expect(decodeAtr('3b2000')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0010'}, TA:{}, TB:{1:{connected: false, PI1: -1, I: -1}}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b2061')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0010'}, TA:{}, TB:{1:{connected: true, PI1: 1, I: -1}}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b201f')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0010'}, TA:{}, TB:{1:{connected: true, PI1: 31, I: 25}}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b203f')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0010'}, TA:{}, TB:{1:{connected: true, PI1: 31, I: 50}}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b205f')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0010'}, TA:{}, TB:{1:{connected: true, PI1: 31, I: -1}}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b207f')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0010'}, TA:{}, TB:{1:{connected: true, PI1: 31, I: -1}}, TC:{}, TD:{}, historicalBytes: new Uint8Array(0)});

        // TC(1)
        expect(decodeAtr('3b4000')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0100'}, TA:{}, TB:{}, TC:{1: 0}, TD:{}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b40ff')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b0100'}, TA:{}, TB:{}, TC:{1: 255}, TD:{}, historicalBytes: new Uint8Array(0)});

        // TD(1)
        expect(decodeAtr('3b8000')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b1000'}, TA:{}, TB:{}, TC:{}, TD:{1: {T: 0, Y: '0b0000'}}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b800f')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b1000'}, TA:{}, TB:{}, TC:{}, TD:{1: {T: 15, Y: '0b0000'}}, historicalBytes: new Uint8Array(0)});

        // TA(2)
        expect(decodeAtr('3b801000')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b1000'}, TA:{ 2: { T: 0, canChange: true, implicitETUDuration: false } }, TB:{}, TC:{}, TD:{1: {T: 0, Y: '0b0001'}}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b80100f')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b1000'}, TA:{ 2: { T: 15, canChange: true, implicitETUDuration: false } }, TB:{}, TC:{}, TD:{1: {T: 0, Y: '0b0001'}}, historicalBytes: new Uint8Array(0)});
        
        expect(decodeAtr('3b801090')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b1000'}, TA:{ 2: { T: 0, canChange: false, implicitETUDuration: true } }, TB:{}, TC:{}, TD:{1: {T: 0, Y: '0b0001'}}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b801080')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b1000'}, TA:{ 2: { T: 0, canChange: false, implicitETUDuration: false } }, TB:{}, TC:{}, TD:{1: {T: 0, Y: '0b0001'}}, historicalBytes: new Uint8Array(0)});

        // TB(3)
        expect(decodeAtr('3b80802000')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b1000'}, TA:{}, TB:{3: { BWI: 0, CWI: 0 }}, TC:{}, TD:{1: {T: 0, Y: '0b1000'}, 2: {T: 0, Y: '0b0010'}}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b808020f1')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b1000'}, TA:{}, TB:{3: { BWI: 15, CWI: 1 }}, TC:{}, TD:{1: {T: 0, Y: '0b1000'}, 2: {T: 0, Y: '0b0010'}}, historicalBytes: new Uint8Array(0)});
        expect(decodeAtr('3b8080201f')).toEqual({TS: 'direct', T0: {K: 0, Y: '0b1000'}, TA:{}, TB:{3: { BWI: 1, CWI: 15 }}, TC:{}, TD:{1: {T: 0, Y: '0b1000'}, 2: {T: 0, Y: '0b0010'}}, historicalBytes: new Uint8Array(0)});
    })
})