import CommandApdu from '../commandApdu';
import {
    hexToArray,
} from '../utils';

const insByteList = {
    X: 0xe2,
};

function init_update(arg="00A4040000") {
    let cmd;
    //8050000008ffffffffffffffff00
    //805000000854543022F3BEC48C00
    // Host Challenge    
    //cmd = new CommandApdu(arg);
    //console.log(`[GP] Host Challenge: ${cmd}`);

    //cmd = new CommandApdu('00A4040000');
    //InitUpdate
    cmd = new CommandApdu(arg);

    // ? // Authenticate Secure Channel
    //cmd = new CommandApdu('8482000010');

    return cmd;
}

function ext_auth(arg="asd") {}

function load(arg="asd") {}

function install(aidHex?: string):CommandApdu {
    // Router Init
    let cmd;
    cmd = new CommandApdu('00A4040000');
    
    // GET DATA (Applets list)
    //cmd = new CommandApdu('80CA006600');
    //console.log(`[GP] Applets List: ${cmd}`);

    // GET DATA ()
    //cmd = new CommandApdu('80CA00664E');
    //console.log(`[GP] Applet List: ${cmd}`);

    // Secure Channel Init
    //cmd = new CommandApdu('80F2100000');
    //console.log(`[GP] Secure Channel: ${cmd}`);

    // GET STATUS ()
    //cmd = new CommandApdu('80F2100000');
    //console.log(`[GP] Get Status: ${cmd}`);

    // Download | Install | = 00 A4 04 00 5E | 80 50 00 00 08 Init Update | 00 C0 00 00 1C | 84 82 00 00 10 Authenticate | 80 E6 02 00 0A 05 install

    //const cmd = new CommandApdu().setIns(0xA4).setP1(0x04);    
    //const cmd = new CommandApdu([0x00,0xA4,0x04,0x00,0x00]);

    //console.log("CMD:",cmd.toString());

    if (cmd && typeof aidHex !== 'undefined' ) {
        cmd.setData(hexToArray(aidHex));
    }
    return cmd;
}

//download

//install

//initializeUpdate

export {
    install,
    init_update,
    ext_auth,
    load
};