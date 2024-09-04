// import { hexToArrayBuffer, arrayToHex, } from '../src/utils';

const t1 = new Uint8Array(0);
console.log(t1.BYTES_PER_ELEMENT);
const t2 = new Uint16Array(0);
console.log(t2.BYTES_PER_ELEMENT);
const t3 = new Uint32Array(0);
console.log(t3.BYTES_PER_ELEMENT);


// type TTlvTagClassNumber = 0 | 1 | 2 | 3;
// type TTlvTagClassName = 'universal' | 'application' | 'context-specific' | 'private';

// /** TLV tag class numeric value from name */
// const tlvClassNumber: Readonly<{[key in TTlvTagClassName]: TTlvTagClassNumber}> = {
//     'universal': 0,
//     'application': 1,
//     'context-specific': 2,
//     'private': 3,
// }

// /** TLV tag class name from numeric value */
// const tlvClassName: Readonly<{[key in TTlvTagClassNumber]: TTlvTagClassName}> = [
//     'universal',
//     'application',
//     'context-specific',
//     'private',
// ]

// const MAX_TAG_NUMBER = 268435455;

// export enum TagClass {
//     /** This class is assigned to tags defined in the ASN.1 standard */
//     UNIVERSAL,
//     /** Application class tags were intended to uniquely identify a type within a particular application. Some application layer standards use these tags extensively to name their types */
//     APPLICATION,
//     /** Context-specific class tags are used with types that need to be identified only within some specific, well-defined context. For example, a type that needs to be uniquely identifiable within a sequence of other types might be assigned a context-specific tag */
//     CONTEXT,
//     /** A particular company, for example, may choose to define several types with private class tags for use in a number of their common applications */
//     PRIVATE,
// }

// /** Information about a BER TLV tag */
// interface ITagInfo {
//     /** One of four classes: 'universal'(0), 'application'(1), 'context-specific'(2), 'private'(3) */
//     class: TTlvTagClassNumber;
//     /**Primitive tags contain unstructured binary data; constructed tags wrap other ber-tlv objects */
//     constructed: boolean;
//     /** Tag unsigned integer identifier */
//     number: number;
// }

// type TDecodeTagResults = {
//     /** Info about decoded tag */
//     tag: ITagInfo
//     /** End byte of the decoded tag (exclusive) */
//     end: number,
// };

// /**
//  * @param inBuffer - BET Tlv bytes
//  * @param start - offset at which to start decoding process (inclusive); default: 0
//  */
// function decodeTag(inBuffer: ArrayBuffer, start: number = 0): TDecodeTagResults {
//     if(start < 0 || (start >= inBuffer.byteLength))
//         throw new RangeError('Start offset outside byte array boundaries');
//     if(inBuffer.byteLength < 1 || (inBuffer.byteLength - start) < 1)
//         throw new Error(`No data to decode starting from offset ${start}`);
//     const result: TDecodeTagResults = { end: 0, tag: { class: 0, constructed: false, number: 0 }};
//     const inBufferView = new Uint8Array(inBuffer).subarray(start);
//     result.tag.class = (inBufferView[0] >> 6) as TTlvTagClassNumber;
//     result.tag.constructed = (inBufferView[0] & 0x20) > 0;
//     result.tag.number = inBufferView[0] & 0x1f;
//     let relativeTagEnd = 1;
//     if (result.tag.number < 0x1f) { // number < 31, 1 byte tag
//         result.end = start + relativeTagEnd;
//         return result;
//     }
//     // number >= 31, number encoded in subsequent bytes
//     while(true) {
//         if ((start + relativeTagEnd) >= inBuffer.byteLength)
//             throw new Error('Unexpected end of data');
//         if (relativeTagEnd > 4)
//             throw new Error('Exceeded max allowed length (5 bytes)');
//         if((inBufferView[relativeTagEnd] & 0x80) === 0) break;
//         relativeTagEnd++;
//     }
//     relativeTagEnd++;
//     result.end = start + relativeTagEnd;
//     result.tag.number = [...inBufferView.subarray(1, relativeTagEnd)].reverse()
//         .reduce((tagNumber, val, i) => {
//             return (tagNumber | ((val & 0x7f) << (7 * i)));
//         }, 0);
//     return result;
// }

// const tlvHex = '6f5c8408a000000151000000a550734a06072a864886fc6b01600c060a2a864886fc6b02020201630906072a864886fc6b03640b06092a864886fc6b040255650b06092a864886fc6b020103660c060a2b060104012a026e01039f6501ff1f81828304001fffffff7f00';

// 0 = 6f
// 2 = 84
// 12 = a5
// 90 = 9f65
// 94 = 1f81828304
// 100 = 1f8080808001
// 10011111 01100101

// const tlvData = hexToArrayBuffer(tlvHex);

// console.log(decodeTag(tlvData));
// console.log(decodeTag(tlvData, 2));
// console.log(decodeTag(tlvData, 12));
// console.log(decodeTag(tlvData, 90));
// console.log(decodeTag(tlvData, 94));
// console.log(decodeTag(tlvData, 100));



// type ITlvSimpleTagPrimitive = {
//     tag: string; // hex value
//     value: Uint8Array;
// }
// type ITlvSimpleTagConstructed = {
//     tag: string; // hex value
//     value: (ITlvSimpleTagConstructed | ITlvSimpleTagPrimitive)[];
// }

// function isConstructed(tag: ITlvSimpleTagConstructed | ITlvSimpleTagPrimitive): tag is ITlvSimpleTagConstructed {
//     return true
// }
// function isPrimitive(tag: ITlvSimpleTagConstructed | ITlvSimpleTagPrimitive): tag is ITlvSimpleTagPrimitive {
//     return true
// }

// type ITlvSimpleObject = (ITlvSimpleTagConstructed | ITlvSimpleTagPrimitive)[];

// function decodeTlv(data: string | number[] | Buffer | ArrayBuffer | ArrayBufferView): ITlvSimpleObject {
//     return [];
// }

// inte


// const tlvHex = '6f5c8408a000000151000000a550734a06072a864886fc6b01600c060a2a864886fc6b02020201630906072a864886fc6b03640b06092a864886fc6b040255650b06092a864886fc6b020103660c060a2b060104012a026e01039f6501ff';

// const obj = decodeTlv(tlvHex);

// const t = obj[1];

// if (t.constructed) {
//     const t1 = t.value[0];
//     if (t1.constructed) {
//         //
//     }
// }else{
//     const t1 = t.value
// }

// console.log(tlvHex);