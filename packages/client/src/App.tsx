import { useState, useRef } from "react"
import { utils } from "ethers"
import { useEntityQuery, useComponentValue } from "@latticexyz/react"
import { Component, Entity, Has, Type } from "@latticexyz/recs"
import { useLiveQuery } from "@canvas-js/modeldb"
import { useMUD } from "./MUDContext"
import { useCanvas } from "./canvas-mudevm"
import { getNetworkConfig } from "./mud/getNetworkConfig"

const PlayerListItem = ({
  entityKey,
  playersTable,
}: {
  entityKey: Entity
  playersTable: Component<{ name: Type.String }>
}) => {
  const playerData = useComponentValue(playersTable, entityKey)
  const address = utils.hexValue(entityKey)
  return (
    <li key={entityKey}>
      {address} - {playerData?.name}
    </li>
  )
}

export const App = () => {
  const [errorMsg, setErrorMsg] = useState<string>()
  const nameRef = useRef<any>()
  const inputRef = useRef<any>()

  const mud = useMUD()

  const {
    components: { PlayersTable },
    systemCalls: { registerPlayer, unregisterPlayer },
    network,
  } = mud
  const { walletClient } = network

  const addressEntities = useEntityQuery([Has(PlayersTable)])
  const addresses = addressEntities.map(utils.hexValue)
  const registered = addresses.some(
    (addr) => addr === walletClient.account.address.toLowerCase()
  )

  const sendMsg = () => {
    setErrorMsg("")
    const text = inputRef.current.value
    if (!text || app === undefined) return

    app.actions
      .sendOffchainMessage({ message: text })
      .then(() => {
        // TODO: prevent double sending the same message
        inputRef.current.value = ""
      })
      .catch((err: Error) => {
        setErrorMsg(err.toString())
        console.error(err)
      })
  }

  const sendMsgOnchain = () => {
    setErrorMsg("")
    const text = inputRef.current.value
    if (!text) return

    network.worldContract.write
      .sendOffchainMessage([text])
      .then((result) => {
        console.log(result)
        inputRef.current.value = ""
      })
      .catch((err) => {
        setErrorMsg(err.toString())
        console.error(err)
      })
  }

  const app = useCanvas({
    world: { mud, getNetworkConfig },
    offline: true,
  })

  const dbOrNull = app?.db ?? null
  const messages = useLiveQuery(dbOrNull, "OffchainMessagesTable", {
    limit: 50,
  }) // TODO: where, orderBy

  return (
    <>
      <div>
        <div>World: {network.worldContract.address}</div>
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
                await registerPlayer(nameRef.current.value.trim())
              } else {
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
          {(messages || []).map((msg, idx) => (
            <div key={idx}>
              [{msg.timestamp?.toString()}] {msg.from}: {msg.message}
            </div>
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
          <button type="submit">Send</button>
          <button type="button" onClick={sendMsgOnchain}>
            Send onchain
          </button>
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
