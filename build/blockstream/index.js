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
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const api_instance = new axios_1.Axios({ baseURL: `https://blockstream.info/testnet/api` });
class BlockstreamApiConnector {
    constructor(address) {
        this.address = address;
    }
    checkUtxoInMempool() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let intervalId;
                const checkUtxoStatus = () => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const response = yield api_instance.get(`/address/${this.address}/utxo`);
                        const data = response.data ? JSON.parse(response.data) : [];
                        if (data.length > 0) {
                            clearInterval(intervalId);
                            resolve(data);
                        }
                    }
                    catch (error) {
                        reject(error);
                        clearInterval(intervalId);
                    }
                });
                intervalId = setInterval(checkUtxoStatus, 1000);
            }));
        });
    }
    broadcastTransaction(transactionHex) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield api_instance.post(`/tx`, transactionHex);
            return response.data;
        });
    }
}
exports.default = BlockstreamApiConnector;
