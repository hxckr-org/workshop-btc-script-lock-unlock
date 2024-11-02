import { Axios, AxiosResponse } from "axios";
import { Utxo } from "../types";

const api_instance = new Axios({ baseURL: `https://blockstream.info/testnet/api` });

class BlockstreamApiConnector {
  private address: string;

  constructor(address: string) {
    this.address = address;
  }

  async checkUtxoInMempool() {
    return new Promise<Utxo[]>(async (resolve, reject) => {
      let intervalId: any;

      const checkUtxoStatus = async () => {
        try {
          const response: AxiosResponse<string> = await api_instance.get(`/address/${this.address}/utxo`);
          const data = response.data ? JSON.parse(response.data) : [];

          if (data.length > 0) {
            clearInterval(intervalId);
            resolve(data);
          }
        } catch (error) {
          reject(error);
          clearInterval(intervalId);
        }
      };

      intervalId = setInterval(checkUtxoStatus, 1000);
    });
  }

  async broadcastTransaction(transactionHex: string) {
    const response: AxiosResponse<string> = await api_instance.post(`/tx`, transactionHex);

    return response.data;
  }
}

export default BlockstreamApiConnector;
