# @canvas-js/cr-mudevm-sync

⚡️ Conflict-free libp2p sync for the EVM.

This module allows you to write offchain applications on top of a MUD onchain application,
with logic defined inside systems and executed using [CRDT-like](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type) approaches which allow actions to execute and finalize instantly.

You can use this to write messaging systems, gasless governance systems,
state channels, and offchain orderbooks.

### Tutorial

To get started, configure a table `MyTable` in mud.config.ts with `offchainOnly: true`,
and a system to write to the table.

```typescript
export default mudConfig({
  systems: {
    MessagingSystem: {
      name: "messaging",
      openAccess: true
    }
  },
  tables: {
    OffchainMessagesTable: {
      valueSchema: {
        from: "address",
        message: "string",
      },
      offchainOnly: true,
    }
  }
})
```

We currently expect the developer to return table-like data to write to tables.
See 'Improvements' for more details.

```solidity
contract MessagingSystem is System {
  function sendOffchainMessage(string memory message) public returns (MyTableData memory) {
    // ...
    return MyTableData(_msgSender(), message);
  }
}
```

To sync and query the table on the client-side:

```tsx
import { useCanvas, useLiveQuery } from "@canvas-js/cr-mudevm-sync"
import mudConfig from "contracts/mud.config"

import { getNetworkConfig } from "./mud/getNetworkConfig"
const systemAbis = import.meta.glob("./../../contracts/out/*System.sol/*.abi.json", { as: "raw" })

export const App = () => {
  const app = useCanvas({
    world: {
      mudConfig,
      publicClient: mud.network.publicClient,
      worldContract: mud.network.worldContract,
      getPrivateKey: () => getNetworkConfig().then((n) => n.privateKey),
    },
    systemAbis,
    offline: true,
  })

  const messages = useLiveQuery(app?.db, "MyTable", { where: { ... } })

  return <div>{messages.map(msg => <div>{msg.content}</div>)}</div>
}
```

Instead of `worldContract.write.doAction([arg0])`, use
`app.actions.doAction({ arg0: val0 })`. This will execute instantly
and sync over libp2p between blocks.

`systemAbis` should be a dictionary of ABIs for all systems you
would like to make callable offchain.

### State Channels

TBD

### Reading from Tables

TBD

### Improvements

Most of these improvements require a MUD plugin for config/typing changes.

* [ ] Add state override for Table.set() calls, so we can write to offchain tables using the normal
  table API and return custom packed effects with multiple set() calls.
* [ ] Find a better API for getting system ABIs. Components are exposed directly but not systems right now.
* [ ] Find a better API for getting the burner private key.
* [ ] Add config option for specifying exactly which tables to sync (`offchainSync: true`).
* [ ] Add config option for specifying exactly which systems to sync (`contract System is OffchainSystem`).
* [ ] Support extended table operations on dynamic arrays.
* [ ] Add other Canvas config options including libp2p config.