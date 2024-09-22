/** List of Ins bytes as defined in Iso7816-4(2014) specifications */
export enum ins {
    /** see Iso7816-9 */
    DEACTIVATE_FILE = 0x04,
    /** see 11.3.10 of Iso7816-4 */
    DEACTIVATE_RECORD = 0x06,
    /** see 11.3.9 of Iso7816-4 */
    ACTIVATE_RECORD = 0x08,
    /** see 11.3.8 of Iso7816-4 */
    ERASE_RECORD = 0x0c,
    /** see 11.2.7 of Iso7816-4 */
    ERASE_BINARY_EVEN = 0x0e,
    /** see 11.2.7 of Iso7816-4 */
    ERASE_BINARY_ODD = 0x0f,
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
    PERFORM_SECURITY_OP_EVEN = 0x2a,
    /** see Iso7816-8 */
    PERFORM_SECURITY_OP_ODD = 0x2b,
    /** see 11.5.10 of Iso7816-4 */
    RESET_RETRY_COUNT_EVEN = 0x2c,
    /** see 11.5.10 of Iso7816-4 */
    RESET_RETRY_COUNT_ODD = 0x2d,
    /** see Iso7816-8 */
    PERFORM_BIOMETRIC_OP_EVEN = 0x2e,
    /** see Iso7816-8 */
    PERFORM_BIOMETRIC_OP_ODD = 0x2f,
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
    SEARCH_BIN_EVEN = 0xa0,
    /** see 11.2.6 of Iso7816-4 */
    SEARCH_BIN_ODD = 0xa1,
    /** see 11.3.7 of Iso7816-4 */
    SEARCH_RECORD = 0xa2,
    /** see 11.1.1 of Iso7816-4 */
    SELECT = 0xa4,
    /** see 11.4.2 of Iso7816-4 */
    SELECT_DATA = 0xa5,
    /** see 11.2.3 of Iso7816-4 */
    READ_BINARY_EVEN = 0xb0,
    /** see 11.2.3 of Iso7816-4 */
    READ_BINARY_ODD = 0xb1,
    /** see 11.3.3 of Iso7816-4 */
    READ_RECORD_EVEN = 0xb2,
    /** see 11.3.3 of Iso7816-4 */
    READ_RECORD_ODD = 0xb3,
    /** see 11.7.1 of Iso7816-4 */
    GET_RESPONSE = 0xc0,
    /** see 11.7.2 of Iso7816-4 */
    ENVELOPE_EVEN = 0xc2,
    /** see 11.7.2 of Iso7816-4 */
    ENVELOPE_ODD = 0xc3,
    /** see 11.4.3 of Iso7816-4 */
    GET_DATA_EVEN = 0xca,
    /** see 11.4.4 of Iso7816-4 */
    GET_DATA_ODD = 0xcb,
    /** see 11.4.3 of Iso7816-4 */
    GET_NEXT_DATA_EVEN = 0xcc,
    /** see 11.4.4 of Iso7816-4 */
    GET_NEXT_DATA_ODD = 0xcd,
    /** see Iso7816-9 */
    NAMAGE_DATA = 0xcf,
    /** see 11.2.4 of Iso7816-4 */
    WRITE_BINARY_EVEN = 0xd0,
    /** see 11.2.4 of Iso7816-4 */
    WRITE_BINARY_ODD = 0xd1,
    /** see 11.3.4 of Iso7816-4 */
    WRITE_RECORD = 0xd2,
    /** see 11.2.5 of Iso7816-4 */
    UPDATE_BINARY_EVEN = 0xd6,
    /** see 11.2.5 of Iso7816-4 */
    UPDATE_BINARY_ODD = 0xd7,
    /** see 11.4.7 of Iso7816-4 */
    PUT_NEXT_DATA_EVEN = 0xd8,
    /** see 11.4.7 of Iso7816-4 */
    PUT_NEXT_DATA_ODD = 0xd9,
    /** see 11.4.6 of Iso7816-4 */
    PUT_DATA_EVEN = 0xda,
    /** see 11.4.6 of Iso7816-4 */
    PUT_DATA_ODD = 0xdb,
    /** see 11.3.5 of Iso7816-4 */
    UPDATE_RECORD_EVEN = 0xdc,
    /** see 11.3.5 of Iso7816-4 */
    UPDATE_RECORD_ODD = 0xdd,
    /** see 11.4.8 of Iso7816-4 */
    UPDATE_DATA_EVEN = 0xde,
    /** see 11.4.8 of Iso7816-4 */
    UPDATE_DATA_ODD = 0xdf,
    /** see Iso7816-9 */
    CREATE_FILE = 0xe0,
    /** see 11.3.6 of Iso7816-4 */
    APPEND_RECORD = 0xe2,
    /** see Iso7816-9 */
    DELETE_FILE = 0xe4,
    /** see Iso7816-9 */
    TERMINATE_DF = 0xe6,
    /** see Iso7816-9 */
    TERMINATE_EF = 0xe8,
    /** see Iso7816-13 */
    LOAD_APP_EVEN = 0xea,
    /** see Iso7816-13 */
    LOAD_APP_ODD = 0xeb,
    /** see Iso7816-9 */
    DELETE_DATA = 0xee,
    /** see Iso7816-13 */
    REMOVE_APP_EVEN = 0xec,
    /** see Iso7816-13 */
    REMOVE_APP_ODD = 0xed,
    /** see Iso7816-9 */
    TERMINATE_CARD_USAGE = 0xfe,
}
