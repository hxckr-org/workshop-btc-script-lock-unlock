// complex multisig script with three spending conditions

import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory, ECPairInterface } from "ecpair";
import * as ecc from "tiny-secp256k1";

// Initialize ECPair factory
const ECPair = ECPairFactory(ecc);

// Define network (testnet for development)
const network = bitcoin.networks.testnet;

interface TransactionInput {
  txid: string;
  vout: number;
  value: number;
}

interface MultisigConfig {
  publicKeys: Buffer[];
  requiredSignatures: number;
}

class AdvancedSegWitTransaction {
  private keyPairs: ECPairInterface[];
  private publicKeys: Buffer[];

  constructor(numKeys: number = 3) {
    this.keyPairs = Array(numKeys)
      .fill(0)
      .map(() => ECPair.makeRandom({ network }));
    this.publicKeys = this.keyPairs.map((kp) => kp.publicKey);
  }

  createAdvancedWitnessScript(multisigConfig: MultisigConfig, timeLockHeight: number, hashLock: Buffer): Buffer {
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

  async createTransaction(
    input: TransactionInput,
    recipientAddress: string,
    spendingPath: "multisig" | "timelock" | "hashlock",
    options: {
      signatures?: Buffer[];
      preimage?: Buffer;
      locktime?: number;
    } = {}
  ): Promise<{ txHex: string; witnessStack: Buffer[] }> {
    const witnessScript = this.createAdvancedWitnessScript(
      { publicKeys: this.publicKeys.slice(0, 3), requiredSignatures: 2 },
      600000, // how do I determine the correct locktime ?
      // bitcoin.script.number.encode(600000),
      Buffer.from("1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef", "hex")
    );

    const psbt = new bitcoin.Psbt({ network });

    psbt.addInput({
      hash: input.txid,
      index: input.vout,
      witnessScript,
      witnessUtxo: {
        script: bitcoin.payments.p2wsh({ redeem: { output: witnessScript, network }, network }).output!,
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
      await Promise.all(
        this.keyPairs.slice(0, 2).map(async (kp, index) => {
          await psbt.signInputAsync(0, kp);
        })
      );
    } else if (spendingPath === "timelock" || spendingPath === "hashlock") {
      await psbt.signInputAsync(0, this.keyPairs[0]);
    }

    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();

    // Create witness stack for specific spending path
    let witnessStack: Buffer[];
    switch (spendingPath) {
      case "multisig":
        witnessStack = [Buffer.from(""), ...options.signatures!, witnessScript];
        break;
      case "timelock":
        const timelockSig = this.keyPairs[0].sign(tx.hashForWitnessV0(0, witnessScript, input.value, bitcoin.Transaction.SIGHASH_ALL));
        witnessStack = [bitcoin.script.signature.encode(timelockSig, bitcoin.Transaction.SIGHASH_ALL), witnessScript];
        break;
      case "hashlock":
        if (!options.preimage) throw new Error("Hashlock requires a preimage");
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
  }
}

async function main() {
  const tx = new AdvancedSegWitTransaction();
  const input: TransactionInput = {
    txid: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    vout: 0,
    value: 100000,
  };

  const { txHex, witnessStack } = await tx.createTransaction(input, "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx", "multisig", {
    signatures: [
      Buffer.from("304402200d...", "hex"), // example signature 1
      Buffer.from("3045022100...", "hex"), // example signature 2
    ],
  });

  console.log("Transaction Hex:", txHex);
  console.log("Witness Stack:", witnessStack);
}

main().catch(console.error);
