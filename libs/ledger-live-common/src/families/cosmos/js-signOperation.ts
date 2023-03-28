import type { Transaction } from "./types";
import { Observable } from "rxjs";
import { withDevice } from "../../hw/deviceAccess";
import { encodeOperationId } from "../../operation";
import { LedgerSigner } from "@cosmjs/ledger-amino";
import { stringToPath } from "@cosmjs/crypto";
import { buildTransaction, postBuildTransaction } from "./js-buildTransaction";
import BigNumber from "bignumber.js";
import { makeSignDoc } from "@cosmjs/launchpad";

import type {
  Account,
  Operation,
  OperationType,
  SignOperationEvent,
} from "@ledgerhq/types-live";
import { CosmosAPI } from "./api/Cosmos";
import { props } from "lodash/fp";
import { signedMsgTypeFromJSON } from "cosmjs-types/tendermint/types/types";

const signOperation = ({
  account,
  deviceId,
  transaction,
}: {
  account: Account;
  deviceId: any;
  transaction: Transaction;
}): Observable<SignOperationEvent> =>
  withDevice(deviceId)((transport) =>
    Observable.create((o) => {
      let cancelled;

      async function main() {
        const cosmosAPI = new CosmosAPI(account.currency.id);
        const { accountNumber, sequence } = await cosmosAPI.getAccount(
          account.freshAddress
        );
        o.next({ type: "device-signature-requested" });
        const { aminoMsgs, protoMsgs } = await buildTransaction(
          account,
          transaction
        );
        if (!transaction.gas) {
          throw new Error("transaction.gas is missing");
        }
        if (!transaction.fees) {
          throw new Error("transaction.fees is missing");
        }
        const feeToEncode = {
          amount: [
            {
              denom: account.currency.units[1].code,
              amount: transaction.fees.toString(),
            },
          ],
          gas: transaction.gas.toString(),
        };
        // Note:
        // Cosmos Nano App sign data in Amino way only, not Protobuf.
        // This is a legacy outdated standard and a long-term blocking point.
        const chainId = await cosmosAPI.getChainId();
        const signDoc = makeSignDoc(
          aminoMsgs,
          feeToEncode,
          chainId,
          transaction.memo || "",
          accountNumber.toString(),
          sequence.toString()
        );
        const ledgerSigner = new LedgerSigner(transport, {
          hdPaths: [stringToPath("m/" + account.freshAddressPath)],
          prefix: account.currency.id,
        });

        const signResponse = await ledgerSigner.signAmino(
          account.freshAddress,
          signDoc
        );
        const tx_bytes = await postBuildTransaction(signResponse, protoMsgs);
        const signed = Buffer.from(tx_bytes).toString("hex");

        if (cancelled) {
          return;
        }

        o.next({ type: "device-signature-granted" });

        const hash = ""; // resolved at broadcast time
        const accountId = account.id;
        const fee = transaction.fees || new BigNumber(0);
        const extra = {};

        const type: OperationType =
          transaction.mode === "undelegate"
            ? "UNDELEGATE"
            : transaction.mode === "delegate"
            ? "DELEGATE"
            : transaction.mode === "redelegate"
            ? "REDELEGATE"
            : ["claimReward", "claimRewardCompound"].includes(transaction.mode)
            ? "REWARD"
            : "OUT";

        const senders: string[] = [];
        const recipients: string[] = [];

        if (transaction.mode === "send") {
          senders.push(account.freshAddress);
          recipients.push(transaction.recipient);
        }

        if (transaction.mode === "redelegate") {
          Object.assign(extra, {
            sourceValidator: transaction.sourceValidator,
          });
        }

        if (transaction.mode !== "send") {
          Object.assign(extra, {
            validators: transaction.validators,
          });
        }

        // build optimistic operation
        const operation: Operation = {
          id: encodeOperationId(accountId, hash, type),
          hash,
          type,
          value:
            type === "REWARD"
              ? new BigNumber(0)
              : transaction.useAllAmount
              ? account.spendableBalance
              : transaction.amount.plus(fee),
          fee,
          extra,
          blockHash: null,
          blockHeight: null,
          senders,
          recipients,
          accountId,
          date: new Date(),
          transactionSequenceNumber: sequence,
        };

        o.next({
          type: "signed",
          signedOperation: {
            operation,
            signature: signed,
            expirationDate: null,
          },
        });
      }

      main().then(
        () => o.complete(),
        (e) => o.error(e)
      );

      return () => {
        cancelled = true;
      };
    })
  );

