import { useRef } from "react"
import { useMUD } from "./MUDContext"
import { utils } from "ethers"
import { useEntityQuery, useComponentValue } from "@latticexyz/react"
import { Component, Entity, Has, Type } from "@latticexyz/recs"

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

const OnchainModules = () => {
  const nameRef = useRef<any>()

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

  // const sendMsgOnchain = () => {
  //   setErrorMsg("")
  //   const text = inputRef.current.value
  //   if (!text) return

  //   mud.network.worldContract.write
  //     .sendOffchainMessage([text])
  //     .then((result) => {
  //       console.log(result)
  //       inputRef.current.value = ""
  //     })
  //     .catch((err) => {
  //       setErrorMsg(err.toString())
  //       console.error(err)
  //     })
  // }

  return (
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
  )
}

export default OnchainModules
