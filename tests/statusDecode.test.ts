import statusDecode from '../src/statusDecode';

describe('statusDecode', () => {
    test('Decode error', () => {
        //@ts-ignore
        expect(statusDecode(['asd'])).toEqual('Could not decode status: Data is not a numeric array');
    })
    test('Unknown', () => {
        expect(statusDecode(Buffer.from([0,0]))).toEqual('Unknown status: [0000]');
    })
    test('9000', () => {
        expect(statusDecode(Buffer.from([0x90,0]))).toEqual('Normal processing');
    })
    test('61XX', () => {
        expect(statusDecode(Buffer.from([0x61,0x0a]))).toEqual('Normal processing; 10 response bytes still available');
    })
    test('62XX', () => {
        expect(statusDecode(Buffer.from([0x62,0x00]))).toEqual('Warning processing; State of non-volatile memory is unchanged; No further info');
        expect(statusDecode(Buffer.from([0x62,0x02]))).toEqual('Warning processing; State of non-volatile memory is unchanged; Card wants to send at least one more query of 2 bytes');
        expect(statusDecode(Buffer.from([0x62,0x81]))).toEqual('Warning processing; State of non-volatile memory is unchanged; Part of returned data may be corrupted');
        expect(statusDecode(Buffer.from([0x62,0x82]))).toEqual('Warning processing; State of non-volatile memory is unchanged; End of file or record reached before reading Ne bytes, or unsuccessful search');
        expect(statusDecode(Buffer.from([0x62,0x83]))).toEqual('Warning processing; State of non-volatile memory is unchanged; Selected file deactivated');
        expect(statusDecode(Buffer.from([0x62,0x84]))).toEqual('Warning processing; State of non-volatile memory is unchanged; File or data control information not formatted properly');
        expect(statusDecode(Buffer.from([0x62,0x85]))).toEqual('Warning processing; State of non-volatile memory is unchanged; Selected file in termination state');
        expect(statusDecode(Buffer.from([0x62,0x86]))).toEqual('Warning processing; State of non-volatile memory is unchanged; No input data available from a sensor on the card');
        expect(statusDecode(Buffer.from([0x62,0x87]))).toEqual('Warning processing; State of non-volatile memory is unchanged; At least one of the referenced records is deactivated');
        expect(statusDecode(Buffer.from([0x62,0x88]))).toEqual('Warning processing; State of non-volatile memory is unchanged; Unknown SW2: [88]');
    })
    test('63XX', () => {
        expect(statusDecode(Buffer.from([0x63,0x00]))).toEqual('Warning processing; State of non-volatile memory may have changed; No further info');
        expect(statusDecode(Buffer.from([0x63,0x40]))).toEqual('Warning processing; State of non-volatile memory may have changed; Unsuccessful comparison (exact meaning depends on the command)');
        expect(statusDecode(Buffer.from([0x63,0x81]))).toEqual('Warning processing; State of non-volatile memory may have changed; File filled up by the last write');
        expect(statusDecode(Buffer.from([0x63,0xc0]))).toEqual('Warning processing; State of non-volatile memory may have changed; Counter: 0 (exact meaning depends on the command)');
        expect(statusDecode(Buffer.from([0x63,0xcf]))).toEqual('Warning processing; State of non-volatile memory may have changed; Counter: 15 (exact meaning depends on the command)');
        expect(statusDecode(Buffer.from([0x63,0xff]))).toEqual('Warning processing; State of non-volatile memory may have changed; Unknown SW2: [ff]');
    })
    test('64XX', () => {
        expect(statusDecode(Buffer.from([0x64,0x00]))).toEqual('Execution error; State of non-volatile memory is unchanged; No further info');
        expect(statusDecode(Buffer.from([0x64,0x01]))).toEqual('Execution error; State of non-volatile memory is unchanged; Immediate response required by the card');
        expect(statusDecode(Buffer.from([0x64,0x02]))).toEqual('Execution error; State of non-volatile memory is unchanged; Card wants to send at least one more query of 2 bytes');
        expect(statusDecode(Buffer.from([0x64,0x81]))).toEqual('Execution error; State of non-volatile memory is unchanged; Logical channel shared access denied');
        expect(statusDecode(Buffer.from([0x64,0x82]))).toEqual('Execution error; State of non-volatile memory is unchanged; Logical channel opening denied');
        expect(statusDecode(Buffer.from([0x64,0xff]))).toEqual('Execution error; State of non-volatile memory is unchanged; Unknown SW2: [ff]');
    })
    test('65XX', () => {
        expect(statusDecode(Buffer.from([0x65,0x00]))).toEqual('Execution error; State of non-volatile memory may have changed; No further info');
        expect(statusDecode(Buffer.from([0x65,0x81]))).toEqual('Execution error; State of non-volatile memory may have changed; Memory failure');
        expect(statusDecode(Buffer.from([0x65,0xff]))).toEqual('Execution error; State of non-volatile memory may have changed; Unknown SW2: [ff]');
    })
    test('66XX', () => {
        expect(statusDecode(Buffer.from([0x66,0x00]))).toEqual('Execution error; Security-related issues; No further info');
        expect(statusDecode(Buffer.from([0x66,0xff]))).toEqual('Execution error; Security-related issues; Unknown SW2: [ff]');
    })
    test('67XX', () => {
        expect(statusDecode(Buffer.from([0x67,0x00]))).toEqual('Checking error; Wrong length; No further info');
        expect(statusDecode(Buffer.from([0x67,0x01]))).toEqual('Checking error; Wrong length; Command APDU format not compliant with standard');
        expect(statusDecode(Buffer.from([0x67,0x02]))).toEqual('Checking error; Wrong length; The value of Lc is not the expected one');
        expect(statusDecode(Buffer.from([0x67,0xff]))).toEqual('Checking error; Wrong length; Unknown SW2: [ff]');
    })
    test('68XX', () => {
        expect(statusDecode(Buffer.from([0x68,0x00]))).toEqual('Checking error; Functions in CLA not supported; No further info');
        expect(statusDecode(Buffer.from([0x68,0x81]))).toEqual('Checking error; Functions in CLA not supported; Logical channel not supported');
        expect(statusDecode(Buffer.from([0x68,0x82]))).toEqual('Checking error; Functions in CLA not supported; Secure messaging not supported');
        expect(statusDecode(Buffer.from([0x68,0x83]))).toEqual('Checking error; Functions in CLA not supported; Last command of the chain expected');
        expect(statusDecode(Buffer.from([0x68,0x84]))).toEqual('Checking error; Functions in CLA not supported; Command chaining not supported');
        expect(statusDecode(Buffer.from([0x68,0xff]))).toEqual('Checking error; Functions in CLA not supported; Unknown SW2: [ff]');
    })
    test('69XX', () => {
        expect(statusDecode(Buffer.from([0x69,0x00]))).toEqual('Checking error; Command not allowed; No further info');
        expect(statusDecode(Buffer.from([0x69,0x81]))).toEqual('Checking error; Command not allowed; Command incompatible with file structure');
        expect(statusDecode(Buffer.from([0x69,0x82]))).toEqual('Checking error; Command not allowed; Security status not satisfied');
        expect(statusDecode(Buffer.from([0x69,0x83]))).toEqual('Checking error; Command not allowed; Authentication method blocked');
        expect(statusDecode(Buffer.from([0x69,0x84]))).toEqual('Checking error; Command not allowed; Reference data not usable');
        expect(statusDecode(Buffer.from([0x69,0x85]))).toEqual('Checking error; Command not allowed; Conditions of use not satisfied');
        expect(statusDecode(Buffer.from([0x69,0x86]))).toEqual('Checking error; Command not allowed; Command not allowed (no current EF)');
        expect(statusDecode(Buffer.from([0x69,0x87]))).toEqual('Checking error; Command not allowed; Expected secure messaging DOs missing');
        expect(statusDecode(Buffer.from([0x69,0x88]))).toEqual('Checking error; Command not allowed; Incorrect secure messaging DOs');
        expect(statusDecode(Buffer.from([0x69,0xff]))).toEqual('Checking error; Command not allowed; Unknown SW2: [ff]');
    })
    test('6AXX', () => {
        expect(statusDecode(Buffer.from([0x6A,0x00]))).toEqual('Checking error; Wrong parameters P1-P2; No further info');
        expect(statusDecode(Buffer.from([0x6A,0x80]))).toEqual('Checking error; Wrong parameters P1-P2; Incorrect parameters in the command data field');
        expect(statusDecode(Buffer.from([0x6A,0x81]))).toEqual('Checking error; Wrong parameters P1-P2; Function not supported');
        expect(statusDecode(Buffer.from([0x6A,0x82]))).toEqual('Checking error; Wrong parameters P1-P2; File or application not found');
        expect(statusDecode(Buffer.from([0x6A,0x83]))).toEqual('Checking error; Wrong parameters P1-P2; Record not found');
        expect(statusDecode(Buffer.from([0x6A,0x84]))).toEqual('Checking error; Wrong parameters P1-P2; Not enough memory space in the file');
        expect(statusDecode(Buffer.from([0x6A,0x85]))).toEqual('Checking error; Wrong parameters P1-P2; Nc inconsistent with TLV structure');
        expect(statusDecode(Buffer.from([0x6A,0x86]))).toEqual('Checking error; Wrong parameters P1-P2; Incorrect parameters P1-P2');
        expect(statusDecode(Buffer.from([0x6A,0x87]))).toEqual('Checking error; Wrong parameters P1-P2; Nc inconsistent with parameters P1-P2');
        expect(statusDecode(Buffer.from([0x6A,0x88]))).toEqual('Checking error; Wrong parameters P1-P2; Referenced data or reference data not found (exact meaning depends on the command)');
        expect(statusDecode(Buffer.from([0x6A,0x89]))).toEqual('Checking error; Wrong parameters P1-P2; File already exists');
        expect(statusDecode(Buffer.from([0x6A,0x8a]))).toEqual('Checking error; Wrong parameters P1-P2; DF name already exists');
        expect(statusDecode(Buffer.from([0x6A,0xff]))).toEqual('Checking error; Wrong parameters P1-P2; Unknown SW2: [ff]');
    })
    test('6BXX', () => {
        expect(statusDecode(Buffer.from([0x6B,0x00]))).toEqual('Checking error; Wrong parameters P1-P2');
    })
    test('6CXX', () => {
        expect(statusDecode(Buffer.from([0x6C,0x0a]))).toEqual('Checking error; Wrong Le field; 10 data bytes available');
    })
    test('6DXX', () => {
        expect(statusDecode(Buffer.from([0x6D,0x00]))).toEqual('Checking error; Instruction code not supported or invalid');
    })
    test('6EXX', () => {
        expect(statusDecode(Buffer.from([0x6E,0x00]))).toEqual('Checking error; Class not supported');
    })
    test('6FXX', () => {
        expect(statusDecode(Buffer.from([0x6F,0x00]))).toEqual('Checking error; No precise diagnosis');
    })
})