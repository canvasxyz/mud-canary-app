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

  const httpOnlyClient = createPublicClient({
    transport: fallback([http(network.networkConfig.provider.jsonRpcUrl)]),
    chain: {
      id: 31337,
      rpcUrl: "localhost:8545",
    },
  }).extend((client) => ({
    async createAccessList(args: CallParameters) {
      return client.request({
        method: "eth_createAccessList",
        params: [args, "latest"],
      })
    },
  }))

  const publicClient = createPublicClient({
    transport: fallback([
      webSocket(network.networkConfig.provider.wsRpcUrl),
      http(network.networkConfig.provider.jsonRpcUrl),
    ]),
    chain: {
      id: 31337,
      rpcUrl: "localhost:8545",
    },
  }).extend((client) => ({
    async traceCall(args: CallParameters) {
      return client.request({
        method: "debug_traceCall",
        params: [formatTransactionRequest(args), "latest", { code: "0x0" }],
      })
    },
  }))
  const walletClient = createWalletClient({
    transport: fallback([
      webSocket(network.networkConfig.provider.wsRpcUrl),
      http(network.networkConfig.provider.jsonRpcUrl),
    ]),
    account: privateKeyToAccount(network.networkConfig.privateKey),
    chain: {
      id: 31337,
      rpcUrl: "localhost:8545",
    },
  })

  return {
    network,
    components,
    systemCalls,
    httpOnlyClient,
    publicClient,
    walletClient,
  }
}
