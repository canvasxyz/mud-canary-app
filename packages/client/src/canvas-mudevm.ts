import { Canvas } from "@canvas-js/core"
import { useMemo, useEffect, useState } from "react"

// TODO
interface IUseCanvas {
  world: { mud: any; system: string }
  offline: boolean
  signers: any
}

export const useCanvas = (props: IUseCanvas) => {
  useMemo(() => {
    const { offline, signers } = props
    const contract = `
const models = {}
const views = {}
const actions = {}
`
    // TODO: configure topic with key properties
    const app = new Canvas({ contract, offline, signers })
    return app
  }, [props.offline, props.signers, props.world.system])
}
