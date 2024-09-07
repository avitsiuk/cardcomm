import {
    Tag,
} from '../src/ber/tag';

function printTag(tag: Tag): void {
    console.log(`${tag.toString()} ${tag.className}:${tag.number} ${tag.isConstructed ? 'constructed' : 'primitive'}`);
}

const tlvHex = '6f5c8408a000000151000000a550734a06072a864886fc6b01600c060a2a864886fc6b02020201630906072a864886fc6b03640b06092a864886fc6b040255650b06092a864886fc6b020103660c060a2b060104012a026e01039f6501ff';

printTag(Tag.from('001f81c07f01ff', 1));
printTag(Tag.from('1fbffe7f01ff'));
printTag(Tag.from('6f00'));
printTag(Tag.from('7f8001'));
printTag(Tag.from('0000'));
printTag(Tag.from({class: 'application', isConstructed: true, number: 1}));
/*
1000000
*/

//    8   1    C   0    7   F
// 10000001 11000000 01111111
//  0000001  1000000  1111111
// 24703
//    B    F    F    E    7    F
// 1011 1111 1111 1110 0111 1111
//  011 1111  111 1110  111 1111
// 1048447

//    F    E    7    F
// 1111 1110 0111 1111
//  111 1110  111 1111
// 16255
// console.log(Tag.from('1FBFFE7F'));
// console.log(Tag.from('7F80800f'));
// console.log(Tag.from('6F'));

// console.log(hexEncode(encodeTag({class: 0, isConstructed: false, number: 1048447})))