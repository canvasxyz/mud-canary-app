import { createClientComponents } from "./createClientComponents"
import { createSystemCalls } from "./createSystemCalls"
import { setupNetwork } from "./setupNetwork"
import {
  createPublicClient,
  createWalletClient,
  http,
  webSocket,
  fallback,
  formatTransactionRequest,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"

export type SetupResult = Awaited<ReturnType<typeof setup>>

export async function setup() {
  const network = await setupNetwork()
  const components = createClientComponents(network)
  const systemCalls = createSystemCalls(network, components)

  return {
    network,
    components,
    systemCalls,
  }
}
