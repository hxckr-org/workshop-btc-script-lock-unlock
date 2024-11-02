"use strict";
// complex multisig script with three spending conditions
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecpair_1 = require("ecpair");
const ecc = __importStar(require("tiny-secp256k1"));
// Initialize ECPair factory
const ECPair = (0, ecpair_1.ECPairFactory)(ecc);
// Define network (testnet for development)
const network = bitcoin.networks.testnet;
class AdvancedSegWitTransaction {
    constructor(numKeys = 3) {
        this.keyPairs = Array(numKeys)
            .fill(0)
            .map(() => ECPair.makeRandom({ network }));
        this.publicKeys = this.keyPairs.map((kp) => kp.publicKey);
    }
    createAdvancedWitnessScript(multisigConfig, timeLockHeight, hashLock) {
        const script = bitcoin.script.compile([
            bitcoin.opcodes.OP_IF,
            bitcoin.opcodes.OP_IF,
            bitcoin.script.number.encode(timeLockHeight),
            bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
            bitcoin.opcodes.OP_DROP,
            this.publicKeys[0],
            bitcoin.opcodes.OP_CHECKSIG,
            bitcoin.opcodes.OP_ELSE,
            bitcoin.script.number.encode(multisigConfig.requiredSignatures),
            ...multisigConfig.publicKeys,
            bitcoin.script.number.encode(multisigConfig.publicKeys.length),
            bitcoin.opcodes.OP_CHECKMULTISIG,
            bitcoin.opcodes.OP_ENDIF,
            bitcoin.opcodes.OP_ELSE,
            bitcoin.opcodes.OP_SIZE,
            bitcoin.script.number.encode(32),
            bitcoin.opcodes.OP_EQUALVERIFY,
            bitcoin.opcodes.OP_SHA256,
            hashLock,
            bitcoin.opcodes.OP_EQUALVERIFY,
            this.publicKeys[0],
            bitcoin.opcodes.OP_CHECKSIG,
            bitcoin.opcodes.OP_ENDIF,
        ]);
        return script;
    }
    createTransaction(input_1, recipientAddress_1, spendingPath_1) {
        return __awaiter(this, arguments, void 0, function* (input, recipientAddress, spendingPath, options = {}) {
            const witnessScript = this.createAdvancedWitnessScript({ publicKeys: this.publicKeys.slice(0, 3), requiredSignatures: 2 }, 600000, // how do I determine the correct locktime ?
            // bitcoin.script.number.encode(600000),
            Buffer.from("1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", "hex"));
            const psbt = new bitcoin.Psbt({ network });
            psbt.addInput({
                hash: input.txid,
                index: input.vout,
                witnessScript,
                witnessUtxo: {
                    script: bitcoin.payments.p2wsh({ redeem: { output: witnessScript, network }, network }).output,
                    value: input.value,
                },
                sequence: spendingPath === "timelock" ? 0xfffffffe : 0xffffffff,
            });
            psbt.addOutput({
                address: recipientAddress,
                value: input.value - 1000,
            });
            if (spendingPath === "timelock" && options.locktime) {
                psbt.setLocktime(options.locktime);
            }
            // Sign input using the appropriate key
            if (spendingPath === "multisig") {
                if (!options.signatures || options.signatures.length < 2) {
                    throw new Error("Multisig requires at least 2 signatures");
                }
                yield Promise.all(this.keyPairs.slice(0, 2).map((kp, index) => __awaiter(this, void 0, void 0, function* () {
                    yield psbt.signInputAsync(0, kp);
                })));
            }
            else if (spendingPath === "timelock" || spendingPath === "hashlock") {
                yield psbt.signInputAsync(0, this.keyPairs[0]);
            }
            psbt.finalizeAllInputs();
            const tx = psbt.extractTransaction();
            // Create witness stack for specific spending path
            let witnessStack;
            switch (spendingPath) {
                case "multisig":
                    witnessStack = [Buffer.from(""), ...options.signatures, witnessScript];
                    break;
                case "timelock":
                    const timelockSig = this.keyPairs[0].sign(tx.hashForWitnessV0(0, witnessScript, input.value, bitcoin.Transaction.SIGHASH_ALL));
                    witnessStack = [bitcoin.script.signature.encode(timelockSig, bitcoin.Transaction.SIGHASH_ALL), witnessScript];
                    break;
                case "hashlock":
                    if (!options.preimage)
                        throw new Error("Hashlock requires a preimage");
                    const hashlockSig = this.keyPairs[0].sign(tx.hashForWitnessV0(0, witnessScript, input.value, bitcoin.Transaction.SIGHASH_ALL));
                    witnessStack = [bitcoin.script.signature.encode(hashlockSig, bitcoin.Transaction.SIGHASH_ALL), options.preimage, witnessScript];
                    break;
                default:
                    throw new Error("Invalid spending path");
            }
            return {
                txHex: tx.toHex(),
                witnessStack,
            };
        });
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const tx = new AdvancedSegWitTransaction();
        const input = {
            txid: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            vout: 0,
            value: 100000,
        };
        const { txHex, witnessStack } = yield tx.createTransaction(input, "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx", "multisig", {
            signatures: [
                Buffer.from("304402200d...", "hex"), // example signature 1
                Buffer.from("3045022100...", "hex"), // example signature 2
            ],
        });
        console.log("Transaction Hex:", txHex);
        console.log("Witness Stack:", witnessStack);
    });
}
main().catch(console.error);
