import crypto from 'crypto';
import t2lib from '@affidaty/t2-lib';
import {
    Devices,
    Iso7816Commands,
    gpDefStaticKeys,
    SCP11,
    CommandApdu,
    Utils,
    ResponseApdu,
} from '../src/index';

async function main() {
    const s = new SCP11();
    await s.initAndAuth();

    // const ka = crypto.createECDH('prime256v1');

    // const eKaPrivKey = Buffer.from('b1c74760249d83c9ad70439338f746c1ea52f6f25b6d0d5f384176e529114146');
    // const eKaPubKey = Buffer.from('04927ea9624053449f8fce329228615408c748eb8d3009417df663f34c02aae4c467d414a1c164716412692f264b4a054ce515aa6337ff016d877d5f9d9f22db4d');
    // ka.setPrivateKey(Buffer.from('b1c74760249d83c9ad70439338f746c1ea52f6f25b6d0d5f384176e529114146', 'hex'));

    // const sCardPubKey = Buffer.from('046930f10f99eb9f3efcc793f79e76ce4bfb666ca22d1dca5ab0fb5d1c1caecb31f7ccc10b4063fddc76193107f6a20e99e75a31aacb183a3f1308a34955fc1fe8', 'hex');
    // const eCardPubKey = Buffer.from('0422987603e2cc0974aeefc3990263ae71b3a9a149f99ead6e7daaca2730d2ac42c1773289a2c8f69a52fcec1e77f2455c4cd220fcefdfd61ce9ecb9409fc10b2d', 'hex');
    // // const shSee = Buffer.from('ff7b1c8a6e2c0a61e10047960f79e1babf445f94ecca665b55d34a0acb3293a3', 'hex');
    // // const shSes = Buffer.from('c9115c67873d130b9472b3799867b29fd240c4f9ccff29bdf0a965ac8468b549', 'hex');

    // // ff7b1c8a6e2c0a61e10047960f79e1babf445f94ecca665b55d34a0acb3293a3c9115c67873d130b9472b3799867b29fd240c4f9ccff29bdf0a965ac8468b549
    // // 313ad390a1f46d5fc0c1b62736d337936ede69c468af11b40384acb08f04d6ba

    // const shSee = ka.computeSecret(eCardPubKey);
    // console.log(`shSee: [${shSee.toString('hex')}]`);
    // const shSes = ka.computeSecret(sCardPubKey);
    // console.log(`shSes: [${shSes.toString('hex')}]`);

    // const key = crypto.createHash('sha256').update(Buffer.concat([shSee, shSes])).digest();
    // console.log(`Key:   [${key.toString('hex')}]`);

    // const data = Buffer.alloc(30, 0xff);

    // const paddedData = Buffer.alloc(data.length + (32 - (data.length % 32)), 0);
    // paddedData.set(data);
    // paddedData.set([0x80], data.length);

    // console.log(`data:  [${paddedData.toString('hex')}]`);
}

main();
