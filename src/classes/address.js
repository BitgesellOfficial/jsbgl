module.exports = function (S) {
    let Buffer = S.Buffer;
    let defArgs = S.defArgs;
    let getBuffer = S.getBuffer;
    let BF = Buffer.from;
    let BC = Buffer.concat;
    let O = S.OPCODE;

    class PrivateKey {
         /**
         * The class for creating private key object.
         *
         * :parameters:
         *    :k: (optional) private key in HEX,  bytes string or WIF format. In case no key specified new random private key will be created
         * :param compressed: (optional) if set to ``true`` private key corresponding compressed public key, by default is ``true``. Recommended use only compressed public key.
         * :param testnet: (optional) flag for testnet network, by default is ``false``.
         */
        constructor(k, A = {}) {
            defArgs(A, {compressed: null, testnet: false});
            if (k === undefined) {
                if (A.compressed === null) A.compressed = true;
                 /**
                 * flag for compressed type of corresponding public key (boolean)
                 */
                this.compressed = A.compressed;
                /**
                 * flag for testnet network (boolean)
                 */
                this.testnet = A.testnet;
                this.key = S.createPrivateKey({wif: false});
                /**
                 * private key in HEX (string)
                 */
                this.hex = this.key.hex();
                /**
                 * private key in WIF format (string)
                 */
                this.wif = S.privateKeyToWif(this.key, A);
            } else {
                if (S.isString(k)) {
                    if (S.isHex(k)) {
                        if (A.compressed === null) A.compressed = true;
                        this.key = BF(k, 'hex');
                        this.compressed = A.compressed;
                        this.testnet = A.testnet;
                        this.hex = this.key.hex();
                        this.wif = S.privateKeyToWif(this.key, A);
                    } else {
                        this.wif = k;
                        this.key = S.wifToPrivateKey(k, {hex: false});
                        this.hex = this.key.hex();
                        this.compressed = ![S.MAINNET_PRIVATE_KEY_UNCOMPRESSED_PREFIX,
                            S.TESTNET_PRIVATE_KEY_UNCOMPRESSED_PREFIX].includes(k[0]);
                        this.testnet = [S.TESTNET_PRIVATE_KEY_COMPRESSED_PREFIX,
                            S.TESTNET_PRIVATE_KEY_UNCOMPRESSED_PREFIX].includes(k[0]);

                    }
                } else {
                    k = BF(k);
                    if (k.length !== 32) throw new Error('private key invalid');
                    if (A.compressed === null) A.compressed = true;
                    this.compressed = A.compressed;
                    this.testnet = A.testnet;
                    this.key = k;
                    this.hex = this.key.hex();
                    this.wif = S.privateKeyToWif(this.key, A);
                }
            }
        }
    }

    PrivateKey.prototype.toString = function () {
        return `${this.wif}`;
    };


    class PublicKey {
        /**
        * The class for creating public key object.
        *
        * :parameters:
        *   :k: one of this types allowed:
        *
        *           -- private key is instance of ``PrivateKey`` class
        *
        *           -- private key HEX encoded string
        *
        *           -- private key 32 bytes string
        *
        *           -- private key in WIF format
        *
        *           -- public key in HEX encoded string
        *
        *           -- public key [33/65] bytes string
        *
        * *In case no key specified with HEX or bytes string you have to provide flag for testnet
        * and compressed key. WIF format and* ``PrivateKey`` *instance already contain this flags.
        * For HEX or bytes public key only testnet flag has the meaning, comressed flag is determined
        * according to the length of key.*
        *
        * :param compressed: (optional) if set to ``true`` private key corresponding compressed public key, by default is ``true``. Recommended use only compressed public key.
        * :param testnet: (optional) flag for testnet network, by default is ``false``.
        */
        constructor(k, A = {}) {
            defArgs(A, {compressed: null, testnet: false});
            /**
             * flag for compressed type of corresponding public key (boolean)
             */
            this.compressed = A.compressed;
            /**
             * flag for testnet network (boolean)
             */
            this.testnet = A.testnet;
            if (k instanceof PrivateKey) {
                A.testnet = k.testnet;
                A.compressed = k.compressed;
                k = k.wif;
            }

            if (S.isString(k)) {
                if (S.isHex(k)) {
                    k = BF(k, 'hex');
                    if (A.compressed === null) A.compressed = true;
                }
                else if (S.isWifValid(k)) {
                    this.compressed = ![S.MAINNET_PRIVATE_KEY_UNCOMPRESSED_PREFIX,
                        S.TESTNET_PRIVATE_KEY_UNCOMPRESSED_PREFIX].includes(k[0]);
                    this.testnet = [S.TESTNET_PRIVATE_KEY_COMPRESSED_PREFIX,
                        S.TESTNET_PRIVATE_KEY_UNCOMPRESSED_PREFIX].includes(k[0]);
                    k = S.privateToPublicKey(k, {compressed: this.compressed, testnet: this.testnet, hex: false});
                } else throw new Error('private/public key invalid');
            } else k = BF(k);
            if (k.length === 32) {
                if (A.compressed === null) A.compressed = true;
                this.key = S.privateToPublicKey(k, {compressed: A.compressed, testnet: A.testnet, hex: false});
                this.compressed = A.compressed;
                this.testnet = A.testnet;
                this.hex = this.key.hex();
            } else if (S.isPublicKeyValid(k)) {
                /**
                 * public key in HEX (string)
                 */
                this.hex = k.hex();
                this.key = k;
                this.compressed = (this.key.length === 33);
                this.testnet = A.testnet;
            } else throw new Error('private/public key invalid');
        }
    }

    PublicKey.prototype.toString = function () {
        return `${this.hex}`;
    };


    class Address {
        /**
        * The class for Address object.
        *
        * :parameters:
        *   :k: (optional) one of this types allowed:
        *
        *           -- private key WIF format
        *
        *           -- instance of ``PrivateKey``
        *
        *           -- private key HEX encoded string
        *
        *           -- instance of ``PublicKey``
        *
        * :param addressType: (optional) P2PKH, PUBKEY, P2WPKH, P2SH_P2WPKH.
        * :param testnet: (optional) flag for testnet network, by default is ``false``.
        * :param compressed: (optional) if set to ``true`` private key corresponding compressed public key, by default is ``true``. Recommended use only compressed public key.
        *
        * *In case instance is created from WIF private key,* ``PrivateKey`` *or* ``PublicKey`` *compressed and testnet flags
        * already contain in initial key parameter and will be ignored.*
        */
        constructor(k, A = {}) {
            defArgs(A, {addressType: null, testnet: false, compressed: null});

            if (k === undefined) {
                if (A.compressed === null) A.compressed = true;
                /**
                 * instance of ``PrivateKey`` class
                 */
                this.privateKey = new PrivateKey(undefined, A);
                /**
                 * instance of ``PublicKey`` class
                 */
                this.publicKey = new PublicKey(this.privateKey, A);
            } else if (S.isString(k)) {
                if (S.isWifValid(k)) {
                    this.privateKey = new PrivateKey(k, A);
                    A.compressed = this.privateKey.compressed;
                    this.publicKey = new PublicKey(this.privateKey, A);
                    A.testnet = this.privateKey.testnet;
                }
                else if (S.isHex(k)) {
                    if (A.compressed === null) A.compressed = true;
                    k = BF(k, 'hex');
                }
                else {
                    throw new Error('private/public key invalid');
                }
            }
            else if (k instanceof PrivateKey) {
                this.privateKey = k;
                A.testnet = k.testnet;
                A.compressed = k.compressed;
                this.publicKey = new PublicKey(this.privateKey, A);
            } else if (k instanceof PublicKey) {
                A.testnet = k.testnet;
                A.compressed = k.compressed;
                this.publicKey = k;
            } else {
                if (!Buffer.isBuffer(k)) k = BF(k);
            }

            if (Buffer.isBuffer(k)) {
                if (k.length === 32) {
                    if (A.compressed === null) A.compressed = true;
                    this.privateKey = new PrivateKey(k, A);
                    this.publicKey = new PublicKey(this.privateKey, A);
                } else if (S.isPublicKeyValid(k)) {

                    this.publicKey = new PublicKey(k, A);

                    A.compressed = this.publicKey.compressed;
                } else throw new Error('private/public key invalid');
            }

            /**
             * flag for testnet network address  (boolean)
             */
            this.testnet = A.testnet;


            if (A.addressType === null) {
                if (A.compressed === false) A.addressType = "P2PKH";
                else A.addressType = "P2WPKH";
            }



            if (!["P2PKH", "PUBKEY", "P2WPKH", "P2SH_P2WPKH"].includes(A.addressType)) {
                throw new Error('address type invalid');
            }

            /**
             * address type (string)
             */
            this.type = A.addressType;
            if (this.type === 'PUBKEY') {
                this.publicKeyScript = BC([S.opPushData(this.publicKey.key), BF([O.OP_CHECKSIG])])
                this.publicKeyScriptHex = this.publicKeyScript.hex()
            }
            this.witnessVersion = (this.type === "P2WPKH") ? 0 : null;
            if (this.type === "P2SH_P2WPKH") {
                /**
                * flag for script hash address (boolean)
                */
                this.scriptHash = true;
                /**
                * redeeem script, only for P2SH_P2WPKH (bytes)
                */
                this.redeemScript = S.publicKeyTo_P2SH_P2WPKH_Script(this.publicKey.key);
                /**
                * redeeem script HEX, only for P2SH_P2WPKH (string)
                */
                this.redeemScriptHex = this.redeemScript.hex();
                /**
                * address hash
                */
                this.hash = S.hash160(this.redeemScript);
                this.witnessVersion = null;
            } else {
                this.scriptHash = false;
                this.hash = S.hash160(this.publicKey.key);
            }
            /**
             * address hash HEX (string)
             */
            this.hashHex = this.hash.hex();
            this.testnet = A.testnet;
            /**
             * address in base58 or bech32 encoding (string)
             */
            this.address = S.hashToAddress(this.hash, {
                scriptHash: this.scriptHash,
                witnessVersion: this.witnessVersion, testnet: this.testnet
            });
        }
    }

    Address.prototype.toString = function () {
        return `${this.address}`;
    };

    class ScriptAddress {
        constructor(s, A = {}) {
            defArgs(A, {witnessVersion: 0, testnet: false});
            this.witnessVersion = A.witnessVersion;
            this.testnet = A.testnet;
            s = getBuffer(s);
            this.script = s;
            this.scriptHex = s.hex();
            if (this.witnessVersion === null) this.hash = S.hash160(this.script);
            else this.hash = S.sha256(this.script);
            this.scriptOpcodes = S.decodeScript(this.script);
            this.scriptOpcodesAsm = S.decodeScript(this.script, {asm: true});
            this.address = S.hashToAddress(this.hash, {
                scriptHash: true,
                witnessVersion: this.witnessVersion, testnet: this.testnet
            });
        }

        static multisig(n, m, keyList, A = {}) {
            if ((n > 15) || (m > 15) || (n > m) || (n < 1) || (m < 1))
                throw new Error('invalid n of m maximum 15 of 15 multisig allowed');
            if (keyList.length !== m)
                throw new Error('invalid address list count');
            let s = [BF([0x50 + n])];
            for (let k of keyList) {
                if (S.isString(k)) {
                    if (S.isHex(k)) k = BF(k, 'hex');
                    else if (S.isWifValid(k)) k = S.privateToPublicKey(k, {hex: false});
                    else throw new Error('invalid key in key list');
                }
                if (k instanceof Address) k = k.publicKey.key;
                if (k instanceof PrivateKey) k = S.privateToPublicKey(k.publicKey.key);
                if (!Buffer.isBuffer(k)) k = BF(k);

                if (k.length === 32) k = S.privateToPublicKey(k);
                if (k.length !== 33) throw new Error('invalid public key list element size');
                s.push(BC([BF(S.intToVarInt(k.length)), k]));
            }
            s.push(BF([0x50 + m, O.OP_CHECKMULTISIG]))
            s = BC(s);
            return new ScriptAddress(s, A);
        }
    }

    ScriptAddress.prototype.toString = function () {
        return `${this.address}`;
    };

    S.PrivateKey = PrivateKey;
    S.PublicKey = PublicKey;
    S.ScriptAddress = ScriptAddress;
    S.Address = Address;
};


