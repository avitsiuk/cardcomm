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
    // MANAGE_CHANNEL = 0x70, //iso
    // EXT_AUTH = 0x82, //iso
    // INT_AUTH = 0x88, //iso
    // SELECT = 0xA4, //iso
    // GET_DATA_EVEN = 0xCA, //iso
    // GET_DATA_ODD = 0xCB, //iso
    PUT_KEY = 0xd8, // put_next_data in iso
    STORE_DATA = 0xe2, // append_record in iso
    // DELETE = 0xE4, //iso
    INSTALL = 0xe6, // terminate_df in iso
    LOAD = 0xe8, // terminate_ef in iso
    SET_STATUS = 0xf0,
    GET_STATUS = 0xf2,
}
