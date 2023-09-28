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

const PlayerListItem = ({ entityKey, playersTable }) => {
  const playerData = useComponentValue(playersTable, entityKey)
  const address = utils.hexValue(entityKey)
  return (
    <li key={entityKey}>
      {address} - {playerData?.name}
    </li>
  )
}

export const App = () => {
  const [balance, setBalance] = useState<number>()
  const [messages, setMessages] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState<string>()
  const nameRef = useRef<any>()
  const inputRef = useRef<any>()

  const mud = useMUD()

  const {
    components: { PlayersTable },
    systemCalls: { registerPlayer, unregisterPlayer },
    network,
  } = mud
  const { httpOnlyClient, publicClient, walletClient } = network

  const addressEntities = useEntityQuery([Has(PlayersTable)])
  const addresses = addressEntities.map(utils.hexValue)
  const registered = addresses.some(
    (addr) => addr === walletClient.account.address.toLowerCase()
  )

  const sendMsg = () => {
    setErrorMsg("")
    const text = inputRef.current.value
    const abi = [
      {
        name: "sendOffchainMessage",
        inputs: [{ name: "message", type: "string" }],
        outputs: [
          {
            type: "tuple",
            components: [
              {
                type: "address",
              },
              {
                type: "uint256",
              },
              {
                type: "string",
              },
            ],
          },
        ],
        stateMutability: "nonpayable",
        type: "function",
      },
    ]

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
      })
      .then((data) => {
        console.log(data.result)
        setMessages(messages.concat([data.result.toString()]))
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
        <div> World: {network.worldContract.address}</div>
        <div>Your account: {walletClient.account.address}</div>
        <div>Registered: {registered ? "true" : "false"}</div>
        <div>Registrations:</div>
        <ul>
          {addressEntities.map((entityKey, index) => (
            <PlayerListItem
              key={entityKey}
              playersTable={PlayersTable}
              entityKey={entityKey}
            />
          ))}
        </ul>
        <div>Try opening me in an incognito window.</div>
        <div>
          {!registered && (
            <input ref={nameRef} type="text" placeholder="Your name" />
          )}
          <button
            type="button"
            onClick={async (event) => {
              event.preventDefault()
              if (registered) {
                await unregisterPlayer()
              } else if (nameRef?.current?.value?.trim()) {
                console.log(1)
                await registerPlayer(nameRef.current.value.trim())
              } else {
                console.log(2)
                await registerPlayer()
              }
            }}
          >
            {registered ? "Unregister" : "Register"}
          </button>
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
          {messages.map((msg, idx) => (
            <div key={idx}>{msg}</div>
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
          {errorMsg && (
            <div
              style={{
                marginTop: "10px",
                color: "#dd0022",
              }}
            >
              {errorMsg}
            </div>
          )}
        </form>
      </div>
    </>
  )
}
