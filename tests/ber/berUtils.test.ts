import {
    MAX_TAG_SAFE_NUMBER,
    MAX_TAG_BYTE_LENGTH,
    MAX_LEN_BYTE_LENGTH,
    MAX_LEN_SAFE_NUMBER,
    parseTag,
    serializeTag,
    parseLength,
    serializeLength,
} from '../../src/ber/berUtils';

describe('BER utils', () => {
    test('parseTag()', () => {
        //@ts-ignore
        expect(()=>{parseTag(['asd'])}).toThrow(new Error('Error decoding binary data: Data is not a numeric array'));
        //@ts-ignore
        expect(()=>{parseTag(['asd'])}).toThrow(new Error('Error decoding binary data: Data is not a numeric array'));
        //@ts-ignore
        expect(()=>{parseTag([0], -1)}).toThrow(new Error('Start offset "-1" is outside of byte array range. Received byte array length: 1'));
        expect(()=>{parseTag([0], 3)}).toThrow(new Error('Start offset "3" is outside of byte array range. Received byte array length: 1'));
        expect(()=>{parseTag('ff')}).toThrow(new Error('Unexpected end of data'));
        expect(()=>{parseTag('ff80808001')}).toThrow(new Error(`Exceeded max allowed tag length of ${MAX_TAG_BYTE_LENGTH} bytes`));

        expect(parseTag('001f81c07f01ff')).toEqual({class: 0, isConstructed: false, number: 0, byteLength: 1});
        expect(parseTag('001f81c07f01ff', 1)).toEqual({class: 0, isConstructed: false, number: 24703, byteLength: 4});
        expect(parseTag('ffbffe7f0100')).toEqual({class: 3, isConstructed: true, number: 1048447, byteLength: 4});
        expect(parseTag('ff80010100')).toEqual({class: 3, isConstructed: true, number: 1, byteLength: 3});
        expect(parseTag('ff010100')).toEqual({class: 3, isConstructed: true, number: 1, byteLength: 2});
        expect(parseTag('e10100')).toEqual({class: 3, isConstructed: true, number: 1, byteLength: 1});

        expect(parseTag(new Uint8Array([0x00, 0x1f, 0x81, 0xc0, 0x7f, 0x01, 0xff]))).toEqual({class: 0, isConstructed: false, number: 0, byteLength: 1});
        expect(parseTag(new Uint8Array([0x00, 0x1f, 0x81, 0xc0, 0x7f, 0x01, 0xff]), 1)).toEqual({class: 0, isConstructed: false, number: 24703, byteLength: 4});
        expect(parseTag(new Uint8Array([0xff, 0xbf, 0xfe, 0x7f, 0x01, 0x00]))).toEqual({class: 3, isConstructed: true, number: 1048447, byteLength: 4});
        expect(parseTag(new Uint8Array([0xff, 0x80, 0x01, 0x01, 0x00]))).toEqual({class: 3, isConstructed: true, number: 1, byteLength: 3});
        expect(parseTag(new Uint8Array([0xff, 0x01, 0x01, 0x00]))).toEqual({class: 3, isConstructed: true, number: 1, byteLength: 2});
        expect(parseTag(new Uint8Array([0xe1, 0x01, 0x00]))).toEqual({class: 3, isConstructed: true, number: 1, byteLength: 1});
    })
    test('serializeTag()', () => {
        //@ts-ignore
        expect(()=>{serializeTag()}).toThrow(new Error('Unknown tag info format'));
        //@ts-ignore
        expect(()=>{serializeTag({class: 5, isConstructed: false, number: 0})}).toThrow(new Error('Unknown tag info format'));
        //@ts-ignore
        expect(()=>{serializeTag({class: 'asdasd', isConstructed: false, number: 0})}).toThrow(new Error('Unknown tag info format'));
        //@ts-ignore
        expect(()=>{serializeTag({class: 1, isConstructed: 5, number: 0})}).toThrow(new Error('Unknown tag info format'));
        //@ts-ignore
        expect(()=>{serializeTag({class: 1, isConstructed: true, number: Number.MAX_SAFE_INTEGER})}).toThrow(new Error(`Tag number value not allowed. Min: 0, max: ${MAX_TAG_SAFE_NUMBER}, received: ${Number.MAX_SAFE_INTEGER}`));
        //@ts-ignore
        expect(()=>{serializeTag({class: 0, isConstructed: false, number: 0}, true)}).toThrow(new Error('outBuffer must be an ArrayBuffer or ArrayBufferView'));

        expect(()=>{serializeTag({class: 0, isConstructed: false, number: MAX_TAG_SAFE_NUMBER}, new Uint8Array(2))}).toThrow(new Error('Not enough space in the provided outBuffer'));
        expect(()=>{serializeTag({class: 0, isConstructed: false, number: MAX_TAG_SAFE_NUMBER}, new Uint8Array(10), 9)}).toThrow(new Error('Not enough space in the provided outBuffer'));
        expect(()=>{serializeTag({class: 0, isConstructed: false, number: MAX_TAG_SAFE_NUMBER}, new Uint8Array(10), -1)}).toThrow(new Error('outOffset value out of bounds; value: -1'));
        expect(()=>{serializeTag({class: 0, isConstructed: false, number: MAX_TAG_SAFE_NUMBER}, new Uint8Array(10), 100)}).toThrow(new Error('outOffset value out of bounds; value: 100'));

        expect(serializeTag({class: 0, isConstructed: false, number: 0})).toEqual(new Uint8Array([0]));
        expect(serializeTag({class: 'universal', isConstructed: false, number: 0})).toEqual(new Uint8Array([0]));
        expect(serializeTag({class: 1, isConstructed: false, number: 0})).toEqual(new Uint8Array([0x40]));
        expect(serializeTag({class: 'application', isConstructed: false, number: 0})).toEqual(new Uint8Array([0x40]));
        expect(serializeTag({class: 2, isConstructed: false, number: 0})).toEqual(new Uint8Array([0x80]));
        expect(serializeTag({class: 'context-specific', isConstructed: false, number: 0})).toEqual(new Uint8Array([0x80]));
        expect(serializeTag({class: 3, isConstructed: false, number: 0})).toEqual(new Uint8Array([0xC0]));
        expect(serializeTag({class: 'private', isConstructed: false, number: 0})).toEqual(new Uint8Array([0xC0]));

        expect(serializeTag({class: 0, isConstructed: true, number: 0})).toEqual(new Uint8Array([0x20]));

        expect(serializeTag({class: 0, isConstructed: false, number: 1})).toEqual(new Uint8Array([0x01]));
        expect(serializeTag({class: 0, isConstructed: false, number: 30})).toEqual(new Uint8Array([0x1E]));
        expect(serializeTag({class: 0, isConstructed: false, number: 31})).toEqual(new Uint8Array([0x1F, 0x1F]));
        expect(serializeTag({class: 0, isConstructed: false, number: 127})).toEqual(new Uint8Array([0x1F, 0x7F]));

        expect(serializeTag({class: 0, isConstructed: false, number: 128})).toEqual(new Uint8Array([0x1F, 0x81, 0x00]));
        expect(serializeTag({class: 0, isConstructed: false, number: 24703})).toEqual(new Uint8Array([0x1F, 0x81, 0xC0, 0x7F]));
        expect(serializeTag({class: 0, isConstructed: false, number: 1048447})).toEqual(new Uint8Array([0x1F, 0xBF, 0xFE, 0x7F]));
        expect(serializeTag({class: 0, isConstructed: false, number: 2097151})).toEqual(new Uint8Array([0x1F, 0xFF, 0xFF, 0x7F]));

        let outBuffer = new ArrayBuffer(5);
        expect(serializeTag({class: 0, isConstructed: false, number: 127}, outBuffer)).toEqual(new Uint8Array([0x1F, 0x7F]));
        expect(new Uint8Array(outBuffer)).toEqual(new Uint8Array([0x1f, 0x7f, 0, 0, 0]));

        outBuffer = new ArrayBuffer(5);
        expect(serializeTag({class: 0, isConstructed: false, number: 127}, outBuffer, 1)).toEqual(new Uint8Array([0x1F, 0x7F]));
        expect(new Uint8Array(outBuffer)).toEqual(new Uint8Array([0, 0x1f, 0x7f, 0, 0]));
    })
    test('parseLength()', () => {
        //@ts-ignore
        expect(()=>{parseLength(true)}).toThrow(new Error('Error decoding binary data: Accepted binary data types: hex string, number[], ArrayBuffer, ArrayBufferView'));
        //@ts-ignore
        expect(()=>{parseLength('')}).toThrow(new Error('Unexpected end of data'));
        expect(()=>{parseLength('00', -1)}).toThrow(new Error('Start offset "-1" is outside of byte array range. Received byte array length: 1'));
        expect(()=>{parseLength('00', 10)}).toThrow(new Error('Start offset "10" is outside of byte array range. Received byte array length: 1'));
        expect(()=>{parseLength('85')}).toThrow(new Error(`Length field must be at most ${MAX_LEN_BYTE_LENGTH} bytes long`));
        expect(()=>{parseLength('84')}).toThrow(new Error('Unexpected end of data'));

        expect(parseLength('80')).toEqual({value: -1, byteLength: 1}); // indefinite length format
        expect(parseLength('00')).toEqual({value: 0, byteLength: 1});
        expect(parseLength('01')).toEqual({value: 1, byteLength: 1});
        expect(parseLength('7F')).toEqual({value: 127, byteLength: 1});
        expect(parseLength('8180')).toEqual({value: 128, byteLength: 2});
        expect(parseLength('820080')).toEqual({value: 128, byteLength: 3});
        expect(parseLength('83000080')).toEqual({value: 128, byteLength: 4});
        expect(parseLength('8400000080')).toEqual({value: 128, byteLength: 5});
        expect(parseLength('8400000000')).toEqual({value: 0, byteLength: 5});
        expect(parseLength('8400000001')).toEqual({value: 1, byteLength: 5});
        expect(parseLength('84FFFFFFFF')).toEqual({value: 4294967295, byteLength: 5});
    })
    test('serializeTag()', () => {
        //@ts-ignore
        expect(()=>{serializeLength(0, true)}).toThrow(new Error('outBuffer must be an ArrayBuffer or ArrayBufferView'));
        expect(()=>{serializeLength(-2)}).toThrow(new Error(`Length value not allowed. Min: 0, max: ${MAX_LEN_SAFE_NUMBER}, received: -2`));
        expect(()=>{serializeLength(MAX_LEN_SAFE_NUMBER + 1)}).toThrow(new Error(`Length value not allowed. Min: 0, max: ${MAX_LEN_SAFE_NUMBER}, received: ${MAX_LEN_SAFE_NUMBER + 1}`));
        expect(()=>{serializeLength(0, new Uint8Array(0))}).toThrow(new Error('Not enough space in the provided outBuffer'));
        expect(()=>{serializeLength(0, new Uint8Array(1), -1)}).toThrow(new Error('outOffset value out of bounds; value: -1'));
        expect(()=>{serializeLength(0, new Uint8Array(1), 10)}).toThrow(new Error('outOffset value out of bounds; value: 10'));
        expect(()=>{serializeLength(0x84, new Uint8Array(1))}).toThrow(new Error('Not enough space in the provided outBuffer'));
        expect(()=>{serializeLength(0x84, new Uint8Array(10), 9)}).toThrow(new Error('Not enough space in the provided outBuffer'));

        expect(serializeLength(0)).toEqual(new Uint8Array([0]));
        expect(serializeLength(1)).toEqual(new Uint8Array([1]));
        expect(serializeLength(127)).toEqual(new Uint8Array([127]));
        expect(serializeLength(4294967295)).toEqual(new Uint8Array([0x84, 0xFF, 0xFF, 0xFF, 0xFF]));

        let ab = new ArrayBuffer(5);
        expect(serializeLength(1, ab)).toEqual(new Uint8Array([1]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([1,0,0,0,0]))
        ab = new ArrayBuffer(5);
        expect(serializeLength(128, ab)).toEqual(new Uint8Array([0x81, 128]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([0x81, 128,0,0,0]))

        ab = new ArrayBuffer(5);
        expect(serializeLength(1, ab, 2)).toEqual(new Uint8Array([1]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([0,0,1,0,0]))
        ab = new ArrayBuffer(5);
        expect(serializeLength(128, ab, 2)).toEqual(new Uint8Array([0x81, 128]));
        expect(new Uint8Array(ab)).toEqual(new Uint8Array([0, 0, 0x81, 128,0]))
    })
})