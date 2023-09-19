import { createClientComponents } from "./createClientComponents"
import { createSystemCalls } from "./createSystemCalls"
import { setupNetwork } from "./setupNetwork"
import {
  createPublicClient,
  createWalletClient,
  http,
  webSocket,
  fallback,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"

export type SetupResult = Awaited<ReturnType<typeof setup>>

export async function setup() {
  const network = await setupNetwork()
  const components = createClientComponents(network)
  const systemCalls = createSystemCalls(network, components)

  const publicClient = createPublicClient({
    transport: fallback([
      webSocket(network.networkConfig.provider.wsRpcUrl),
      http(network.networkConfig.provider.jsonRpcUrl),
    ]),
  })
  const walletClient = createWalletClient({
    transport: fallback([
      webSocket(network.networkConfig.provider.wsRpcUrl),
      http(network.networkConfig.provider.jsonRpcUrl),
    ]),
    account: privateKeyToAccount(network.networkConfig.privateKey),
  })

  return {
    network,
    components,
    systemCalls,
    publicClient,
    walletClient,
  }
}
