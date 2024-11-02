import ECPairFactory from "ecpair";
import BlockstreamApiConnector from "./blockstream";
import TransactionBuilder from "./segwit/custom-transactions";
import { Psbt, networks, payments, script } from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";

async function main() {
  const customTx = new TransactionBuilder();
  const address = "tb1qc86sv5kx92kne2fspyu908vf3yxhjcuwcvwu2x";
  // const network = networks.testnet;
  // const ECPair = ECPairFactory(ecc);
  // const keypair = ECPair.makeRandom({ network });

  const blockstreamConnector = new BlockstreamApiConnector(address);
  // const p2wsh = payments.p2wsh({
  //   redeem: { output: script.compile([Buffer.from("")]), network },
  //   network,
  // });
  // const p2wsh = payments.p2wsh({ pubkey: keypair.publicKey, network });

  const getTxHex = blockstreamConnector.checkUtxoInMempool().then(async (data) => {
    console.log(`Using UTXO ${data[0].txid}:${data[0].vout}`);

    const { txHex } = customTx.createTransactionB({
      input: data[0],
      recipientAddress: address,
    });

    return txHex;
  });

  const transactionHex = await getTxHex;
  console.log({ transactionHex });

  const txid = await blockstreamConnector.broadcastTransaction(transactionHex);
  console.log(`TXID is ${txid}`);
  console.log(">>>>>>>>>>>>>>>");
  console.log(`Success! broadcasted Txid is ${txid}`);
}

console.log(main());
