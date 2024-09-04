import ResponseAPDU, { assertResponseIsOk } from '../src/responseApdu';

describe('ResponseAPDU', () => {
    test('ctor', () => {
        //@ts-ignore
        expect(()=>{ResponseAPDU.from([1,2,3,4,'string'])}).toThrow(new Error('Could not create ResponseAPDU from provided data: Data is not a numeric array'));
        expect(()=>{ResponseAPDU.from('')}).toThrow(new Error('Expected at least 2 bytes of input data, received: 0 bytes'));
        expect(()=>{ResponseAPDU.from([])}).toThrow(new Error('Expected at least 2 bytes of input data, received: 0 bytes'));
        expect(()=>{ResponseAPDU.from(Buffer.from([]))}).toThrow(new Error('Expected at least 2 bytes of input data, received: 0 bytes'))
        expect(()=>{ResponseAPDU.from(new ArrayBuffer(0))}).toThrow(new Error('Expected at least 2 bytes of input data, received: 0 bytes'))
        expect(()=>{ResponseAPDU.from(new Uint8Array(0))}).toThrow(new Error('Expected at least 2 bytes of input data, received: 0 bytes'))
        expect(()=>{ResponseAPDU.from(Buffer.alloc(262))}).toThrow(new Error('Expected at most 258 bytes of input data, received: 262 bytes'));

        let rsp: ResponseAPDU;

        rsp = ResponseAPDU.from();
        expect(rsp.byteLength).toEqual(2);
        expect(rsp.toArray()).toEqual([0,0]);
        expect(rsp.toBuffer()).toEqual(Buffer.from([0,0]));
        expect(rsp.toString()).toEqual('0000');
        expect(rsp.meaning).toEqual('Unknown status: [0000]');

        rsp = ResponseAPDU.from(new ResponseAPDU());
        expect(rsp.byteLength).toEqual(2);
        expect(rsp.toArray()).toEqual([0,0]);
        expect(rsp.toBuffer()).toEqual(Buffer.from([0,0]));
        expect(rsp.toString()).toEqual('0000');
        expect(rsp.meaning).toEqual('Unknown status: [0000]');

        rsp = ResponseAPDU.from('9000');
        expect(rsp.byteLength).toEqual(2);
        expect(rsp.toArray()).toEqual([0x90,0]);
        expect(rsp.toBuffer()).toEqual(Buffer.from([0x90,0]));
        expect(rsp.toString()).toEqual('9000');
        expect(rsp.meaning).toEqual('Normal processing');

        rsp = ResponseAPDU.from('0x0102039000');
        expect(rsp.byteLength).toEqual(5);
        expect(rsp.toArray()).toEqual([1,2,3,0x90,0]);
        expect(rsp.toBuffer()).toEqual(Buffer.from([1,2,3,0x90,0]));
        expect(rsp.toString()).toEqual('0102039000');
        expect(rsp.meaning).toEqual('Normal processing');
    })
    test('accessors and methods', () => {
        let testData = Buffer.from('0102039000', 'hex');
        let rsp = ResponseAPDU.from(testData);

        rsp.clear()
        expect(rsp.byteLength).toEqual(2);
        expect(rsp.dataLength).toEqual(0);
        expect(rsp.data).toEqual(Buffer.alloc(0))
        expect(rsp.status).toEqual(Buffer.from([0,0]));
        expect(rsp.toString()).toEqual('0000');

        //@ts-ignore
        expect(() => {rsp.data = true}).toThrow(new Error('Could not set ResponseAPDU data field: Accepted binary data types: hex string, number[], Buffer, ArrayBuffer, ArrayBufferView'));
        expect(() => {rsp.data = Buffer.alloc(300)}).toThrow(new Error('Could not set ResponseAPDU data field. Data too long. Max: 256 bytes; Received: 300 bytes'));
        rsp.data = '8182838485';
        expect(rsp.byteLength).toEqual(7);
        expect(rsp.dataLength).toEqual(5);
        expect(rsp.data).toEqual(Buffer.from('8182838485', 'hex'))
        expect(rsp.status).toEqual(Buffer.from([0,0]));
        expect(rsp.toString()).toEqual('81828384850000');

        //@ts-ignore
        expect(() => {rsp.status = true}).toThrow(new Error('Could not set ResponseAPDU status field: Accepted binary data types: hex string, number[], Buffer, ArrayBuffer, ArrayBufferView'));
        expect(() => {rsp.status = '010203'}).toThrow(new Error('Could not set ResponseAPDU status field. Expected exactly 2 bytes of data; Received: 3 bytes'));
        rsp.status = '9000';
        expect(rsp.byteLength).toEqual(7);
        expect(rsp.dataLength).toEqual(5);
        expect(rsp.data).toEqual(Buffer.from('8182838485', 'hex'))
        expect(rsp.status).toEqual(Buffer.from([0x90,0]));
        expect(rsp.toString()).toEqual('81828384859000');

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

        expect(() => {assertResponseIsOk(ResponseAPDU.from('6100'))}).toThrow();

    })
});