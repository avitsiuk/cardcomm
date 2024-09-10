import { hexDecode } from '../src/utils';
import {
    BerObject,
} from '../src/ber/berObject';

11110001

const tlvHex = '6F1A840E315041592E5359532E4444463031A5088801025F2D02656E6F1A840E315041592E5359532E4444463031A5088801025F2D02656E';
const berObj = BerObject.parse(tlvHex, 28);

berObj.print((line: string) => {
    console.log(`>>${line}`);
});
