/** List of Ins bytes as defined in Iso7816-4(2014) specifications */
export enum ins {
    /** see Iso7816-9 */
    DEACTIVATE_FILE = 0x04,
    /** see 11.3.10 of Iso7816-4 */
    DEACTIVATE_RECORD = 0x06,
    /** see 11.3.9 of Iso7816-4 */
    ACTIVATE_RECORD = 0x08,
    /** see 11.3.8 of Iso7816-4 */
    ERASE_RECORD = 0x0C,
    /** also 0x0F, see 11.2.2 of Iso7816-4 */
    ERASE_BINARY = 0x0E,
    /** see Iso7816-7 */
    PERFORM_SCQL_OP = 0x10,
    /** see Iso7816-7 */
    PERFORM_TRANSACTION_OP = 0x12,
    /** see Iso7816-7 */
    PERFORM_USER_OP = 0x14,
    /** see 11.5.6 of Iso7816-4 */
    VERIFY_REF_DATA = 0x20,
    /** see 11.5.6 of Iso7816-4 */
    VERIFY_REF_DO = 0x21,
    /** see 11.5.11 of Iso7816-4 */
    MANAGE_SECURITY_ENV = 0x22,
    /** see 11.5.7 of Iso7816-4 */
    CHANGE_REF_DATA = 0x24,
    /** see 11.5.7 of Iso7816-4 */
    CHANGE_REF_DO = 0x25,
    /** see 11.5.9 of Iso7816-4 */
    DISABLE_VERIFY_REQMT = 0x26,
    /** see 11.5.8 of Iso7816-4 */
    ENABLE_VERIFY_REQMT = 0x28,
    /** also 0x2B, see Iso7816-8 */
    PERFORM_SECURITY_OP = 0x2A,
    /** also 0x2D, see 11.5.10 of Iso7816-4 */
    RESET_RETRY_COUNT = 0x2C,
    /** also 0x2F, see Iso7816-8 */
    PERFORM_BIOMETRIC_OP = 0x2E,
    /** see 11.6.1 of Iso7816-4 */
    COMPARE = 0x33,
    /** also 0x35, see 11.6.2 of Iso7816-4 */
    GET_ATTRIBUTE = 0x34,
    /** also 0x41, see Iso7816-13 */
    APP_MGMT_REQST = 0x40,
    /** see Iso7816-9 */
    ACTIVATE_FILE = 0x44,
    /** also 0x47, see Iso7816-8 */
    GEN_ASYMM_KEY_PAIR = 0x46,
    /** see 11.1.2 of Iso7816-4 */
    MANAGE_CHANNEL = 0x70,
    /** see 11.5.4 of Iso7816-4 */
    EXT_MUT_AUTH = 0x82,
    /** see 11.5.3 of Iso7816-4 */
    GET_CHALLENGE = 0x84,
    /** also 0x87, see 11.5.5 of Iso7816-4 */
    GENERAL_AUTH = 0x86,
    /** see 11.5.2 of Iso7816-4 */
    INT_AUTH = 0x88,
    /** also 0xA1, see 11.2.6 of Iso7816-4 */
    SEARCH_BIN = 0xA0,
    /** see 11.3.7 of Iso7816-4 */
    SEARCH_RECORD = 0xA2,
    /** see 11.1.1 of Iso7816-4 */
    SELECT = 0xA4,
    /** see 11.4.2 of Iso7816-4 */
    SELECT_DATA = 0xA5,
    /** also 0xB1, see 11.2.3 of Iso7816-4 */
    READ_BINARY = 0xB0,
    /** also 0xB3, see 11.3.3 of Iso7816-4 */
    READ_RECORD = 0xB2,
    /** see 11.7.1 of Iso7816-4 */
    GET_RESPONSE = 0xc0,
    /** also 0xC3, see 11.7.2 of Iso7816-4 */
    ENVELOPE = 0xC2,
    /** see 11.4.3 of Iso7816-4 */
    GET_DATA = 0xCA,
    /** see 11.4.3 of Iso7816-4 */
    GET_NEXT_DATA = 0xCC,
    /** see 11.4.4 of Iso7816-4 */
    GET_DATA_ODD = 0xCB,
    /** see 11.4.4 of Iso7816-4 */
    GET_NEXT_DATA_ODD = 0xCD,
    /** see Iso7816-9 */
    NAMAGE_DATA = 0xCF,
    /** also 0xD1, see 11.2.4 of Iso7816-4 */
    WRITE_BINARY = 0xD0,
    /** see 11.3.4 of Iso7816-4 */
    WRITE_RECORD = 0xD2,
    /** also 0xD7, see 11.2.5 of Iso7816-4 */
    UPDATE_BINARY = 0xD6,
    /** also 0xD9, see 11.4.7 of Iso7816-4 */
    PUT_NEXT_DATA = 0xD8,
    /** also 0xDB, see 11.4.6 of Iso7816-4 */
    PUT_DATA = 0xDA,
    /** also 0xDD, see 11.3.5 of Iso7816-4 */
    UPDATE_RECORD = 0xDC,
    /** also 0xDF, see 11.4.8 of Iso7816-4 */
    UPDATE_DATA = 0xDE,
    /** see Iso7816-9 */
    CREATE_FILE = 0xE0,
    /** see 11.3.6 of Iso7816-4 */
    APPEND_RECORD = 0xE2,
    /** see Iso7816-9 */
    DELETE_FILE = 0xE4,
    /** see Iso7816-9 */
    TERMINATE_DF = 0xE6,
    /** see Iso7816-9 */
    TERMINATE_EF = 0xE8,
    /** also 0xEB, see Iso7816-13 */
    LOAD_APP = 0xEA,
    /** see Iso7816-9 */
    DELETE_DATA = 0xEE,
    /** also 0xED, see Iso7816-13 */
    REMOVE_APP = 0xEC,
    /** see Iso7816-9 */
    TERMINATE_CARD_USAGE = 0xFE,
};
