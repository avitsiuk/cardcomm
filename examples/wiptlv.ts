import { hexEncode, importBinData, TBinData } from '../src/utils';
import {
    Tag,
} from '../src/ber/tag';
import {
    BerObject,
} from '../src/ber/berObject';

// function printTag(tag: Tag): void {
//     console.log(`${tag.toString()} (${tag.className}:${tag.number} ${tag.isConstructed ? 'constructed' : 'primitive'})`);
// }

// export class Ber implements IBerObj {
//     static from(input?: TBinData | IBerObjInfo | Ber): Ber {
//         return new Ber(input);
//     }

//     constructor(input?: TBinData | IBerObjInfo | Ber) {
//         if (typeof input === 'undefined') {
//             return this;
//         }
//         return this.from(input);
//     }

//     from(input: TBinData | IBerObjInfo | Ber): this {
//         return this;
//     }
// }

// export default Ber;

const tlvHex = '6F1A840E315041592E5359532E4444463031A5088801025F2D02656E6F1A840E315041592E5359532E4444463031A5088801025F2D02656E';
const berObj = BerObject.create({tag: new Tag(), value: [
    {tag: '6f', value: '840E315041592E5359532E4444463031A5088801025F2D02656E'}
]});

console.log(berObj);

if (berObj.isConstructed()) {
    console.log(berObj.value[0].tag);
}
// printTag(Tag.from('001f81c07f01ff', 1));
// printTag(Tag.from('1fbffe7f01ff'));
// printTag(Tag.from('6f00'));
// printTag(Tag.from('7f8001'));
// printTag(Tag.from('0000'));
// printTag(Tag.from({class: 'application', isConstructed: true, number: 1}));
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
