import { awaitStreamValue } from "@latticexyz/utils"
import { ClientComponents } from "./createClientComponents"
import { SetupNetworkResult } from "./setupNetwork"

export type SystemCalls = ReturnType<typeof createSystemCalls>

export function createSystemCalls(
  network: SetupNetworkResult,
  { PlayersTable }: ClientComponents
) {
  const registerPlayer = async (name) => {
    const tx = await network.worldContract.write.registerPlayer(
      name ? [name] : []
    )
    const result = await network.waitForTransaction(tx)
    return result
  }
  const unregisterPlayer = async () => {
    const tx = await network.worldContract.write.unregisterPlayer()
    const result = await network.waitForTransaction(tx)
    return result
  }

  return {
    registerPlayer,
    unregisterPlayer,
  }
}
