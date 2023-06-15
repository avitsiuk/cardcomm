import CommandApdu from './commandApdu';

const insByteList = {
    APPEND_RECORD: 0xe2,
    ENVELOPE: 0xc2,
    ERASE_BINARY: 0x0e,
    EXTERNAL_AUTHENTICATE: 0x82,
    GET_CHALLENGE: 0x84,
    GET_DATA: 0xca,
    GET_RESPONSE: 0xc0,
    INTERNAL_AUTHENTICATE: 0x88,
    MANAGE_CHANNEL: 0x70,
    PUT_DATA: 0xda,
    READ_BINARY: 0xb0,
    READ_RECORD: 0xb2,
    SELECT_FILE: 0xa4,
    UPDATE_BINARY: 0xd6,
    UPDATE_RECORD: 0xdc,
    VERIFY: 0x20,
    WRITE_BINARY: 0xd0,
    WRITE_RECORD: 0xd2,
};

class SelectFile extends CommandApdu {
    constructor() {
        super();
        this.setClaByte(insByteList.SELECT_FILE);
    }
}

export namespace Iso7816Commands {
    SelectFile;
}

export default Iso7816Commands;
