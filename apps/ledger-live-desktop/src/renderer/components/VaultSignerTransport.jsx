// @flow

import React, { useEffect } from "react";
import { registerTransportModule } from "@ledgerhq/live-common/hw/index";
import Tr, { VaultTransport } from "@ledgerhq/hw-transport-http";
import { useSelector } from "react-redux";
import { vaultSignerSelector } from "~/renderer/reducers/settings";

const VaultSignerTransport = () => {
  const { token, host, workspace } = useSelector(vaultSignerSelector);
  console.log({ VaultTransport, Tr });
  useEffect(() => {
    registerTransportModule({
      id: "vault-transport",
      open: (id: string) => {
        if (id !== "vault-transport") return;
        console.log({ host, token, workspace });
        try {
          return VaultTransport.open(host).then(transport => {
            transport.setData({ token, workspace });
            return Promise.resolve(transport);
          });
        } catch (e) {
          console.error(e);
        }
      },
      disconnect: () => Promise.resolve(),
    });
  }, [host, token, workspace]);

  return null;
};

export default VaultSignerTransport;
