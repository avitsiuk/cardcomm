import CommandAPDU from '../src/commandApdu';

describe('CommandAPDU', () => {
    test('ctor', () => {
        //@ts-ignore
        expect(()=>{CommandAPDU.from([1,2,3,4,'string'])}).toThrow(new Error('Could not create CommandAPDU from provided data: Data is not a numeric array'));
        expect(()=>{CommandAPDU.from('')}).toThrow(new Error('Expected at least 4 bytes of input data, received: 0 bytes'));
        expect(()=>{CommandAPDU.from([])}).toThrow(new Error('Expected at least 4 bytes of input data, received: 0 bytes'));
        expect(()=>{CommandAPDU.from(Buffer.from([]))}).toThrow(new Error('Expected at least 4 bytes of input data, received: 0 bytes'))
        expect(()=>{CommandAPDU.from(new ArrayBuffer(0))}).toThrow(new Error('Expected at least 4 bytes of input data, received: 0 bytes'))
        expect(()=>{CommandAPDU.from(new Uint8Array(0))}).toThrow(new Error('Expected at least 4 bytes of input data, received: 0 bytes'))
        expect(()=>{CommandAPDU.from(Buffer.alloc(262))}).toThrow(new Error('Expected at most 261 bytes of input data, received: 262 bytes'));
        // 00 00 00 00 00 00 - if lc is 0 then it must be removed
        let testData = Buffer.alloc(6)
        expect(()=>{CommandAPDU.from(Buffer.alloc(6))}).toThrow(new Error('Lc value cannot be 0; received data: [000000000000]'));
        testData.set([3], CommandAPDU.LC_OFFSET) // 00 00 00 00 03 00 - data is expected to be 3 bytes long
        expect(()=>{CommandAPDU.from(testData)}).toThrow(new Error('Based on input Lc value(3), input data was expected to be 8(no Le value) or 9(with Le value) bytes long. Received 6 bytes: [000000000300]'));


        let cmd: CommandAPDU;

        cmd = CommandAPDU.from();
        expect(cmd.byteLength).toEqual(5);
        expect(cmd.lc).toEqual(0);
        expect(cmd.le).toEqual(0);
        expect(cmd.toByteArray()).toEqual(new Uint8Array([0,0,0,0,0]));
        expect(cmd.toString()).toEqual('0000000000');

        cmd = CommandAPDU.from(new CommandAPDU());
        expect(cmd.byteLength).toEqual(5);
        expect(cmd.lc).toEqual(0);
        expect(cmd.le).toEqual(0);
        expect(cmd.toByteArray()).toEqual(new Uint8Array([0,0,0,0,0]));
        expect(cmd.toString()).toEqual('0000000000');

        cmd = CommandAPDU.from('00010203'); // no data, no le (added automatcally)
        expect(cmd.byteLength).toEqual(5);
        expect(cmd.lc).toEqual(0);
        expect(cmd.le).toEqual(0);
        expect(cmd.toByteArray()).toEqual(new Uint8Array([0,1,2,3,0]));
        expect(cmd.toString()).toEqual('0001020300');

        testData = Buffer.alloc(6);
        testData.set([1], CommandAPDU.LC_OFFSET)
        cmd = CommandAPDU.from(testData); // 00 00 00 00 01 00 - 1 byte of data (last 0), no le (added automatically)
        expect(cmd.byteLength).toEqual(7);
        expect(cmd.lc).toEqual(1);
        expect(cmd.le).toEqual(0);
        expect(cmd.toByteArray()).toEqual(new Uint8Array([0,0,0,0,1,0,0]));
        expect(cmd.toString()).toEqual('00000000010000');

        testData = Buffer.alloc(7);
        testData.set([1], CommandAPDU.LC_OFFSET)
        testData.set([255], 6)
        cmd = CommandAPDU.from(testData); // 00 00 00 00 01 00 ff - 1 byte of data, with le (ff)
        expect(cmd.byteLength).toEqual(7);
        expect(cmd.lc).toEqual(1);
        expect(cmd.le).toEqual(255);
        expect(cmd.toByteArray()).toEqual(new Uint8Array([0,0,0,0,1,0,255]));
        expect(cmd.toString()).toEqual('000000000100ff');

        testData = Buffer.from('0000000003010203ff', 'hex');
        cmd = CommandAPDU.from(testData); // 3 byte of data, with le (ff)
        expect(cmd.byteLength).toEqual(9);
        expect(cmd.lc).toEqual(3);
        expect(cmd.le).toEqual(255);
        expect(cmd.toByteArray()).toEqual(new Uint8Array([0,0,0,0,3,1,2,3,255]));
        expect(cmd.toString()).toEqual('0000000003010203ff');
    })

    test('accessors', () => {
        let testData: number[] = [0,0,0,0,3,1,2,3,255];
        let cmd = CommandAPDU.from(testData);

        expect(cmd.byteLength).toEqual(9);
        cmd.clear();
        expect(cmd.byteLength).toEqual(5);
        expect(cmd.toString()).toEqual('0000000000');

        cmd = CommandAPDU.from(testData);

        cmd.cla = 0x81;
        expect(cmd.cla).toEqual(0x81);
        expect(cmd.byteLength).toEqual(9);
        expect(cmd.toString()).toEqual('8100000003010203ff');

        cmd.ins = 0x82;
        expect(cmd.ins).toEqual(0x82);
        expect(cmd.byteLength).toEqual(9);
        expect(cmd.toString()).toEqual('8182000003010203ff');

        cmd.p1 = 0x83;
        expect(cmd.p1).toEqual(0x83);
        expect(cmd.byteLength).toEqual(9);
        expect(cmd.toString()).toEqual('8182830003010203ff');

        cmd.p2 = 0x84;
        expect(cmd.p2).toEqual(0x84);
        expect(cmd.byteLength).toEqual(9);
        expect(cmd.toString()).toEqual('8182838403010203ff');

        expect(cmd.lc).toEqual(3);

        expect(()=>{cmd.data = new Uint8Array(CommandAPDU.MAX_DATA_BYTE_LENGTH + 1)}).toThrow()
        //@ts-ignore
        expect(()=>{cmd.data = true}).toThrow()

        cmd.data = '';
        expect(cmd.data).toEqual(new Uint8Array(0));
        expect(cmd.byteLength).toEqual(5);
        expect(cmd.lc).toEqual(0);
        expect(cmd.le).toEqual(255);
        expect(cmd.toString()).toEqual('81828384ff');

        cmd.data = '70717273747576777879';
        expect(cmd.data).toEqual(new Uint8Array([112,113,114,115,116,117,118,119,120,121]));
        expect(cmd.byteLength).toEqual(16);
        expect(cmd.lc).toEqual(10);
        expect(cmd.le).toEqual(255);
        expect(cmd.toString()).toEqual('818283840a70717273747576777879ff');

        cmd.le = 0xfe;
        expect(cmd.byteLength).toEqual(16);
        expect(cmd.lc).toEqual(10);
        expect(cmd.le).toEqual(254);
        expect(cmd.toString()).toEqual('818283840a70717273747576777879fe');

        cmd.setLe();
        expect(cmd.byteLength).toEqual(16);
        expect(cmd.lc).toEqual(10);
        expect(cmd.le).toEqual(0);
        expect(cmd.toString()).toEqual('818283840a7071727374757677787900');
    })
    test('cla byte helpers', () => {
        let cmd = new CommandAPDU();

        // proprietary/interindustry
        expect(cmd.cla).toEqual(0x00);
        expect(cmd.isProprietary).toBeFalsy();
        cmd.setProprietary();
        expect(cmd.cla).toEqual(0x80);
        expect(cmd.isProprietary).toBeTruthy();
        cmd.setInterindustry();
        expect(cmd.cla).toEqual(0x00);
        expect(cmd.isProprietary).toBeFalsy();

        // type4/type16
        expect(cmd.cla).toEqual(0x00);
        expect(cmd.type).toEqual(4);
        //@ts-ignore
        expect(()=>{cmd.setType(3)}).toThrow();
        cmd.setType(16);
        expect(cmd.cla).toEqual(0x40);
        expect(cmd.type).toEqual(16);
        cmd.cla = 0xff;
        cmd.setType(4);
        expect(cmd.cla).toEqual(0x9f);
        expect(cmd.type).toEqual(4);
        cmd.cla = 0x20;
        expect(()=>{cmd.type}).toThrow();

        // chaining
        cmd.cla = 0x00;
        expect(cmd.isLastOfChain).toBeTruthy();
        cmd.setNotLastOfChain();
        expect(cmd.isLastOfChain).toBeFalsy();
        cmd.setLastOfChain();
        expect(cmd.isLastOfChain).toBeTruthy();

        // logical channels
        cmd.cla = 0x20;
        expect(()=>{cmd.logicalChannel}).toThrow();
        // type4
        cmd.cla = 0x01;
        cmd.setLogicalChannel(0);
        expect(cmd.cla).toEqual(0);
        expect(cmd.logicalChannel).toEqual(0);
        cmd.setLogicalChannel(1);
        expect(cmd.cla).toEqual(0x01);
        expect(cmd.logicalChannel).toEqual(1);
        cmd.setLogicalChannel(2);
        expect(cmd.cla).toEqual(0x02);
        expect(cmd.logicalChannel).toEqual(2);
        cmd.setLogicalChannel(3);
        expect(cmd.cla).toEqual(0x03);
        expect(cmd.logicalChannel).toEqual(3);
        expect(()=>{cmd.setLogicalChannel(4)}).toThrow();
        // type16
        cmd.cla = 0x00;
        cmd.setType(16);
        expect(()=>{cmd.setLogicalChannel(3)}).toThrow();
        cmd.setLogicalChannel(4);
        expect(cmd.cla).toEqual(0x40);
        expect(cmd.logicalChannel).toEqual(4);
        cmd.setLogicalChannel(5);
        expect(cmd.cla).toEqual(0x41);
        expect(cmd.logicalChannel).toEqual(5);
        cmd.setLogicalChannel(6);
        expect(cmd.cla).toEqual(0x42);
        expect(cmd.logicalChannel).toEqual(6);
        cmd.setLogicalChannel(7);
        expect(cmd.cla).toEqual(0x43);
        expect(cmd.logicalChannel).toEqual(7);
        cmd.setLogicalChannel(8);
        expect(cmd.cla).toEqual(0x44);
        expect(cmd.logicalChannel).toEqual(8);
        cmd.setLogicalChannel(9);
        expect(cmd.cla).toEqual(0x45);
        expect(cmd.logicalChannel).toEqual(9);
        cmd.setLogicalChannel(10);
        expect(cmd.cla).toEqual(0x46);
        expect(cmd.logicalChannel).toEqual(10);
        cmd.setLogicalChannel(11);
        expect(cmd.cla).toEqual(0x47);
        expect(cmd.logicalChannel).toEqual(11);
        cmd.setLogicalChannel(12);
        expect(cmd.cla).toEqual(0x48);
        expect(cmd.logicalChannel).toEqual(12);
        cmd.setLogicalChannel(13);
        expect(cmd.cla).toEqual(0x49);
        expect(cmd.logicalChannel).toEqual(13);
        cmd.setLogicalChannel(14);
        expect(cmd.cla).toEqual(0x4a);
        expect(cmd.logicalChannel).toEqual(14);
        cmd.setLogicalChannel(15);
        expect(cmd.cla).toEqual(0x4b);
        expect(cmd.logicalChannel).toEqual(15);
        cmd.setLogicalChannel(16);
        expect(cmd.cla).toEqual(0x4c);
        expect(cmd.logicalChannel).toEqual(16);
        cmd.setLogicalChannel(17);
        expect(cmd.cla).toEqual(0x4d);
        expect(cmd.logicalChannel).toEqual(17);
        cmd.setLogicalChannel(18);
        expect(cmd.cla).toEqual(0x4e);
        expect(cmd.logicalChannel).toEqual(18);
        cmd.setLogicalChannel(19);
        expect(cmd.cla).toEqual(0x4f);
        expect(cmd.logicalChannel).toEqual(19);
        expect(()=>{cmd.setLogicalChannel(20)}).toThrow();

        // secure message
        // type4
        cmd.cla = 0x00;
        //@ts-ignore
        expect(()=>{cmd.setSecMgsType(5)}).toThrow();
        cmd.setSecMgsType(3);
        expect(cmd.cla).toEqual(0x0c);
        expect(cmd.secMgsType).toEqual(3);
        cmd.setSecMgsType(2);
        expect(cmd.cla).toEqual(0x08);
        expect(cmd.secMgsType).toEqual(2);
        cmd.setSecMgsType(1);
        expect(cmd.cla).toEqual(0x04);
        expect(cmd.secMgsType).toEqual(1);
        cmd.setSecMgsType(0);
        expect(cmd.cla).toEqual(0x00);
        expect(cmd.secMgsType).toEqual(0);
        // type16
        cmd.cla = 0x00;
        cmd.setType(16);
        expect(cmd.secMgsType).toEqual(0);
        //@ts-ignore
        expect(()=>{cmd.setSecMgsType(3)}).toThrow();
        expect(()=>{cmd.setSecMgsType(2)}).toThrow();
        cmd.setSecMgsType(1);
        expect(cmd.cla).toEqual(0x60);
        expect(cmd.secMgsType).toEqual(1);
        cmd.setSecMgsType(0);
        expect(cmd.cla).toEqual(0x40);
        expect(cmd.secMgsType).toEqual(0);
    })
})