export default signOperation;

export const buildRawTx = async ({ account, transaction }) => {
  const cosmosAPI = new CosmosAPI(account.currency.id);
  const { accountNumber, sequence } = await cosmosAPI.getAccount(
    account.freshAddress
  );
  const { aminoMsgs, protoMsgs } = await buildTransaction(account, transaction);
  if (!transaction.gas) {
    throw new Error("transaction.gas is missing");
  }
  if (!transaction.fees) {
    throw new Error("transaction.fees is missing");
  }
  const feeToEncode = {
    amount: [
      {
        denom: account.currency.units[1].code,
        amount: transaction.fees.toString(),
      },
    ],
    gas: transaction.gas.toString(),
  };
  // Note:
  // Cosmos Nano App sign data in Amino way only, not Protobuf.
  // This is a legacy outdated standard and a long-term blocking point.
  const chainId = await cosmosAPI.getChainId();
  const signDoc = makeSignDoc(
    aminoMsgs,
    feeToEncode,
    chainId,
    transaction.memo || "",
    accountNumber.toString(),
    sequence.toString()
  );
  return {
    raw: serializeSignDoc(signDoc),
    assemble: async (signedResponse) => {
      const hash = ""; // resolved at broadcast time
      const accountId = account.id;
      const fee = transaction.fees || new BigNumber(0);
      const extra = {};

      const type: OperationType =
        transaction.mode === "undelegate"
          ? "UNDELEGATE"
          : transaction.mode === "delegate"
          ? "DELEGATE"
          : transaction.mode === "redelegate"
          ? "REDELEGATE"
          : ["claimReward", "claimRewardCompound"].includes(transaction.mode)
          ? "REWARD"
          : "OUT";

      const senders: string[] = [];
      const recipients: string[] = [];

      if (transaction.mode === "send") {
        senders.push(account.freshAddress);
        recipients.push(transaction.recipient);
      }

      if (transaction.mode === "redelegate") {
        Object.assign(extra, {
          sourceValidator: transaction.sourceValidator,
        });
      }

      if (transaction.mode !== "send") {
        Object.assign(extra, {
          validators: transaction.validators,
        });
      }

      // build optimistic operation
      const operation: Operation = {
        id: encodeOperationId(accountId, hash, type),
        hash,
        type,
        value:
          type === "REWARD"
            ? new BigNumber(0)
            : transaction.useAllAmount
            ? account.spendableBalance
            : transaction.amount.plus(fee),
        fee,
        extra,
        blockHash: null,
        blockHeight: null,
        senders,
        recipients,
        accountId,
        date: new Date(),
        transactionSequenceNumber: sequence,
      };
      const signedBuffer = await postBuildTransaction(
        { signature: signedResponse, signed: signDoc },
        protoMsgs
      );
      const built = {
        operation,
        signature: Buffer.from(signedBuffer).toString("hex"),
        expirationDate: null,
      };
      console.log({ built });
      return built;
    },
  };
};

// those functions come from cosmosjs

export function sortedJsonStringify(obj: any): string {
  return JSON.stringify(sortedObject(obj));
}
export function serializeSignDoc(signDoc: any): Uint8Array {
  return toUtf8(sortedJsonStringify(signDoc));
}
function sortedObject(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortedObject);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, any> = {};
  // NOTE: Use forEach instead of reduce for performance with large objects eg Wasm code
  sortedKeys.forEach((key) => {
    result[key] = sortedObject(obj[key]);
  });
  return result;
}
export function toUtf8(str: string): Uint8Array {
  // Browser and future nodejs (https://github.com/nodejs/node/issues/20365)
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str);
  }

  // Use Buffer hack instead of nodejs util.TextEncoder to ensure
  // webpack does not bundle the util module for browsers.
  return new Uint8Array(Buffer.from(str, "utf8"));
}
