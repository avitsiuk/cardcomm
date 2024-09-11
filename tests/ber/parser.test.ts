import { Tag } from '../../src/ber/tag';
import { parseBer } from '../../src/ber/parser';

function f1() {
    const t = new Array<Number>(1000);
    for (let i = 0; i < 1000; i++) {
        t[i] = i;
    }
}

function f2() {
    const t = new Array<Number>(0);
    for (let i = 0; i < 1000; i++) {
        t.push(i);
    }
}

describe('parser', () => {
    test('parseBer()', () => {
        //@ts-ignore
        expect(()=>{parseBer(true)}).toThrow(new Error('Error decoding binary data: Accepted binary data types: hex string, number[], ArrayBuffer, ArrayBufferView'));
        expect(()=>{parseBer('6F00', 2)}).toThrow(new Error('Start offset "2" is outside of byte array range. Received byte array length: 2'));
        expect(()=>{parseBer('6F85')}).toThrow(new Error('Error parsing length: Length field must be at most 5 bytes long'));
        expect(()=>{parseBer('6F01')}).toThrow(new Error('Unexpected end of data'));
        expect(()=>{parseBer('1Fffffffff00')}).toThrow(new Error('Error parsing tag: Exceeded max allowed tag length of 4 bytes'));
        expect(()=>{parseBer('2f071f8080800101ff')}).toThrow(new Error('Error parsing tag: Exceeded max allowed tag length of 4 bytes'));

        expect(parseBer('0000')).toEqual([{tag: Tag.from('00'), length: 0, value: new Uint8Array(0)}]);
        expect(parseBer('0f01ff')).toEqual([{tag: Tag.from('0f'), length: 1, value: new Uint8Array([255])}]);
        expect(parseBer('0f8101ff')).toEqual([{tag: Tag.from('0f'), length: 1, value: new Uint8Array([255])}]);
        expect(parseBer('0f8400000001ff')).toEqual([{tag: Tag.from('0f'), length: 1, value: new Uint8Array([255])}]);
        expect(parseBer('2f030f01ff2f052f030f01ff')).toEqual([
            { tag: Tag.from('2f'), length: 3, value: [
                    {tag: Tag.from('0f'), length: 1, value: new Uint8Array([255])}
            ]},
            { tag: Tag.from('2f'), length: 5, value: [
                {tag: Tag.from('2f'), length: 3, value: [
                    {tag: Tag.from('0f'), length: 1, value: new Uint8Array([255])}
                ]}
            ]}
        ]);
    })
})