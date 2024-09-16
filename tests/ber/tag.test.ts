import {
    Tag
} from '../../src/ber/tag';

describe('BER TAG', () => {
    test('class', () => {
        //@ts-ignore
        expect(()=>{Tag.from([0,1,2,'ff'])}).toThrow(new Error('Error parsing tag: Data is not a numeric array'));
        //@ts-ignore
        expect(()=>{Tag.from({class: -1, isConstructed: false, number: 0})}).toThrow(new Error('Error parsing tag: Accepted binary data types: hex string, number[], ArrayBuffer, ArrayBufferView'));
        //@ts-ignore
        expect(()=>{Tag.from({class: 0, isConstructed: 'asd', number: 0})}).toThrow(new Error('Error parsing tag: Accepted binary data types: hex string, number[], ArrayBuffer, ArrayBufferView'));
        //@ts-ignore
        expect(()=>{Tag.from({class: 0, isConstructed: false, number: -1})}).toThrow(new Error('Tag number value not allowed. Min: 0, max: 2097151, received: -1'));
        //@ts-ignore
        expect(()=>{Tag.from({class: 0, isConstructed: false, number: Number.MAX_SAFE_INTEGER})}).toThrow(new Error(`Error parsing tag: Number exceeds max allowed value of ${Tag.MAX_NUMBER}; received: ${Number.MAX_SAFE_INTEGER}`));
        expect(()=>{Tag.from('ff')}).toThrow(new Error('Error parsing tag: Unexpected end of data'));


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

        tag = Tag.root;
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

        let tag2 = Tag.from(tag);
        expect(tag2.toByteArray()).toEqual(new Uint8Array([97]));
        expect(tag2.byteLength).toEqual(1);
        expect(tag2.toString()).toEqual('61');
        expect(tag2.hex).toEqual('61');
        expect(tag2.class).toEqual(1);
        expect(tag2.className).toEqual('application');
        expect(tag2.isConstructed).toEqual(true);
        expect(tag2.isPrimitive).toEqual(false);
        expect(tag2.number).toEqual(1);
    })
});