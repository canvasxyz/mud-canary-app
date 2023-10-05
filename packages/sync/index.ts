import { Canvas, ActionImplementation } from "@canvas-js/core"
import { SIWESigner } from "@canvas-js/chain-ethereum"
import { PropertyType } from "@canvas-js/modeldb"
import { typeOf } from "@canvas-js/vm"

import { useEffect, useState } from "react"
import {
  type AbiItem,
  type Hex,
  keccak256,
  encodeAbiParameters,
  GetContractReturnType,
  Abi,
  PublicClient,
  WalletClient,
  Address,
} from "viem"
import type {
  AbiFunction,
  AbiParameter,
  AbiType,
  SolidityTuple,
  SolidityArrayWithTuple,
} from "abitype"
import { ethers } from "ethers"
import { type MUDCoreConfig } from "@latticexyz/config"

export { useLiveQuery } from "@canvas-js/modeldb"

// to use https://abitype.dev/api/zod
const abiTypeToModelType = (abitype: string) => {
  return "string" as PropertyType
}
const encode: (data: string | bigint, abitype: AbiType) => string | number = (
  data,
  abitype
) => {
  if (typeof data === "bigint") {
    return data.toString()
  } else {
    return data
  }
}

export function useCanvas<
  TWorldContract extends GetContractReturnType<
    TAbi,
    TPublicClient,
    TWalletClient,
    TAddress
  >,
  TAbi extends Abi,
  TPublicClient extends Partial<PublicClient>,
  TWalletClient extends Partial<WalletClient>,
  TAddress extends Address
>(props: {
  world: {
    mudConfig: MUDCoreConfig
    worldContract: TWorldContract
    publicClient: PublicClient
    getPrivateKey: () => Promise<Hex>
  }
  systemAbis: Record<string, () => Promise<string>>
  offline: boolean
}) {
  const [app, setApp] = useState<Canvas>()

  useEffect(() => {
    const buildContract = async () => {
      const { offline, world, systemAbis } = props

      const models = Object.entries(world.mudConfig.tables).filter(
        ([tableName, params]) =>
          params.offchainOnly === true /* && params.offchainSync === true */
      )
      if (models.length === 0) {
        throw new Error("No offchain-synced tables defined")
      }

      const systems = Object.entries(world.mudConfig.systems).filter(
        ([systemName, params]) => true /* params.offchainSync === true */
      )
      if (models.length === 0) {
        throw new Error("No offchain-synced systems defined")
      }

      // build models
      const modelsSpec = Object.fromEntries(
        models.map(([name, params]) => [
          name,
          {
            ...Object.fromEntries(
              Object.entries(params.valueSchema).map(([field, type]) => [
                field,
                abiTypeToModelType(type),
              ])
            ),
            _key: "string" as PropertyType,
            _timestamp: "integer" as PropertyType,
          },
        ])
      )

      // build actions
      const actionsSpec = {}
      const globs = Object.fromEntries(
        Object.entries(systemAbis).map(([key, value]) => {
          const filename = key.match(/\w+\.abi\.json$/)![0]
          return [filename, value]
        })
      )

      for (const [name] of systems) {
        const systemAbiRaw = await globs[`${name}.abi.json`]()
        const systemAbi =
          typeof systemAbiRaw === "string"
            ? JSON.parse(systemAbiRaw)
            : systemAbiRaw

        const calls = systemAbi.filter(
          (entry: AbiItem) =>
            entry.type === "function" &&
            !entry.name.startsWith("_") &&
            entry.name !== "supportsInterface"
        )

        const actions = Object.fromEntries(
          calls.map((abiParams: AbiFunction) => {
            const actionHandler: ActionImplementation = async (
              db,
              args = {},
              context
            ) => {
              return new Promise((resolve, reject) => {
                const tableName = abiParams.outputs[0].internalType
                  ?.replace(/^struct /, "")
                  .replace(/Data$/, "")
                if (tableName === undefined) return reject()
                if (typeOf(args) !== "Object" || args === null) return reject()

                const { publicClient, worldContract } = props.world
                publicClient
                  .simulateContract({
                    account: context.address as Hex,
                    address: worldContract.address as Hex,
                    abi: worldContract.abi,
                    functionName: abiParams.name as any,
                    // @ts-ignore
                    args: abiParams.inputs.map((item) => args[item.name]),
                    gasPrice: 0n,
                  })
                  .then((data) => {
                    const result = data.result as { [s: string]: unknown }

                    // Gather and execute effects, one effect at a time for now, with key = keccak256(abi.encode(...))
                    const outputs = abiParams.outputs[0] as AbiParameter & {
                      type: SolidityTuple | SolidityArrayWithTuple
                      components: readonly AbiParameter[]
                    }
                    const values = outputs.components.map(
                      (c) => result[c.name!]
                    )
                    const key = keccak256(
                      encodeAbiParameters(outputs.components, values)
                    )

                    const modelValue = Object.fromEntries(
                      Object.entries(result)
                        .map(([name, value]) => [
                          name,
                          encode(
                            value as string | bigint,
                            outputs.components.find((c) => c.name === name)
                              ?.type as AbiType
                          ),
                        ])
                        .concat([
                          ["_key", context.id],
                          ["_timestamp", context.timestamp],
                        ])
                    )
                    db[tableName].set(key, modelValue)
                    resolve(modelValue)
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

      // TODO: viem to ethers requires us to get the private key, we should make SIWESigner accept viem
      const privateKey = await props.world.getPrivateKey()
      const wallet = new ethers.Wallet(privateKey)

      // create application
      const topic = `world.contract-${props.world.worldContract.address.toLowerCase()}`
      const app = await Canvas.initialize({
        contract: {
          topic,
          models: modelsSpec,
          actions: actionsSpec,
        },
        offline,
        signers: [new SIWESigner({ signer: wallet as any })],
        // TODO: client needs to be upgraded from ethers@5.7.2 to ethers@6.6.6 to match @canvas-js/core
        location: "sqldb",
      })
      setApp(app)
    }

    buildContract()
  }, [props.world.worldContract.address, props.offline])

  return app
}