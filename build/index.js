"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const blockstream_1 = __importDefault(require("./blockstream"));
const custom_transactions_1 = __importDefault(require("./segwit/custom-transactions"));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const customTx = new custom_transactions_1.default();
        const address = "tb1qc86sv5kx92kne2fspyu908vf3yxhjcuwcvwu2x";
        // const network = networks.testnet;
        // const ECPair = ECPairFactory(ecc);
        // const keypair = ECPair.makeRandom({ network });
        const blockstreamConnector = new blockstream_1.default(address);
        // const p2wsh = payments.p2wsh({
        //   redeem: { output: script.compile([Buffer.from("")]), network },
        //   network,
        // });
        // const p2wsh = payments.p2wsh({ pubkey: keypair.publicKey, network });
        const getTxHex = blockstreamConnector.checkUtxoInMempool().then((data) => __awaiter(this, void 0, void 0, function* () {
            console.log(`Using UTXO ${data[0].txid}:${data[0].vout}`);
            const { txHex } = customTx.createTransactionB({
                input: data[0],
                recipientAddress: address,
            });
            return txHex;
        }));
        const transactionHex = yield getTxHex;
        console.log({ transactionHex });
        const txid = yield blockstreamConnector.broadcastTransaction(transactionHex);
        console.log(`TXID is ${txid}`);
        console.log(">>>>>>>>>>>>>>>");
        console.log(`Success! broadcasted Txid is ${txid}`);
    });
}
console.log(main());
