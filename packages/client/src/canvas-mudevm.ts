import { Canvas } from "@canvas-js/core"
import { useMemo, useEffect, useState } from "react"
import mudConfig from "contracts/mud.config"
import IWorldAbi from "contracts/out/IWorld.sol/IWorld.abi.json"

// TODO
interface IUseCanvas {
  world: { mud: any; system: string }
  offline: boolean
  signers: any
}

export const useCanvas = (props: IUseCanvas) => {
  const [app, setApp] = useState()
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
      const modelsSpec = Object.fromEntries(
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
                "blob",
              ])
            ),
            mutable: true,
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
          (entry) =>
            entry.type === "function" &&
            !entry.name.startsWith("_") &&
            entry.stateMutability !== "pure"
          // this is a bit hacky, what other functions might be on systems?
        )

        const actions = Object.fromEntries(
          calls.map((abiParams) => {
            const actionHandler = async (args) => {
              console.log("called", abiParams.name, abiParams)

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

              publicClient
                .simulateContract({
                  account: walletClient.account,
                  from: walletClient.account.address as Hex,
                  to: network.worldContract.address as Hex,
                  abi: IWorldAbi,
                  functionName: "sendOffchainMessage",
                  args: [text],
                  gasPrice: 0,
                  gasLimit: 0,
                })
                .then((data) => {
                  console.log(data.result)
                  setMessages(messages.concat([data.result]))
                  // app.actions.message({ text }).then((result) => /* sent result */)
                })
                .catch((err: Error) => {
                  if (err.cause?.data?.args) {
                    setErrorMsg(err.cause.data.args[0])
                  } else {
                    setErrorMsg(err.toString())
                    console.error(err)
                  }
                })
            }

            return [abiParams.name, actionHandler]
          })
        )
        Object.assign(actionsSpec, actions)
      }

      const topic = "hello.world"
      const app = new Canvas({
        contract: {
          topic,
          models: modelsSpec,
          actions: actionsSpec,
        },
        offline,
        signers,
      })

      console.log(`refreshed app: ${topic}`)
      setApp(app)
    }

    buildContract()
  }, [props.offline, props.world.system])
  // TODO: check we aren't missing any props. we don't track `props.signers` right now.

  return app
}
