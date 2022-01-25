import Polkadot from "@ledgerhq/hw-app-polkadot";
import type { Resolver } from "../../hw/getAddress/types";

const resolver: Resolver = async (transport, { path, verify }) => {
  const polkadot = new Polkadot(transport);
  const r = await polkadot.getAddress(path, verify);
  return {
    address: r.address,
    publicKey: r.pubKey,
    path,
  };
};

export default resolver;
