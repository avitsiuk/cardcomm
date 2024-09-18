import * as BER from './ber/index';
import * as Utils from './utils';
import statusDecode from './statusDecode';
import ResponseApdu from './responseApdu';
import CommandApdu from './commandApdu';
import Card from './card';

// Iso7816
import * as Iso7816Values from './iso7816/values';
import * as Iso7816Commands from './iso7816/commands';

/** Everything Iso7816 */
const Iso7816 = {
    /** Common Iso7816 values */
    values: Iso7816Values,
    /** Iso7816-defined Commands */
    commands: Iso7816Commands,
}

// GlobalPlatform
import * as GPValues from './globalPlatform/values';
import * as GPCommands from './globalPlatform/commands';
import SCP02 from './globalPlatform/sesureSession/scp02';
import SCP11 from './globalPlatform/sesureSession/scp11';
const GP = {
    /** Common GlobalPlatform values */
    values: GPValues,
    /** GlobalPlatform-defined Commands */
    commands: GPCommands,
    SCP02,
    SCP11
}

import Device from './device';
import PcscDevicesManager from './devices';

export {
    BER,
    Utils,
    statusDecode,
    ResponseApdu,
    CommandApdu,
    Iso7816,
    GP,
    Card,
    Device,
    PcscDevicesManager,
};
