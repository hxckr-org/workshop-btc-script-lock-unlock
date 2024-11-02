import { Network } from "bitcoinjs-lib";
import { script, payments, networks, opcodes, Payment, Psbt } from "bitcoinjs-lib";
import { TransactionInput } from "../types";
import varuint from "varuint-bitcoin";

const network: Network = networks.testnet;

class CustomSegWitTransaction {
  // Creates a custom locking script
  // adds two num and check that the sum is equal to 5
  createWitnessScript(): Buffer {
    const witnessScript = script.compile([
      // pass locking script here
      opcodes.OP_ADD,
      script.number.encode(5),
      opcodes.OP_EQUAL,
    ]);

    return witnessScript;
  }

  // Creates a P2WSH (Pay-to-Witness-Script-Hash) Payment instance
  createSegWitAddress(): Payment {
    const witnessScript = this.createWitnessScript();
    return payments.p2wsh({ redeem: { output: witnessScript, network }, network });
  }

  // Creates and signs a transaction
  createTransaction({
    input,
    output,
    recipientAddress,
    unlockingScript,
  }: {
    input: TransactionInput;
    output: Buffer;
    recipientAddress: string;
    unlockingScript: Buffer;
  }): {
    txHex: string;
  } {
    const psbt = new Psbt({ network });
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
    const finalizeInput = (_inputIndex: number, input: any) => {
      const redeemPayment = payments.p2wsh({
        redeem: {
          /** pass unlocking script here **/
          /** we need to expose this as an array users can pass their unlocking script to script **/
          input: unlockingScript,
          output: input.witnessScript,
        },
      });

      const finalScriptWitness = this.witnessStackToScriptWitness(redeemPayment.witness ?? []);

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

export default CustomSegWitTransaction;
