import { hexToArray } from '../utils';
import CommandApdu from '../commandApdu';

const insByteList = {
    SELECT: 0xA4,
    GET_RESPONSE: 0xC0,
    // APPEND_RECORD: 0xe2,
    // ENVELOPE: 0xc2,
    // ERASE_BINARY: 0x0e,
    // EXTERNAL_AUTHENTICATE: 0x82,
    // GET_CHALLENGE: 0x84,
    // GET_DATA: 0xca,
    // INTERNAL_AUTHENTICATE: 0x88,
    // MANAGE_CHANNEL: 0x70,
    // PUT_DATA: 0xda,
    // READ_BINARY: 0xb0,
    // READ_RECORD: 0xb2,
    // UPDATE_BINARY: 0xd6,
    // UPDATE_RECORD: 0xdc,
    // VERIFY: 0x20,
    // WRITE_BINARY: 0xd0,
    // WRITE_RECORD: 0xd2,
};

// SELECT

interface ISelectOptions {
    /** P1 (Selection method); Default: `name`  
     * `id_0` - Select MF, DF or EF  
     * `id_1` - Select child DF  
     * `id_2` - Select EF under the current DF  
     * `id_3` - Select parent DF of the current DF  
     * `name` - Select by DF name  
     * `path_0` - Select by path  from the MF  
     * `path_1` - Select by path from the current DF  
     * `do_0` - Select DO in the current template  
     * `do_1` - Select parent DO of the constructed DO setting the current template  
    */
    selectBy?: 'id_0' | 'id_1' | 'id_2' | 'id_3' | 'name' | 'path_0' | 'path_1' | 'do_0' | 'do_1';
    /** P2 (File or DO occurrence); Default: `first`  
     * `first` - First or only occurrence  
     * `last` - Last occurrence  
     * `next` - Next occurrence  
     * `prev` - Previous occurrence  
    */
    occurence?: 'first' | 'last' | 'next' | 'prev';
    /** P2 (Response requirements); Default: `fci`  
     * `fci` - Return FCI template, optional use of FCI tag and length  
     * `cp` - Return CP template, mandatory use of CP tag and length  
     * `fmd` - Return FMD template, mandatory use of FMD tag and length; Return the tags belonging to the template set by the selection of a constructed DO as a tag list  
     * `le` - No response data if Le field absent, or proprietary if Le field present  */
    response?: 'fci' | 'cp' | 'fmd' | 'le';
}

export function select(data?: string | number[] | Buffer, opts: ISelectOptions = {}):CommandApdu {
    const cmd = new CommandApdu().setIns(insByteList.SELECT);

    if (typeof data !== 'undefined' && data.length > 0) {
        if (typeof data === 'string') {
            cmd.setData(hexToArray(data));
        } else if (Buffer.isBuffer(data) && data.length > 0) {
            cmd.setData([...data]);
        } else if (Array.isArray(data) && data.length > 0) {
            cmd.setData(data);
        }
    }

    // P1
    let p1 = 0x04; // default, select by name
    if (typeof opts.selectBy !== 'undefined') {
        p1 = 0x00;
        switch (opts.selectBy) {
            case 'id_0':
                break;
            case 'id_1':
                p1 |= 0x01;
                break;
            case 'id_2':
                p1 |= 0x02;
                break;
            case 'id_3':
                p1 |= 0x03;
                break;
            case 'name':
                p1 |= 0x04;
                break;
            case 'path_0':
                p1 |= 0x08;
                break;
            case 'path_1':
                p1 |= 0x09;
                break;
            case 'do_0':
                p1 |= 0x10;
                break;
            case 'do_1':
                p1 |= 0x13;
                break;
            default:
                break;
        }
    }
    cmd.setP1(p1);

    // P2
    let p2 = 0x00; // default, first or only, return fci template
    if (typeof opts.occurence !== 'undefined') {
        p2 &= 0x0C;
        switch (opts.occurence) {
            case 'first':
                break;
            case 'last':
                p2 |= 0x01;
                break;
            case 'next':
                p2 |= 0x02;
                break;
            case 'prev':
                p2 |= 0x03;
                break;
            default:
                break;
        }
    }
    if (typeof opts.response !== 'undefined') {
        p2 &= 0x03;
        switch (opts.response) {
            case 'fci':
                break;
            case 'cp':
                p2 |= 0x04;
                break;
            case 'fmd':
                p2 |= 0x08;
                break;
            case 'le':
                p2 |= 0x0C;
                break;
            default:
                break;
        }
    }
    cmd.setP2(p2);
    return cmd;
}

// GET RESPONSE
/**
 * @param le - number of bytes to get
 */
export function getResponse(le: number):CommandApdu {
    if (le < 0 || le > 255) {
        throw new Error('Wrong le value');
    }
    const cmd = new CommandApdu().setIns(insByteList.GET_RESPONSE).setLe(le);
    return cmd;
}
