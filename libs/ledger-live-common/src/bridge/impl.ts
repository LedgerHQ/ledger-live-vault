import { CurrencyNotSupported } from "@ledgerhq/errors";

import { decodeAccountId, getMainAccount } from "../account";
import axios from "axios";
import { getEnv } from "../env";
import { checkAccountSupported } from "../account/index";
import jsBridges from "../generated/bridge/js";
import mockBridges from "../generated/bridge/mock";
import type { CryptoCurrency } from "@ledgerhq/types-cryptoassets";
import { from, Observable } from "rxjs";
import {
  Account,
  AccountBridge,
  AccountLike,
  CurrencyBridge,
} from "@ledgerhq/types-live";

export const getCurrencyBridge = (currency: CryptoCurrency): CurrencyBridge => {
  if (getEnv("MOCK")) {
    const mockBridge = mockBridges[currency.family];
    if (mockBridge) return mockBridge.currencyBridge;
    throw new CurrencyNotSupported(
      "no mock implementation available for currency " + currency.id,
      {
        currencyName: currency.name,
      }
    );
  }

  const jsBridge = jsBridges[currency.family];
  if (jsBridge) {
    return jsBridge.currencyBridge;
  }

  throw new CurrencyNotSupported(
    "no implementation available for currency " + currency.id,
    {
      currencyName: currency.name,
    }
  );
};
export const getAccountBridge = (
  account: AccountLike,
  parentAccount?: Account | null
): AccountBridge<any> => {
  const mainAccount = getMainAccount(account, parentAccount);
  const { currency } = mainAccount;
  const { family } = currency;
  const { type } = decodeAccountId(mainAccount.id);
  const supportedError = checkAccountSupported(mainAccount);

  if (supportedError) {
    throw supportedError;
  }

  if (type === "mock") {
    const mockBridge = mockBridges[currency.family];
    if (mockBridge) return mockBridge.accountBridge;
  }

  const jsBridge = jsBridges[family];
  if (jsBridge)
    return {
      ...jsBridge.accountBridge,
      ...vaultAccountBridge(jsBridge.accountBridge),
    };
  throw new CurrencyNotSupported("currency not supported " + currency.id, {
    currencyName: mainAccount.currency.name,
  });
};

const vaultAccountBridge = (liveBridge) => ({
  signOperation: ({ account, transaction }) =>
    Observable.create((o) => {
      const fn = async () => {
        const { raw, assemble } = await liveBridge.buildRawTx({
          account,
          transaction,
        });
        const raw_signing_tx = Buffer.from(raw).toString("hex");
        console.log({ raw_signing_tx, transaction, account });
        const { data } = await axios.post(
          `${API}/requests`,
          {
            type: "CREATE_TRANSACTION",
            account_id: accountID,
            transaction: {
              raw_signing_tx,
              type: "RAW_SIGNING",
              note: {
                title: "",
                content: "",
              },
            },
          },
          {
            headers: {
              "X-Ledger-Auth": token,
            },
          }
        );
        const id = data.target_id;
        let vaultTx: { signature?: any } = {};
        while (!vaultTx.signature) {
          await delay(5000);
          const { data } = await axios.get(`${API}/transactions/${id}`, {
            withCredentials: true,
            headers: {
              "X-Ledger-Auth": token,
            },
          });
          vaultTx = data;
        }

        const vaultSignature = vaultTx.signature[0];
        // const liveSignature = vaultSignature.der;
        const v = Buffer.concat([
          Buffer.from(vaultSignature.r, "base64"),
          Buffer.from(vaultSignature.s, "base64"),
        ]);

        console.log(v.toString("hex"));
        console.log(vaultSignature.der);
        // export interface StdSignature {
        //     readonly pub_key: Pubkey;
        //     readonly signature: string;
        // }
        const signResponse = {
          pub_key: {
            type: "tendermint/PubKeySecp256k1",
            value: Buffer.from(
              "026F6338ABBA04E55F06001EBCB2037F7A743B79428245074B44E599C34445CD63"
            ).toString("base64"),
          },
          signature: v.toString("base64"),
        };
        console.log({ signResponse });

        const signedOperation = await assemble(signResponse);
        console.log({ signedOperation });

        o.next({
          type: "signed",
          signedOperation,
        });
      };

      fn().then(() => o.complete());
    }),
});

const accountID = 3;
const token = "7SuVVyBU/ZIZaxjoUejGKGFNwzR2PdVaEly7pagDKAs=";
const API = "https://hw1.minivault.ledger-sbx.com/gate/minivault";

export const delay = (ms: number): Promise<any> =>
  new Promise((success) => setTimeout(success, ms));
