import { useEffect, useState, useMemo, useRef } from "react"
import { utils } from "ethers"
import { useEntityQuery, useComponentValue } from "@latticexyz/react"
import {
  runQuery,
  Has,
  HasValue,
  getComponentValueStrict,
} from "@latticexyz/recs"
import { useMUD } from "./MUDContext"
import { getContract, encodeFunctionData, decodeFunctionResult } from "viem"
import { privateKeyToAccount } from "viem/accounts"

import { useCanvas } from "./canvas-mudevm"

export const App = () => {
  const [balance, setBalance] = useState<number>()
  const inputRef = useRef<any>()

  const mud = useMUD()

  const {
    components: { PlayersTable },
    systemCalls: { registerPlayer, unregisterPlayer },
    network,
    publicClient,
    walletClient,
  } = mud

  const entities = useEntityQuery([Has(PlayersTable)])
  const addresses = entities.map(utils.hexValue)
  const myPlayerData = useComponentValue(PlayersTable, entities[0])

  const registered = addresses.some(
    (ent) => ent === walletClient.account.address.toLowerCase()
  )

  const sendMsg = () => {
    const text = inputRef.current.value
    const abi = [
      {
        name: "sendOffchainMessage",
        inputs: [{ name: "message", type: "string" }],
        outputs: [{ name: "", type: "address" }],
        stateMutability: "nonpayable",
        type: "function",
      },
    ]

    // TODO: inject state
    publicClient
      .simulateContract({
        account: walletClient.account,
        from: walletClient.account.address as Hex,
        to: network.worldContract.address as Hex,
        abi,
        functionName: "sendOffchainMessage",
        args: [text],
        gasPrice: 0,
        gasLimit: 0,
        // data: encodeFunctionData({
        //   abi,
        //   functionName: "sendOffchainMessage",
        //   args: ["hello"],
        // }),
      })
      .then((data) => {
        // // Decode direct RPC calls.
        // const result = decodeFunctionResult({
        //   abi,
        //   functionName: "sendOffchainMessage",
        //   data: data.result,
        // })
        console.log(data.result)
      })
      .catch((err: Error) => {
        console.error(err)
      })

    // app.actions.message({ text }).then((result) => /* sent result */)
    // {results.map((result, index) => <div key={result.id}>{result.text}</div>)}
    inputRef.current.value = ""
  }

  const app = useCanvas({
    world: { mud, system: "OffchainSystem" },
    offline: true,
    signers: [walletClient.account],
  })

  return (
    <>
      <div>
        <div>Your account: {walletClient.account.address}</div>
        <div>
          Registered: {registered ? `true - ${myPlayerData?.name}` : "false"}
        </div>
        <div>Registrations: {JSON.stringify(addresses)}</div>
        <div>Try opening me in an incognito window.</div>
        <div>
          {
            <button
              type="button"
              onClick={async (event) => {
                event.preventDefault()
                if (registered) {
                  await unregisterPlayer()
                } else {
                  await registerPlayer()
                }
              }}
            >
              {registered ? "Unregister" : "Register"}
            </button>
          }
        </div>
      </div>
      <br />
      <div>
        <div
          style={{
            border: "1px solid #eee",
            padding: "20px 30px",
            margin: "20px 0",
          }}
        >
          {[].map((msg, idx) => (
            <div key={idx}>Message</div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            sendMsg()
          }}
        >
          <input
            type="text"
            ref={inputRef}
            placeholder="Type a message"
            autoFocus
          />
          <button type="button">Send</button>
        </form>
      </div>
    </>
  )
}
