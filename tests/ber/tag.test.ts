import {
    decodeTag,
    encodeTag,
    Tag
} from '../../src/ber/tag';

describe('BER TAG', () => {
    test('class', () => {

        //@ts-ignore
        expect(()=>{Tag.from([0,1,2,'ff'])}).toThrow(new Error('Error decoding tag: Data is not a numeric array'));
        //@ts-ignore
        expect(()=>{Tag.from({class: -1, isConstructed: false, number: 0})}).toThrow(new Error('Error decoding tag: Accepted binary data types: hex string, number[], Buffer, ArrayBuffer, ArrayBufferView'));
        //@ts-ignore
        expect(()=>{Tag.from({class: 0, isConstructed: 'asd', number: 0})}).toThrow(new Error('Error decoding tag: Accepted binary data types: hex string, number[], Buffer, ArrayBuffer, ArrayBufferView'));
        //@ts-ignore
        expect(()=>{Tag.from({class: 0, isConstructed: false, number: -1})}).toThrow(new Error('Tag number value not allowed. Min: 0, max: 2097151, received: -1'));
        //@ts-ignore
        expect(()=>{Tag.from({class: 0, isConstructed: false, number: Number.MAX_SAFE_INTEGER})}).toThrow(new Error(`Number exceeds max allowed value of ${Tag.MAX_NUMBER}; received: ${Number.MAX_SAFE_INTEGER}`));
        expect(()=>{Tag.from('ff')}).toThrow(new Error('Error decoding tag: Unexpected end of data'));


        let tag: Tag = new Tag();
        expect(tag.toByteArray()).toEqual(new Uint8Array(0));
        expect(tag.byteLength).toEqual(0);
        expect(tag.toString()).toEqual('');
        expect(tag.hex).toEqual('');
        expect(tag.class).toEqual(0);
        expect(tag.className).toEqual('universal');
        expect(tag.isConstructed).toEqual(false);
        expect(tag.isPrimitive).toEqual(true);
        expect(tag.number).toEqual(0);

        tag = new Tag().from('00');
        expect(tag.toByteArray()).toEqual(new Uint8Array([0]));
        expect(tag.byteLength).toEqual(1);
        expect(tag.toString()).toEqual('00');
        expect(tag.hex).toEqual('00');
        expect(tag.class).toEqual(0);
        expect(tag.className).toEqual('universal');
        expect(tag.isConstructed).toEqual(false);
        expect(tag.isPrimitive).toEqual(true);
        expect(tag.number).toEqual(0);

        tag = Tag.from('001f81c07f01ff');
        expect(tag.toByteArray()).toEqual(new Uint8Array([0]));
        expect(tag.byteLength).toEqual(1);
        expect(tag.toString()).toEqual('00');
        expect(tag.hex).toEqual('00');
        expect(tag.class).toEqual(0);
        expect(tag.className).toEqual('universal');
        expect(tag.isConstructed).toEqual(false);
        expect(tag.isPrimitive).toEqual(true);
        expect(tag.number).toEqual(0);

        tag = Tag.from('001f81c07f01ff', 1);
        expect(tag.toByteArray()).toEqual(new Uint8Array([0x1F, 0x81, 0xC0, 0x7f]));
        expect(tag.byteLength).toEqual(4);
        expect(tag.toString()).toEqual('1f81c07f');
        expect(tag.hex).toEqual('1f81c07f');
        expect(tag.class).toEqual(0);
        expect(tag.className).toEqual('universal');
        expect(tag.isConstructed).toEqual(false);
        expect(tag.isPrimitive).toEqual(true);
        expect(tag.number).toEqual(24703);

        tag = Tag.from('ffbffe7f01ff');
        expect(tag.toByteArray()).toEqual(new Uint8Array([0xFF, 0xBF, 0xFE, 0x7f]));
        expect(tag.byteLength).toEqual(4);
        expect(tag.toString()).toEqual('ffbffe7f');
        expect(tag.hex).toEqual('ffbffe7f');
        expect(tag.class).toEqual(3);
        expect(tag.className).toEqual('private');
        expect(tag.isConstructed).toEqual(true);
        expect(tag.isPrimitive).toEqual(false);
        expect(tag.number).toEqual(1048447);

        tag = Tag.from(new Uint8Array([0x00, 0x1F, 0x81, 0xC0, 0x7f, 0x01, 0x00]), 1);
        expect(tag.toByteArray()).toEqual(new Uint8Array([0x1F, 0x81, 0xC0, 0x7f]));
        expect(tag.byteLength).toEqual(4);
        expect(tag.toString()).toEqual('1f81c07f');
        expect(tag.hex).toEqual('1f81c07f');
        expect(tag.class).toEqual(0);
        expect(tag.className).toEqual('universal');
        expect(tag.isConstructed).toEqual(false);
        expect(tag.isPrimitive).toEqual(true);
        expect(tag.number).toEqual(24703);

        tag = Tag.from(new Uint8Array([0xFF, 0x81, 0xC0, 0x7f, 0x01, 0x00]));
        expect(tag.toByteArray()).toEqual(new Uint8Array([0xFF, 0x81, 0xC0, 0x7f]));
        expect(tag.byteLength).toEqual(4);
        expect(tag.toString()).toEqual('ff81c07f');
        expect(tag.hex).toEqual('ff81c07f');
        expect(tag.class).toEqual(3);
        expect(tag.className).toEqual('private');
        expect(tag.isConstructed).toEqual(true);
        expect(tag.isPrimitive).toEqual(false);
        expect(tag.number).toEqual(24703);

        tag = Tag.from({class: 'application', isConstructed: true, number: 1});
        expect(tag.toByteArray()).toEqual(new Uint8Array([97]));
        expect(tag.byteLength).toEqual(1);
        expect(tag.toString()).toEqual('61');
        expect(tag.hex).toEqual('61');
        expect(tag.class).toEqual(1);
        expect(tag.className).toEqual('application');
        expect(tag.isConstructed).toEqual(true);
        expect(tag.isPrimitive).toEqual(false);
        expect(tag.number).toEqual(1);
    })
    test('decodeTag()', () => {
        //@ts-ignore
        expect(()=>{decodeTag(['asd'])}).toThrow(new Error('Error decoding binary data: Data is not a numeric array'));
        //@ts-ignore
        expect(()=>{decodeTag(['asd'])}).toThrow(new Error('Error decoding binary data: Data is not a numeric array'));
        //@ts-ignore
        expect(()=>{decodeTag([0], -1)}).toThrow(new Error('Start offset "-1" is outside of byte array range. Received byte array length: 1'));
        expect(()=>{decodeTag([0], 3)}).toThrow(new Error('Start offset "3" is outside of byte array range. Received byte array length: 1'));
        expect(()=>{decodeTag('ff')}).toThrow(new Error('Unexpected end of data'));
        expect(()=>{decodeTag('ff80808001')}).toThrow(new Error('Exceeded max allowed tag length of 4 bytes'));

        expect(decodeTag('001f81c07f01ff')).toEqual({class: 0, isConstructed: false, number: 0, byteLength: 1});
        expect(decodeTag('001f81c07f01ff', 1)).toEqual({class: 0, isConstructed: false, number: 24703, byteLength: 4});
        expect(decodeTag('ffbffe7f0100')).toEqual({class: 3, isConstructed: true, number: 1048447, byteLength: 4});
        expect(decodeTag('ff80010100')).toEqual({class: 3, isConstructed: true, number: 1, byteLength: 3});
        expect(decodeTag('ff010100')).toEqual({class: 3, isConstructed: true, number: 1, byteLength: 2});
        expect(decodeTag('e10100')).toEqual({class: 3, isConstructed: true, number: 1, byteLength: 1});

        expect(decodeTag(new Uint8Array([0x00, 0x1f, 0x81, 0xc0, 0x7f, 0x01, 0xff]))).toEqual({class: 0, isConstructed: false, number: 0, byteLength: 1});
        expect(decodeTag(new Uint8Array([0x00, 0x1f, 0x81, 0xc0, 0x7f, 0x01, 0xff]), 1)).toEqual({class: 0, isConstructed: false, number: 24703, byteLength: 4});
        expect(decodeTag(new Uint8Array([0xff, 0xbf, 0xfe, 0x7f, 0x01, 0x00]))).toEqual({class: 3, isConstructed: true, number: 1048447, byteLength: 4});
        expect(decodeTag(new Uint8Array([0xff, 0x80, 0x01, 0x01, 0x00]))).toEqual({class: 3, isConstructed: true, number: 1, byteLength: 3});
        expect(decodeTag(new Uint8Array([0xff, 0x01, 0x01, 0x00]))).toEqual({class: 3, isConstructed: true, number: 1, byteLength: 2});
        expect(decodeTag(new Uint8Array([0xe1, 0x01, 0x00]))).toEqual({class: 3, isConstructed: true, number: 1, byteLength: 1});
    })
    test('encodeTag()', () => {
        //@ts-ignore
        expect(()=>{encodeTag()}).toThrow(new Error('Unknown tag info format'));
        //@ts-ignore
        expect(()=>{encodeTag({class: 5, isConstructed: false, number: 0})}).toThrow(new Error('Unknown tag info format'));
        //@ts-ignore
        expect(()=>{encodeTag({class: 'asdasd', isConstructed: false, number: 0})}).toThrow(new Error('Unknown tag info format'));
        //@ts-ignore
        expect(()=>{encodeTag({class: 1, isConstructed: 5, number: 0})}).toThrow(new Error('Unknown tag info format'));
        //@ts-ignore
        expect(()=>{encodeTag({class: 1, isConstructed: true, number: Number.MAX_SAFE_INTEGER})}).toThrow(new Error(`Tag number value not allowed. Min: 0, max: ${Tag.MAX_NUMBER}, received: ${Number.MAX_SAFE_INTEGER}`));
        //@ts-ignore
        expect(()=>{encodeTag({class: 0, isConstructed: false, number: 0}, true)}).toThrow(new Error('outBuffer must be an ArrayBuffer, ArrayBufferView or Buffer'));

        expect(()=>{encodeTag({class: 0, isConstructed: false, number: Tag.MAX_NUMBER}, new Uint8Array(2))}).toThrow(new Error('Not enough space in the provided outBuffer'));
        expect(()=>{encodeTag({class: 0, isConstructed: false, number: Tag.MAX_NUMBER}, new Uint8Array(10), 9)}).toThrow(new Error('Not enough space in the provided outBuffer'));
        expect(()=>{encodeTag({class: 0, isConstructed: false, number: Tag.MAX_NUMBER}, new Uint8Array(10), -1)}).toThrow(new Error('outOffset value out of bounds; value: -1'));
        expect(()=>{encodeTag({class: 0, isConstructed: false, number: Tag.MAX_NUMBER}, new Uint8Array(10), 100)}).toThrow(new Error('outOffset value out of bounds; value: 100'));

        expect(encodeTag({class: 0, isConstructed: false, number: 0})).toEqual(new Uint8Array([0]));
        expect(encodeTag({class: 'universal', isConstructed: false, number: 0})).toEqual(new Uint8Array([0]));
        expect(encodeTag({class: 1, isConstructed: false, number: 0})).toEqual(new Uint8Array([0x40]));
        expect(encodeTag({class: 'application', isConstructed: false, number: 0})).toEqual(new Uint8Array([0x40]));
        expect(encodeTag({class: 2, isConstructed: false, number: 0})).toEqual(new Uint8Array([0x80]));
        expect(encodeTag({class: 'context-specific', isConstructed: false, number: 0})).toEqual(new Uint8Array([0x80]));
        expect(encodeTag({class: 3, isConstructed: false, number: 0})).toEqual(new Uint8Array([0xC0]));
        expect(encodeTag({class: 'private', isConstructed: false, number: 0})).toEqual(new Uint8Array([0xC0]));

        expect(encodeTag({class: 0, isConstructed: true, number: 0})).toEqual(new Uint8Array([0x20]));

        expect(encodeTag({class: 0, isConstructed: false, number: 1})).toEqual(new Uint8Array([0x01]));
        expect(encodeTag({class: 0, isConstructed: false, number: 30})).toEqual(new Uint8Array([0x1E]));
        expect(encodeTag({class: 0, isConstructed: false, number: 31})).toEqual(new Uint8Array([0x1F, 0x1F]));
        expect(encodeTag({class: 0, isConstructed: false, number: 127})).toEqual(new Uint8Array([0x1F, 0x7F]));

        expect(encodeTag({class: 0, isConstructed: false, number: 128})).toEqual(new Uint8Array([0x1F, 0x81, 0x00]));
        expect(encodeTag({class: 0, isConstructed: false, number: 24703})).toEqual(new Uint8Array([0x1F, 0x81, 0xC0, 0x7F]));
        expect(encodeTag({class: 0, isConstructed: false, number: 1048447})).toEqual(new Uint8Array([0x1F, 0xBF, 0xFE, 0x7F]));
        expect(encodeTag({class: 0, isConstructed: false, number: 2097151})).toEqual(new Uint8Array([0x1F, 0xFF, 0xFF, 0x7F]));

        let outBuffer = new ArrayBuffer(5);
        expect(encodeTag(
            {class: 0, isConstructed: false, number: 127},
            outBuffer,
        )).toEqual(new Uint8Array([0x1F, 0x7F]));
        expect(new Uint8Array(outBuffer)).toEqual(new Uint8Array([0x1f, 0x7f, 0, 0, 0]));

        outBuffer = new ArrayBuffer(5);
        expect(encodeTag(
            {class: 0, isConstructed: false, number: 127},
            outBuffer,
            1,
        )).toEqual(new Uint8Array([0x1F, 0x7F]));
        expect(new Uint8Array(outBuffer)).toEqual(new Uint8Array([0, 0x1f, 0x7f, 0, 0]));
    })
});