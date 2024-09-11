import {
    ResponseApdu,
    assertResponseIsOk,
} from '../src/responseApdu';

describe('ResponseApdu', () => {
    test('ctor', () => {
        //@ts-ignore
        expect(()=>{ResponseApdu.from([1,2,3,4,'string'])}).toThrow(new Error('Could not create ResponseAPDU from provided data: Data is not a numeric array'));
        expect(()=>{ResponseApdu.from('')}).toThrow(new Error('Expected at least 2 bytes of input data, received: 0 bytes'));
        expect(()=>{ResponseApdu.from([])}).toThrow(new Error('Expected at least 2 bytes of input data, received: 0 bytes'));
        expect(()=>{ResponseApdu.from(Buffer.from([]))}).toThrow(new Error('Expected at least 2 bytes of input data, received: 0 bytes'));
        expect(()=>{ResponseApdu.from(new ArrayBuffer(0))}).toThrow(new Error('Expected at least 2 bytes of input data, received: 0 bytes'));
        expect(()=>{ResponseApdu.from(new Uint8Array(0))}).toThrow(new Error('Expected at least 2 bytes of input data, received: 0 bytes'));

        let rsp: ResponseApdu;

        rsp = ResponseApdu.from(Buffer.alloc(300));
        expect(rsp.byteLength).toEqual(300);
        expect(rsp.data).toEqual(new Uint8Array(298));
        expect(rsp.status).toEqual(new Uint8Array(2));
        expect(rsp.toByteArray()).toEqual(new Uint8Array(300));
        expect(rsp.meaning).toEqual('Unknown status: [0000]');

        rsp = ResponseApdu.from();
        expect(rsp.byteLength).toEqual(2);
        expect(rsp.toByteArray()).toEqual(new Uint8Array([0,0]));
        expect(rsp.toString()).toEqual('0000');
        expect(rsp.meaning).toEqual('Unknown status: [0000]');

        rsp = ResponseApdu.from(new ResponseApdu());
        expect(rsp.byteLength).toEqual(2);
        expect(rsp.toByteArray()).toEqual(new Uint8Array([0,0]));
        expect(rsp.toString()).toEqual('0000');
        expect(rsp.meaning).toEqual('Unknown status: [0000]');

        rsp = ResponseApdu.from('9000');
        expect(rsp.byteLength).toEqual(2);
        expect(rsp.toByteArray()).toEqual(new Uint8Array([0x90,0]));
        expect(rsp.toString()).toEqual('9000');
        expect(rsp.meaning).toEqual('Normal processing');

        rsp = ResponseApdu.from('0x0102039000');
        expect(rsp.byteLength).toEqual(5);
        expect(rsp.toByteArray()).toEqual(new Uint8Array([1,2,3,0x90,0]));
        expect(rsp.toString()).toEqual('0102039000');
        expect(rsp.meaning).toEqual('Normal processing');
    })
    test('accessors and methods', () => {
        let testData = Buffer.from('0102039000', 'hex');
        let rsp = ResponseApdu.from(testData);

        rsp.clear()
        expect(rsp.byteLength).toEqual(2);
        expect(rsp.dataLength).toEqual(0);
        expect(rsp.data).toEqual(new Uint8Array(0))
        expect(rsp.status).toEqual(new Uint8Array([0,0]));
        expect(rsp.toString()).toEqual('0000');

        //@ts-ignore
        expect(() => {rsp.data = true}).toThrow(new Error('Could not set ResponseAPDU data field: Accepted binary data types: hex string, number[], ArrayBuffer, ArrayBufferView'));
        rsp.data = '8182838485';
        expect(rsp.byteLength).toEqual(7);
        expect(rsp.dataLength).toEqual(5);
        expect(rsp.data).toEqual(new Uint8Array([0x81, 0x82, 0x83, 0x84, 0x85]))
        expect(rsp.status).toEqual(new Uint8Array([0,0]));
        expect(rsp.toString()).toEqual('81828384850000');
        rsp.data = '';
        expect(rsp.byteLength).toEqual(2);
        expect(rsp.dataLength).toEqual(0);
        expect(rsp.data).toEqual(new Uint8Array(0))
        expect(rsp.status).toEqual(new Uint8Array([0,0]));
        expect(rsp.toString()).toEqual('0000');

        //@ts-ignore
        expect(() => {rsp.status = true}).toThrow(new Error('Could not set ResponseAPDU status field: Accepted binary data types: hex string, number[], ArrayBuffer, ArrayBufferView'));
        expect(() => {rsp.status = '010203'}).toThrow(new Error('Could not set ResponseAPDU status field. Expected exactly 2 bytes of data; Received: 3 bytes'));
        rsp.data = '8182838485';
        rsp.status = '9000';
        expect(rsp.byteLength).toEqual(7);
        expect(rsp.dataLength).toEqual(5);
        expect(rsp.data).toEqual(new Uint8Array([0x81, 0x82, 0x83, 0x84, 0x85]));
        expect(rsp.status).toEqual(new Uint8Array([0x90,0]));
        expect(rsp.toString()).toEqual('81828384859000');

        rsp.data = new Uint8Array(300);
        expect(rsp.byteLength).toEqual(302);
        expect(rsp.dataLength).toEqual(300);
        expect(rsp.data).toEqual(new Uint8Array(300));
        expect(rsp.status).toEqual(new Uint8Array([0x90,0]));

        rsp = new ResponseApdu();
        rsp.data = new Uint8Array(3);
        rsp.status = '9000';
        //@ts-ignore
        expect(()=>{rsp.addData(true)}).toThrow(new Error('Could not add data to ResponseAPDU: Accepted binary data types: hex string, number[], ArrayBuffer, ArrayBufferView'));
        rsp.addData([1,2]);
        expect(rsp.byteLength).toEqual(7);
        expect(rsp.dataLength).toEqual(5);
        expect(rsp.data).toEqual(new Uint8Array([0,0,0,1,2]));
        expect(rsp.status).toEqual(new Uint8Array([0x90,0]));
        rsp.addData([]);
        expect(rsp.byteLength).toEqual(7);
        expect(rsp.dataLength).toEqual(5);
        expect(rsp.data).toEqual(new Uint8Array([0,0,0,1,2]));
        expect(rsp.status).toEqual(new Uint8Array([0x90,0]));
        rsp.addData(new Uint8Array(300));
        const expectedData = new Uint8Array(305);
        expectedData.set([1,2], 3);
        expect(rsp.byteLength).toEqual(307);
        expect(rsp.dataLength).toEqual(305);
        expect(rsp.data).toEqual(expectedData);
        expect(rsp.status).toEqual(new Uint8Array([0x90,0]));

        rsp.data = '8182838485';
        rsp.status = '9000';
        expect(rsp.isOk).toBeTruthy();
        expect(rsp.hasMoreBytesAvailable).toBeFalsy();
        expect(rsp.isWrongLe).toBeFalsy();
        expect(rsp.availableResponseBytes).toEqual(0);
        rsp.status = '610A';
        expect(rsp.isOk).toBeFalsy();
        expect(rsp.hasMoreBytesAvailable).toBeTruthy();
        expect(rsp.isWrongLe).toBeFalsy();
        expect(rsp.availableResponseBytes).toEqual(10);
        rsp.status = '6C0A';
        expect(rsp.isOk).toBeFalsy();
        expect(rsp.hasMoreBytesAvailable).toBeFalsy();
        expect(rsp.isWrongLe).toBeTruthy();
        expect(rsp.availableResponseBytes).toEqual(10);

        expect(() => {assertResponseIsOk(ResponseApdu.from('6100'))}).toThrow();

    })
});