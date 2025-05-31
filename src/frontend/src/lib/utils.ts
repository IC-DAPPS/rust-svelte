import { AnonymousIdentity } from "@dfinity/agent";
import type { Identity } from "@dfinity/agent";

export const anonymousIdentity = () => {
  const anon = new AnonymousIdentity();
  return anon.getPrincipal().toText();
};

// Get principal from any identity (anonymous or II)
export const getPrincipalFromIdentity = (identity: Identity) => {
  return identity.getPrincipal().toText();
};
