import Transport from "@ledgerhq/hw-transport";
import { TransportError } from "@ledgerhq/errors";
import axios from "axios";
import { log } from "@ledgerhq/logs";

type VaultData = {
  token: string;
  workspace: string;
};

export default class VaultTransport extends Transport {
  static isSupported = (): Promise<boolean> =>
    Promise.resolve(typeof fetch === "function");
  // this transport is not discoverable
  static list = (): any => Promise.resolve([]);
  static listen = (_observer: any) => ({
    unsubscribe: () => {},
  });
  static check = async (url: string, timeout = 5000) => {
    const response = await axios({
      url,
      timeout,
    });

    if (response.status !== 200) {
      throw new TransportError(
        "failed to access VaultTransport(" +
          url +
          "): status " +
          response.status,
        "HttpTransportNotAccessible"
      );
    }
  };

  static async open(url: string, timeout?: number): Promise<Transport> {
    await VaultTransport.check(url, timeout);
    return new VaultTransport(url);
  }

  url: string;

  data: VaultData | null;

  constructor(url: string) {
    super();
    this.url = url;
    this.data = null;
  }

  setData(data: VaultData): void {
    this.data = data;
  }

  async exchange(apdu: Buffer): Promise<Buffer> {
    if (!this.data) {
      throw new TransportError(
        "No vault data (token/workspace) defined!",
        "VaultTransport"
      );
    }
    const apduHex = apdu.toString("hex");
    log("apdu", "=> " + apduHex);
    const response = await axios({
      method: "POST",
      url: this.url,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Ledger-Workspace": this.data.workspace,
        "X-Ledger-Token": this.data.token,
      },
      data: JSON.stringify({
        apduHex,
      }),
    });

    if (response.status !== 200) {
      throw new TransportError(
        "failed to communicate to server. code=" + response.status,
        "HttpTransportStatus" + response.status
      );
    }

    const body: any = await response.data;
    if (body.error) throw body.error;
    log("apdu", "<= " + body.data);
    return Buffer.from(body.data, "hex");
  }

  setScrambleKey(): void {}

  close(): Promise<void> {
    return Promise.resolve();
  }
}
