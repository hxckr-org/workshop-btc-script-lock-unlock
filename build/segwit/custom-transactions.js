"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ecpair_1 = __importDefault(require("ecpair"));
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const ecc = __importStar(require("tiny-secp256k1"));
const varuint_bitcoin_1 = __importDefault(require("varuint-bitcoin"));
class TransactionBuilder {
    createTransactionA() { }
    /**
     * Creates a transaction with custom witness data containing a pincode and public key
     * The witness data is properly sized to avoid buffer overflow errors
     */
    createTransactionB({ input, recipientAddress }) {
        const pincode = "BTrust";
        const network = bitcoinjs_lib_1.networks.testnet;
        const ECPair = (0, ecpair_1.default)(ecc);
        const keypair = ECPair.makeRandom({ network });
        const psbt = new bitcoinjs_lib_1.Psbt({ network });
        const emptyWitnessScript = Buffer.from([0x51]);
        const p2wsh = bitcoinjs_lib_1.payments.p2wsh({
            redeem: { output: emptyWitnessScript, network },
            network,
        });
        // Add input
        psbt.addInput({
            hash: input.txid,
            index: input.vout,
            witnessUtxo: {
                script: p2wsh.output,
                value: input.value,
            },
            witnessScript: emptyWitnessScript,
        });
        console.log("Generated P2WSH Address (no conditions):", p2wsh.address);
        // Add output (sending slightly less than input value to account for fees)
        psbt.addOutput({
            address: recipientAddress,
            value: input.value - 200, // Subtract fee
        });
        // const finalizeInput = (_inputIndex: number, input: any) => {
        //   const redeemPayment = payments.p2wsh({
        //     redeem: {
        //       /** pass unlocking script here **/
        //       /** we need to expose this as an array users can pass their unlocking script to script **/
        //       input: script.compile([Buffer.from("")]),
        //       output: input.witnessScript,
        //     },
        //     witness: [Buffer.from(pincode), keypair.publicKey],
        //   });
        //   const finalScriptWitness = this.witnessStackToScriptWitness(redeemPayment.witness ?? []);
        //   return {
        //     finalScriptSig: Buffer.from(""),
        //     finalScriptWitness,
        //   };
        // };
        // psbt.finalizeInput(0, () => {
        //   // input.witness = [Buffer.from(pincode), keypair.publicKey];
        //   const finalScriptWitness = this.witnessStackToScriptWitness([Buffer.from(pincode), keypair.publicKey]);
        //   return {
        //     finalScriptSig: Buffer.from(""),
        //     finalScriptWitness,
        //   };
        // });
        // psbt.finalizeInput(0, () => {
        //   const pinBuffer = Buffer.from(pincode);
        //   const publicKeyBuffer = keypair.publicKey;
        //   return {
        //     finalScriptSig: undefined,
        //     finalScriptWitness: Buffer.concat([Buffer.from([pinBuffer.length]), pinBuffer, Buffer.from([publicKeyBuffer.length]), publicKeyBuffer]),
        //   };
        // });
        psbt.finalizeInput(0, () => {
            const pinBuffer = Buffer.from(pincode);
            const publicKeyBuffer = keypair.publicKey;
            return {
                finalScriptSig: undefined,
                finalScriptWitness: Buffer.concat([Buffer.from([pinBuffer.length]), pinBuffer, Buffer.from([publicKeyBuffer.length]), publicKeyBuffer]),
            };
        });
        // Extract the transaction in hex format
        const txHex = psbt.extractTransaction().toHex();
        console.log("Transaction Hex:", txHex);
        return {
            txHex,
        };
    }
    // createTransactionB({ input, output, recipientAddress }: { input: TransactionInput; output: Buffer; recipientAddress: string }) {
    //   const pincode = "BTrust";
    //   const network = networks.testnet;
    //   const ECPair = ECPairFactory(ecc);
    //   const keypair = ECPair.makeRandom({ network });
    //   const psbt = new Psbt({ network });
    //   // Add input
    //   psbt.addInput({
    //     hash: input.txid,
    //     index: input.vout,
    //     witnessScript: script.compile([Buffer.from(""), opcodes.OP_EQUAL]),
    //     // witnessScript: Buffer.from(""),
    //     witnessUtxo: {
    //       script: output,
    //       // script: p2wpkh.output!,
    //       value: input.value,
    //     },
    //   });
    //   // Add output (sending slightly less than input value to account for fees)
    //   psbt.addOutput({
    //     address: recipientAddress,
    //     value: input.value - 200, // Subtract fee
    //   });
    //   const finalizeInput = (_inputIndex: number, input: any) => {
    //     const redeemPayment = payments.p2wsh({
    //       redeem: {
    //         /** pass unlocking script here **/
    //         /** we need to expose this as an array users can pass their unlocking script to script **/
    //         input: script.compile([Buffer.from("")]),
    //         output: input.witnessScript,
    //       },
    //       witness: [Buffer.from(pincode), keypair.publicKey],
    //     });
    //     const finalScriptWitness = this.witnessStackToScriptWitness(redeemPayment.witness ?? []);
    //     return {
    //       finalScriptSig: Buffer.from(""),
    //       finalScriptWitness,
    //     };
    //   };
    //   psbt.finalizeInput(0, finalizeInput);
    //   // const tx = psbt.extractTransaction();
    //   // Extract the transaction in hex format
    //   const txHex = psbt.extractTransaction().toHex();
    //   console.log("Transaction Hex:", txHex);
    //   return {
    //     txHex,
    //   };
    // }
    /**
     * Helper function that produces a serialized witness script
     * https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/csv.spec.ts#L477
     */
    witnessStackToScriptWitness(witness) {
        let buffer = Buffer.allocUnsafe(0);
        function writeSlice(slice) {
            buffer = Buffer.concat([buffer, Buffer.from(slice)]);
        }
        function writeVarInt(i) {
            const currentLen = buffer.length;
            const varintLen = varuint_bitcoin_1.default.encodingLength(i);
            buffer = Buffer.concat([buffer, Buffer.allocUnsafe(varintLen)]);
            varuint_bitcoin_1.default.encode(i, buffer, currentLen);
        }
        function writeVarSlice(slice) {
            writeVarInt(slice.length);
            writeSlice(slice);
        }
        function writeVector(vector) {
            writeVarInt(vector.length);
            vector.forEach(writeVarSlice);
        }
        writeVector(witness);
        return buffer;
    }
}
exports.default = TransactionBuilder;
