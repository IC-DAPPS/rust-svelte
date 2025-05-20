import { createAgent } from "@dfinity/utils";
import { AnonymousIdentity, Actor } from "@dfinity/agent";
import type { ActorSubclass, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/backend";
import { HOST as host, FETCH_ROOT_KEY as fetchRootKey } from "./const";
import type { _SERVICE } from "../../../declarations/backend/backend.did";

async function setupAgent(): Promise<HttpAgent> {
  const arg = {
    host,
    identity: new AnonymousIdentity(),
    fetchRootKey,
  };

  return await createAgent(arg);
}

async function setupActor(): Promise<ActorSubclass<_SERVICE>> {
  const agent = await setupAgent();

  const canisterId = process.env.CANISTER_ID_BACKEND;
  if (!canisterId) {
    throw new Error("CANISTER_ID_BACKEND is not set");
  }

  const actor = Actor.createActor<_SERVICE>(idlFactory, {
    canisterId,
    agent,
    callTransform: (args) => {
      console.log("callTransform - Original args:", JSON.stringify(args));
      return args;
    },
  });

  return actor;
}

export const backendActor = await setupActor();