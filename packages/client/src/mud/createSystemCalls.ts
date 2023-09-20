import { getComponentValue } from "@latticexyz/recs"
import { awaitStreamValue } from "@latticexyz/utils"
import { ClientComponents } from "./createClientComponents"
import { SetupNetworkResult } from "./setupNetwork"

export type SystemCalls = ReturnType<typeof createSystemCalls>

export function createSystemCalls(
  { worldSend, txReduced$, singletonEntity }: SetupNetworkResult,
  { PlayersTable }: ClientComponents
) {
  const registerPlayer = async () => {
    const tx = await worldSend("registerPlayer()", [])
    await awaitStreamValue(txReduced$, (txHash) => txHash === tx.hash)
    return getComponentValue(PlayersTable, singletonEntity)
  }
  const unregisterPlayer = async () => {
    const tx = await worldSend("unregisterPlayer()", [])
    await awaitStreamValue(txReduced$, (txHash) => txHash === tx.hash)
    return getComponentValue(PlayersTable, singletonEntity)
  }

  return {
    registerPlayer,
    unregisterPlayer,
  }
}
