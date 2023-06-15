import { arrayToHex } from "./utils";

const NORM_PROC = 'Normal processing';
const WARN_PROC = 'Warning processing';
const EXEC_ERR = 'Execution error';
const CHCK_ERR = 'Checking error';
const NVM_U = 'State of non-volatile memory is unchanged';
const NVM_C = 'State of non-volatile memory may have changed';

function unkSw2(sw2: number): string {
    return `Unknown SW2: [0x${arrayToHex([sw2], false)}]`;
}

const meanings: {[key: string]: (sw2: number) => string} = {
    // NORMAL PROCESSING
    '^9000$': (sw2) => {
        return NORM_PROC;
    },
    '^61(.{2})$': (sw2) => {
        return `${NORM_PROC}; ${sw2} response bytes still available`;
    },
    // WARNING PROCESSING
    '^62(.{2})$': (sw2) => {
        let msg = `${WARN_PROC}; ${NVM_U}`;
        switch (true) {
            case sw2 == 0x00:
                msg += '; No further info';
                break;
            case sw2 >= 0x02 && sw2 <= 0x80:
                msg += `; Card wants to send at least one more query of ${sw2} bytes`;
                break;
            case sw2 == 0x81:
                msg += '; Part of returned data may be corrupted';
                break;
            case sw2 == 0x82:
                msg += '; End of file or record reached before reading Ne bytes, or unsuccessful search';
                break;
            case sw2 == 0x83:
                msg += '; Selected file deactivated';
                break;
            case sw2 == 0x84:
                msg += '; File or data control information not formatted properly';
                break;
            case sw2 == 0x85:
                msg += '; Selected file in termination state';
                break;
            case sw2 == 0x86:
                msg += '; No input data available from a sensor on the card';
                break;
            case sw2 == 0x87:
                msg += '; At least one of the referenced records is deactivated';
                break;
            default:
                msg += `; ${unkSw2(sw2)}`;
                break;
        }
        return msg;
    },
    '^63(.{2})$': (sw2) => {
        let msg = `${WARN_PROC}; ${NVM_C}`;
        switch (true) {
            case sw2 == 0x00:
                msg += '; No further info';
                break;
            case sw2 == 0x40:
                msg += '; Unsuccessful comparison (exact meaning depends on the command)';
                break;
            case sw2 == 0x81:
                msg += '; File filled up by the last write';
                break;
            case sw2 >= 0xC0 && sw2 <= 0xCF:
                msg += `; Counter: ${sw2 & 15} (exact meaning depends on the command)`;
                break;
            default:
                msg += `; ${unkSw2(sw2)}`;
                break;
        }
        return msg;
    },
    // EXECUTION ERROR
    '^64(.{2})$': (sw2) => {
        let msg = `${EXEC_ERR}; ${NVM_U}`;
        switch (true) {
            case sw2 == 0x00:
                msg += '; No further info';
                break;
            case sw2 == 0x01:
                msg += '; Immediate response required by the card';
                break;
            case sw2 >= 0x02 && sw2 <= 0x80:
                msg += `; Card wants to send at least one more query of ${sw2} bytes`;
                break;
            case sw2 == 0x81:
                msg += '; Logical channel shared access denied';
                break;
            case sw2 == 0x82:
                msg += `; Logical channel opening denied`;
                break;
            default:
                msg += `; ${unkSw2(sw2)}`;
                break;
        }
        return msg;
    },
    '^65(.{2})$': (sw2) => {
        let msg = `${EXEC_ERR}; ${NVM_C}`;
        switch (true) {
            case sw2 == 0x00:
                msg += '; No further info';
                break;
            case sw2 == 0x81:
                msg += '; Memory failure';
                break;
            default:
                msg += `; ${unkSw2(sw2)}`;
                break;
        }
        return msg;
    },
    '^66(.{2})$': (sw2) => {
        let msg = `${EXEC_ERR}; Security-related issues`;
        switch (true) {
            case sw2 == 0x00:
                msg += '; No further info';
                break;
            default:
                msg += `; ${unkSw2(sw2)}`;
                break;
        }
        return msg;
    },
    // CHECKING ERROR
    '^67(.{2})$': (sw2) => {
        let msg = `${CHCK_ERR}; Wrong length`;
        switch (true) {
            case sw2 == 0x00:
                msg += '; No further info';
                break;
            case sw2 == 0x01:
                msg += '; Command APDU format not compliant with standard';
                break;
            case sw2 == 0x02:
                msg += '; The value of Lc is not the one expected';
                break;
            default:
                msg += `; ${unkSw2(sw2)}`;
                break;
        }
        return msg;
    },
    '^68(.{2})$': (sw2) => {
        let msg = `${CHCK_ERR}; Functions in CLA not supported`;
        switch (true) {
            case sw2 == 0x00:
                msg += '; No further info';
                break;
            case sw2 == 0x81:
                msg += '; Logical channel not supported';
                break;
            case sw2 == 0x82:
                msg += '; Secure messaging not supported';
                break;
            case sw2 == 0x83:
                msg += '; Last command of the chain expected';
                break;
            case sw2 == 0x84:
                msg += '; Command chaining not supported';
                break;
            default:
                msg += `; ${unkSw2(sw2)}`;
                break;
        }
        return msg;
    },
    '^69(.{2})$': (sw2) => {
        let msg = `${CHCK_ERR}; Command not allowed`;
        switch (true) {
            case sw2 == 0x00:
                msg += '; No further info';
                break;
            case sw2 == 0x81:
                msg += '; Command incompatible with file structure';
                break;
            case sw2 == 0x82:
                msg += '; Security status not satisfied';
                break;
            case sw2 == 0x83:
                msg += '; Authentication method blocked';
                break;
            case sw2 == 0x84:
                msg += '; Reference data not usable';
                break;
            case sw2 == 0x85:
                msg += '; Conditions of use not satisfied';
                break;
            case sw2 == 0x86:
                msg += '; Command not allowed (no current EF)';
                break;
            case sw2 == 0x87:
                msg += '; Expected secure messaging DOs missing';
                break;
            case sw2 == 0x88:
                msg += '; Incorrect secure messaging DOs';
                break;
            default:
                msg += `; ${unkSw2(sw2)}`;
                break;
        }
        return msg;
    },
    '^6[A,a](.{2})$': (sw2) => {
        let msg = `${CHCK_ERR}; Wrong parameters P1-P2`;
        switch (true) {
            case sw2 == 0x00:
                msg += '; No further info';
                break;
            case sw2 == 0x80:
                msg += '; Incorrect parameters in the command data field';
                break;
            case sw2 == 0x81:
                msg += '; Function not supported';
                break;
            case sw2 == 0x82:
                msg += '; File or application not found';
                break;
            case sw2 == 0x83:
                msg += '; Record not found';
                break;
            case sw2 == 0x84:
                msg += '; Not enough memory space in the file';
                break;
            case sw2 == 0x85:
                msg += '; Nc inconsistent with TLV structure';
                break;
            case sw2 == 0x86:
                msg += '; Incorrect parameters P1-P2';
                break;
            case sw2 == 0x87:
                msg += '; Nc inconsistent with parameters P1-P2';
                break;
            case sw2 == 0x88:
                msg += '; Referenced data or reference data not found (exact meaning depending on the command)';
                break;
            case sw2 == 0x89:
                msg += '; File already exists';
                break;
            case sw2 == 0x8A:
                msg += '; DF name already exists';
                break;
            default:
                msg += `; ${unkSw2(sw2)}`;
                break;
        }
        return msg;
    },
    '^6[B,b]00$': (sw2) => {
        return `${CHCK_ERR}; Wrong parameters P1-P2`;
    },
    '^6[C,c](.{2})$': (sw2) => {
        return `${CHCK_ERR}; Wrong Le field; ${sw2} data bytes available`;
    },
    '^6[D,d]00$': (sw2) => {
        return `${CHCK_ERR}; Instruction code not supported or invalid`;
    },
    '^6[E,e]00$': (sw2) => {
        return `${CHCK_ERR}; Class not supported`;
    },
    '^6[F,f]00$': (sw2) => {
        return `${CHCK_ERR}; No precise diagnosis`;
    },
};

export function statusDecode(status: number[]): string {
    let meaning = `Unknown value: [${status}]`;
    if (status.length === 2) {
        const statusHex = arrayToHex(status, false);
        const regExpList = Object.keys(meanings);
        for (let i = 0; i < regExpList.length; i = i+1) {
            if(new RegExp(regExpList[i]).exec(statusHex)) {
                meaning = meanings[regExpList[i]](status[1]);
            }
        }
    }
    return meaning;
}

export default statusDecode;
