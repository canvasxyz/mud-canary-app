import { Canvas } from "@canvas-js/core"
import { SIWESigner } from "@canvas-js/chain-ethereum"
import { useMemo, useEffect, useState } from "react"
import mudConfig from "contracts/mud.config"
import IWorldAbi from "contracts/out/IWorld.sol/IWorld.abi.json"
import type { Abi, AbiItem, Hex } from "viem"
import type { AbiFunction } from "abitype"

import { SetupResult } from "./mud/setup"

// TODO: import type { ActionImplementation, ActionContext, ActionDB, JSValue } from "@canvas-js/core"
// TODO: import type { PrimitiveType } from "@canvas-js/modeldb"
// (should also export all the other modeldb types.)
type PrimitiveType = "integer" | "float" | "string" | "bytes"
interface JSArray extends Array<JSValue> {}
interface JSObject {
  [key: string]: JSValue
}
type ModelAPI = any
type JSValue =
  | null
  | boolean
  | number
  | string
  | Uint8Array
  | JSArray
  | JSObject
type Awaitable<T> = T | Promise<T>
type ActionImplementation = (
  db: Record<string, any>,
  args: JSValue,
  context: ActionContext
) => Awaitable<void | JSValue>
type ActionContext = {
  id: string
  chain: string
  address: string
  blockhash: string | null
  timestamp: number
}

// TODO
interface IUseCanvas {
  world: { mud: SetupResult; system: string }
  offline: boolean
  signers: any
}

export const useCanvas = (props: IUseCanvas) => {
  const [app, setApp] = useState<Canvas>()
  // TODO: reset app when config changes?

  useEffect(() => {
    const buildContract = async () => {
      const { offline, signers } = props

      const models = Object.entries(mudConfig.tables).filter(
        ([tableName, params]) =>
          params.offchainOnly === true /* && params.offchainSync === true */
      )
      if (models.length === 0) {
        throw new Error("No offchain-synced tables defined")
      }

      const systems = Object.entries(mudConfig.systems).filter(
        ([systemName, params]) => true /* params.offchainSync === true */
      )
      if (models.length === 0) {
        throw new Error("No offchain-synced systems defined")
      }

      const globs = import.meta.glob(
        "./../../contracts/out/*System.sol/*.abi.json",
        { as: "raw" }
      )

      // build models
      const modelsSpec: Record<
        string,
        Record<string, PrimitiveType>
      > = Object.fromEntries(
        models.map(([name, params]) => [
          name,
          {
            ...Object.fromEntries(
              Object.entries(params.keySchema).map(([field, type]) => [
                field,
                "string",
              ])
            ),
            ...Object.fromEntries(
              Object.entries(params.valueSchema).map(([field, type]) => [
                field,
                "bytes",
              ])
            ),
            // TODO: $indexes
            // TODO: { mutable: true }
          },
        ])
      )

      // build actions
      const actionsSpec = {}
      for (const [name, params] of systems) {
        const systemAbiRaw = await globs[
          `../../contracts/out/${name}.sol/${name}.abi.json`
        ]()
        const systemAbi = JSON.parse(systemAbiRaw)

        const calls = systemAbi.filter(
          (entry: AbiItem) =>
            entry.type === "function" &&
            !entry.name.startsWith("_") &&
            entry.stateMutability !== "pure"
          // this is a bit hacky, what other functions might be on systems?
        )

        const actions = Object.fromEntries(
          calls.map((abiParams: AbiFunction) => {
            const actionHandler = async (
              db: Record<string, ModelAPI>,
              args: Record<string, JSValue>,
              context: ActionContext
            ) => {
              const { text } = args as { text: string }
              const { id, chain, address, timestamp } = context
              // await db.posts.set(postId, { content, timestamp })
              // return id

              // TODO: convert to type signatures
              // keySchema = { key: 'bytes32' }
              // valueSchema = { from: 'address', timestamp: 'uint256', message: 'string' }

              // const effects = await worldContract.simulate(call)
              // // TODO: redo this once we see effects return
              // for (const effect of effects) {
              //   const to = match(
              //     call.outputs[0].internalType ===
              //       effect.internalType.replace(/Data$/, "")
              //   )
              //   const outputs = effect.decodedOutputs // TODO derive this from "result" once we have that
              //   db[to].set({ ...outputs })
              // }

              const abi = IWorldAbi.find(
                (abi) => abi.name === "sendOffchainMessage"
              )

              const { publicClient, walletClient, worldContract } =
                props.world.mud.network
              return new Promise((resolve, reject) => {
                publicClient
                  .simulateContract({
                    account: walletClient.account.address as Hex,
                    address: worldContract.address as Hex,
                    abi: IWorldAbi,
                    functionName: "sendOffchainMessage",
                    args: [text],
                    gasPrice: 0n,
                  })
                  .then((data) => {
                    resolve(data.result)
                  })
                  .catch((err: Error) => {
                    reject(err)
                  })
              })
            }

            return [abiParams.name, actionHandler]
          })
        )
        Object.assign(actionsSpec, actions)
      }

      const topic = "hello.world"
      const app = await Canvas.initialize({
        contract: {
          topic,
          models: modelsSpec,
          actions: actionsSpec,
        },
        offline,
        signers: [new SIWESigner(signers[0])],
        location: "sqldb",
      })

      console.log(`refreshed app: ${topic}`)
      setApp(app)
    }

    buildContract()
  }, [props.offline, props.world.system])
  // TODO: check we aren't missing any props. we don't track `props.signers` right now.

  return app
}
