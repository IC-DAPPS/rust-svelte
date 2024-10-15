import { toastsStore } from "@dfinity/gix-components";
import { backendActor } from "./agent";

export async function get(): Promise<string> {
  const result = await backendActor.get_principal_data();

  if ("Err" in result) {
    toastsStore.show({
      text: "Network error",
      level: "error",
    });
    throw new Error("failed to call IC from `get`");
  }

  return result.Ok;
}

export async function set(value: string) {
  await backendActor.set_principal_data(value);
}
