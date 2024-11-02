"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const varuint_bitcoin_1 = __importDefault(require("varuint-bitcoin"));
const network = bitcoinjs_lib_1.networks.testnet;
class CustomSegWitTransaction {
    // Creates a custom locking script
    // adds two num and check that the sum is equal to 5
    createWitnessScript() {
        const witnessScript = bitcoinjs_lib_1.script.compile([
            // pass locking script here
            bitcoinjs_lib_1.opcodes.OP_ADD,
            bitcoinjs_lib_1.script.number.encode(5),
            bitcoinjs_lib_1.opcodes.OP_EQUAL,
        ]);
        return witnessScript;
    }
    // Creates a P2WSH (Pay-to-Witness-Script-Hash) Payment instance
    createSegWitAddress() {
        const witnessScript = this.createWitnessScript();
        return bitcoinjs_lib_1.payments.p2wsh({ redeem: { output: witnessScript, network }, network });
    }
    // Creates and signs a transaction
    createTransaction({ input, output, recipientAddress, unlockingScript, }) {
        const psbt = new bitcoinjs_lib_1.Psbt({ network });
        const witnessScript = this.createWitnessScript();
        // Add input
        psbt.addInput({
            hash: input.txid,
            index: input.vout,
            witnessScript,
            witnessUtxo: {
                script: output,
                value: input.value,
            },
        });
        // Add output (sending slightly less than input value to account for fees)
        psbt.addOutput({
            address: recipientAddress,
            value: input.value - 1000, // Subtract fee
        });
        // finalize input section:
        // 1. Create redeem script to sign psbt and spend the transaction
        const finalizeInput = (_inputIndex, input) => {
            var _a;
            const redeemPayment = bitcoinjs_lib_1.payments.p2wsh({
                redeem: {
                    /** pass unlocking script here **/
                    /** we need to expose this as an array users can pass their unlocking script to script **/
                    input: unlockingScript,
                    output: input.witnessScript,
                },
            });
            const finalScriptWitness = this.witnessStackToScriptWitness((_a = redeemPayment.witness) !== null && _a !== void 0 ? _a : []);
            return {
                finalScriptSig: Buffer.from(""),
                finalScriptWitness,
            };
        };
        psbt.finalizeInput(0, finalizeInput);
        const tx = psbt.extractTransaction();
        return {
            txHex: tx.toHex(),
        };
    }
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
exports.default = CustomSegWitTransaction;
