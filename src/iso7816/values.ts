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
    /** see 11.2.7 of Iso7816-4 */
    ERASE_BINARY_EVEN = 0x0E,
    /** see 11.2.7 of Iso7816-4 */
    ERASE_BINARY_ODD = 0x0F,
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
    /** see Iso7816-8 */
    PERFORM_SECURITY_OP_EVEN = 0x2A,
    /** see Iso7816-8 */
    PERFORM_SECURITY_OP_ODD = 0x2B,
    /** see 11.5.10 of Iso7816-4 */
    RESET_RETRY_COUNT_EVEN = 0x2C,
    /** see 11.5.10 of Iso7816-4 */
    RESET_RETRY_COUNT_ODD = 0x2D,
    /** see Iso7816-8 */
    PERFORM_BIOMETRIC_OP_EVEN = 0x2E,
    /** see Iso7816-8 */
    PERFORM_BIOMETRIC_OP_ODD = 0x2F,
    /** see 11.6.1 of Iso7816-4 */
    COMPARE = 0x33,
    /** see 11.6.2 of Iso7816-4 */
    GET_ATTRIBUTE_EVEN = 0x34,
    /** see 11.6.2 of Iso7816-4 */
    GET_ATTRIBUTE_ODD = 0x35,
    /** see Iso7816-13 */
    APP_MGMT_REQST_EVEN = 0x40,
    /** see Iso7816-13 */
    APP_MGMT_REQST_ODD = 0x41,
    /** see Iso7816-9 */
    ACTIVATE_FILE = 0x44,
    /** see Iso7816-8 */
    GEN_ASYMM_KEY_PAIR_EVEN = 0x46,
    /** see Iso7816-8 */
    GEN_ASYMM_KEY_PAIR_ODD = 0x47,
    /** see 11.1.2 of Iso7816-4 */
    MANAGE_CHANNEL = 0x70,
    /** see 11.5.4 of Iso7816-4 */
    EXT_MUT_AUTH = 0x82,
    /** see 11.5.3 of Iso7816-4 */
    GET_CHALLENGE = 0x84,
    /** see 11.5.5 of Iso7816-4 */
    GENERAL_AUTH_EVEN = 0x86,
    /** see 11.5.5 of Iso7816-4 */
    GENERAL_AUTH_ODD = 0x87,
    /** see 11.5.2 of Iso7816-4 */
    INT_AUTH = 0x88,
    /** see 11.2.6 of Iso7816-4 */
    SEARCH_BIN_EVEN = 0xA0,
    /** see 11.2.6 of Iso7816-4 */
    SEARCH_BIN_ODD = 0xA1,
    /** see 11.3.7 of Iso7816-4 */
    SEARCH_RECORD = 0xA2,
    /** see 11.1.1 of Iso7816-4 */
    SELECT = 0xA4,
    /** see 11.4.2 of Iso7816-4 */
    SELECT_DATA = 0xA5,
    /** see 11.2.3 of Iso7816-4 */
    READ_BINARY_EVEN = 0xB0,
    /** see 11.2.3 of Iso7816-4 */
    READ_BINARY_ODD = 0xB1,
    /** see 11.3.3 of Iso7816-4 */
    READ_RECORD_EVEN = 0xB2,
    /** see 11.3.3 of Iso7816-4 */
    READ_RECORD_ODD = 0xB3,
    /** see 11.7.1 of Iso7816-4 */
    GET_RESPONSE = 0xC0,
    /** see 11.7.2 of Iso7816-4 */
    ENVELOPE_EVEN = 0xC2,
    /** see 11.7.2 of Iso7816-4 */
    ENVELOPE_ODD = 0xC3,
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
    /** see 11.2.4 of Iso7816-4 */
    WRITE_BINARY_EVEN = 0xD0,
    /** see 11.2.4 of Iso7816-4 */
    WRITE_BINARY_ODD = 0xD1,
    /** see 11.3.4 of Iso7816-4 */
    WRITE_RECORD = 0xD2,
    /** see 11.2.5 of Iso7816-4 */
    UPDATE_BINARY_EVEN = 0xD6,
    /** see 11.2.5 of Iso7816-4 */
    UPDATE_BINARY_ODD = 0xD7,
    /** see 11.4.7 of Iso7816-4 */
    PUT_NEXT_DATA_EVEN = 0xD8,
    /** see 11.4.7 of Iso7816-4 */
    PUT_NEXT_DATA_ODD = 0xD9,
    /** see 11.4.6 of Iso7816-4 */
    PUT_DATA_EVEN = 0xDA,
    /** see 11.4.6 of Iso7816-4 */
    PUT_DATA_ODD = 0xDB,
    /** see 11.3.5 of Iso7816-4 */
    UPDATE_RECORD_EVEN = 0xDC,
    /** see 11.3.5 of Iso7816-4 */
    UPDATE_RECORD_ODD = 0xDD,
    /** see 11.4.8 of Iso7816-4 */
    UPDATE_DATA_EVEN = 0xDE,
    /** see 11.4.8 of Iso7816-4 */
    UPDATE_DATA_ODD = 0xDF,
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
    /** see Iso7816-13 */
    LOAD_APP_EVEN = 0xEA,
    /** see Iso7816-13 */
    LOAD_APP_ODD = 0xEB,
    /** see Iso7816-9 */
    DELETE_DATA = 0xEE,
    /** see Iso7816-13 */
    REMOVE_APP_EVEN = 0xEC,
    /** see Iso7816-13 */
    REMOVE_APP_ODD = 0xED,
    /** see Iso7816-9 */
    TERMINATE_CARD_USAGE = 0xFE,
};
