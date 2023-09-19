import { useComponentValue } from "@latticexyz/react"
import { useMUD } from "./MUDContext"
import { getContract } from "viem"
import {
  createPublicClient,
  createWalletClient,
  http,
  webSocket,
  fallback,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"

export const App = () => {
  const {
    components: { Counter },
    systemCalls: { increment },
    network: { singletonEntity },
    publicClient,
    walletClient,
  } = useMUD()

  debugger

  const counter = useComponentValue(Counter, singletonEntity)

  return (
    <>
      <div>
        Counter: <span>{counter?.value ?? "??"}</span>
      </div>
      <button
        type="button"
        onClick={async (event) => {
          event.preventDefault()
          console.log("new counter value:", await increment())
        }}
      >
        Increment
      </button>
    </>
  )
}
