import ECPairFactory from "ecpair";
import { Psbt, networks, opcodes, payments, script } from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import varuint from "varuint-bitcoin";

interface TransactionInput {
  txid: string;
  vout: number;
  value: number;
}

class TransactionBuilder {
  createTransactionA() {}

  /**
   * Creates a transaction with custom witness data containing a pincode and public key
   * The witness data is properly sized to avoid buffer overflow errors
   */
  createTransactionB({ input, recipientAddress }: { input: TransactionInput; recipientAddress: string }) {
    const pincode = "BTrust";

    const network = networks.testnet;
    const ECPair = ECPairFactory(ecc);
    const keypair = ECPair.makeRandom({ network });

    const psbt = new Psbt({ network });
    const emptyWitnessScript = Buffer.from([0x51]);

    const p2wsh = payments.p2wsh({
      redeem: { output: emptyWitnessScript, network },
      network,
    });

    // Add input
    psbt.addInput({
      hash: input.txid,
      index: input.vout,
      witnessUtxo: {
        script: p2wsh.output!,
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
  witnessStackToScriptWitness(witness: Buffer[]) {
    let buffer = Buffer.allocUnsafe(0);

    function writeSlice(slice: Buffer) {
      buffer = Buffer.concat([buffer, Buffer.from(slice)]);
    }

    function writeVarInt(i: number) {
      const currentLen = buffer.length;
      const varintLen = varuint.encodingLength(i);

      buffer = Buffer.concat([buffer, Buffer.allocUnsafe(varintLen)]);
      varuint.encode(i, buffer, currentLen);
    }

    function writeVarSlice(slice: Buffer) {
      writeVarInt(slice.length);
      writeSlice(slice);
    }

    function writeVector(vector: Buffer[]) {
      writeVarInt(vector.length);
      vector.forEach(writeVarSlice);
    }

    writeVector(witness);

    return buffer;
  }
}

export default TransactionBuilder;
