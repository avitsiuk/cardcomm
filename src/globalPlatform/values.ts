const defaultKey = [
    0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x4b,
    0x4c, 0x4d, 0x4e, 0x4f,
];

/** Default 16-byte test static keys used in SCP02/SCP03 */
export const defaultStaticKeys = {
    enc: defaultKey,
    mac: defaultKey,
    dek: defaultKey,
};

/** List of Ins bytes as defined in GlobalPlatformCard-2.2.1 specifications */
export enum ins {
    INIT_UPDATE = 0x50,
    EXT_AUTH = 0x82, // as in iso7816
    INT_AUTH = 0x88, // as in iso7816
    GET_DATA = 0xCA, // as in iso7816
    DELETE = 0xE4,
    GET_STATUS = 0xF2,
};
