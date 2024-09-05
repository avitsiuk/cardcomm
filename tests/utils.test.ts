import {
    isHexString,
    strHasHexPrefix,
    normalizeHexString,
    hexDecode,
    hexEncode,
    importBinData,
} from '../src/utils';

describe('utils', () => {
    test('isHexString()', () => {
        expect(isHexString('')).toBeFalsy;
        expect(isHexString('f')).toBeTruthy;
        expect(isHexString('F')).toBeTruthy;
        expect(isHexString('ff')).toBeTruthy;
        expect(isHexString('fF')).toBeTruthy;
        expect(isHexString('Ff')).toBeTruthy;
        expect(isHexString('FF')).toBeTruthy;
        expect(isHexString('oxff')).toBeFalsy;
        expect(isHexString('0xff')).toBeTruthy;
        expect(isHexString('0ff')).toBeTruthy;
        expect(isHexString('xff')).toBeFalsy;
        expect(isHexString(' 0xff')).toBeFalsy;
        expect(isHexString('0xff ')).toBeFalsy;
        expect(isHexString('0xf f')).toBeFalsy;
        expect(isHexString(' 0xff ')).toBeFalsy;
        expect(isHexString(' 0xf f ')).toBeFalsy;
        expect(isHexString('f f')).toBeFalsy;
    })
    test('strHasHexPrefix()', () => {
        expect(strHasHexPrefix('')).toBeFalsy;
        expect(strHasHexPrefix('f')).toBeFalsy;
        expect(strHasHexPrefix('F')).toBeFalsy;
        expect(strHasHexPrefix('ff')).toBeFalsy;
        expect(strHasHexPrefix('fF')).toBeFalsy;
        expect(strHasHexPrefix('Ff')).toBeFalsy;
        expect(strHasHexPrefix('FF')).toBeFalsy;
        expect(strHasHexPrefix('oxff')).toBeFalsy;
        expect(strHasHexPrefix('0xff')).toBeTruthy;
        expect(strHasHexPrefix('0ff')).toBeFalsy;
        expect(strHasHexPrefix('xff')).toBeFalsy;
        expect(strHasHexPrefix(' 0xff')).toBeFalsy;
        expect(strHasHexPrefix('0xff ')).toBeTruthy;
        expect(strHasHexPrefix('0xf f')).toBeTruthy;
        expect(strHasHexPrefix(' 0xff ')).toBeFalsy;
        expect(strHasHexPrefix(' 0xf f ')).toBeFalsy;
        expect(strHasHexPrefix('f f')).toBeFalsy;
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
        expect(()=>{importBinData(true)}).toThrow(new Error('Accepted binary data types: hex string, number[], Buffer, ArrayBuffer, ArrayBufferView'));
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
        expect(()=>{importBinData(testData, true)}).toThrow(new Error('outBuffer must be an ArrayBuffer, ArrayBufferView or Buffer'));
        expect(()=>{importBinData(testData, new Uint8Array(5), -1)}).toThrow(new Error('outOffset value out of bounds; value: -1'));
        expect(()=>{importBinData(testData, new Uint8Array(5), 10)}).toThrow(new Error('outOffset value out of bounds; value: 10'));
        expect(()=>{importBinData(testData, new Uint8Array(5), 4)}).toThrow(new Error('Not enough space in the provided outBuffer'));
    })
    test('hexEncode()', () => {
        //@ts-ignore
        expect(()=>{hexEncode(['str'])}).toThrow(new TypeError('Error hexencoding value: Data is not a numeric array'));
        expect(hexEncode([0,1,2,3, 255])).toEqual('00010203ff');
    })
})