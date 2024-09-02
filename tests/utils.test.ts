import {
    isHexString,
    strHasHexPrefix,
    normalizeHexString,
    hexToArrayBuffer,
    bufferToArrayBuffer,
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
    test('hexToArrayBuffer()', () => {
        //@ts-ignore
        expect(()=>{hexToArrayBuffer(true)}).toThrow();
        expect(Buffer.from(hexToArrayBuffer(''))).toEqual(Buffer.from([]));
        expect(Buffer.from(hexToArrayBuffer('f'))).toEqual(Buffer.from([15]));
        expect(Buffer.from(hexToArrayBuffer('F'))).toEqual(Buffer.from([15]));
        expect(Buffer.from(hexToArrayBuffer('ff'))).toEqual(Buffer.from([255]));
        expect(Buffer.from(hexToArrayBuffer('fF'))).toEqual(Buffer.from([255]));
        expect(Buffer.from(hexToArrayBuffer('Ff'))).toEqual(Buffer.from([255]));
        expect(Buffer.from(hexToArrayBuffer('FF'))).toEqual(Buffer.from([255]));
        expect(Buffer.from(hexToArrayBuffer('0xff'))).toEqual(Buffer.from([255]));
        expect(Buffer.from(hexToArrayBuffer('0x0ff'))).toEqual(Buffer.from([0, 255]));
        expect(Buffer.from(hexToArrayBuffer('0x1ff'))).toEqual(Buffer.from([1, 255]));
        expect(Buffer.from(hexToArrayBuffer('0ff'))).toEqual(Buffer.from([0, 255]));
        expect(Buffer.from(hexToArrayBuffer('0xf00ff'))).toEqual(Buffer.from([15, 0, 255]));
        expect(()=>{hexToArrayBuffer('oxff')}).toThrow();
        expect(()=>{hexToArrayBuffer(' 0xff')}).toThrow();
        expect(()=>{hexToArrayBuffer('0xf f')}).toThrow();
        expect(()=>{hexToArrayBuffer('0xff ')}).toThrow();
        expect(()=>{hexToArrayBuffer('0xf f ')}).toThrow();
    })
    test('bufferToArrayBuffer()', () => {
        expect(new Uint8Array(bufferToArrayBuffer(Buffer.from([])))).toEqual(new Uint8Array([]));
        expect(new Uint8Array(bufferToArrayBuffer(Buffer.from([1,2,3])))).toEqual(new Uint8Array([1,2,3]));
        expect(new Uint8Array(bufferToArrayBuffer(Buffer.from([256])))).toEqual(new Uint8Array([256]));
    })
    test('importBinData()', () => {
        expect(new Uint8Array(importBinData(''))).toEqual(new Uint8Array([]));
        expect(new Uint8Array(importBinData('0xf00ff'))).toEqual(new Uint8Array([15,0,255]));
        expect(new Uint8Array(importBinData('f00ff'))).toEqual(new Uint8Array([15,0,255]));
        expect(()=>{importBinData('f0x0ff')}).toThrow();
        expect(new Uint8Array(importBinData(Buffer.from([1,2,3])))).toEqual(new Uint8Array([1,2,3]));
        expect(new Uint8Array(importBinData(new Uint8Array([1,0,255]).buffer))).toEqual(new Uint8Array([1,0,255]));
        expect(new Uint8Array(importBinData(new Uint8Array([1,0,255])))).toEqual(new Uint8Array([1,0,255]));
        expect(new Uint8Array(importBinData(new Uint32Array([16842506])))).toEqual(new Uint8Array([0x0a, 0xff, 0x00, 0x01]));
        //@ts-ignore
        expect(()=>{importBinData([1,2,3, 'a'])}).toThrow();
        expect(new Uint8Array(importBinData([1,0,255,10]))).toEqual(new Uint8Array([1,0,255,10]));
        //@ts-ignore
        expect(()=>{importBinData(true)}).toThrow();
    })
})