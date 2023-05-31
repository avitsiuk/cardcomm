import statusDecode from './statusDecode';

export class ResponseApdu {
    private _data: Buffer;
    private _hex: string;

    constructor(buffer: Buffer) {
        this._data = buffer;
        this._hex = buffer.toString('hex');
    }

    getDataOnly() {
        return this._hex.substring(0, this._hex.length - 4);
    }

    getStatusCode() {
        return this._hex.substring(this._hex.length - 4);
    }

    meaning() {
        return statusDecode(this.getStatusCode());
    }

    isOk() {
        return this.getStatusCode() === '9000';
    }

    hasMoreBytesAvailable() {
        return this._hex.substring(this._hex.length - 4, this._hex.length - 2) === '61';
    }

    numberOfBytesAvailable() {
        let hexLength = this._hex.substring(this._hex.length - 2);
        return parseInt(hexLength, 16);
    }

    isWrongLength() {
        return this._hex.substring(this._hex.length - 4, this._hex.length - 2) === '6c';
    }

    correctLength() {
        let hexLength = this._hex.substring(this._hex.length - 2);
        return parseInt(hexLength, 16);
    }

    buffer() {
        return this._data;
    }

    toString() {
        return this._hex;
    }
}

export default ResponseApdu;
