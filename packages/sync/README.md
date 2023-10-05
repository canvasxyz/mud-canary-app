## @canvas-js/cr-mudevm-sync

Conflict-free libp2p sync for the EVM.

### Usage

Currently, all systems and offchain tables are synced. See 'Improvements' below.

To get started, configure a table `MyTable` in mud.config.ts with `offchainOnly: true`.

```
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

Instead of `worldContract.write.doAction([arg0])`, you can now use
`app.actions.doAction({ arg0: val0 })` to call the same method.

### Writing to Tables

For p2p interactions, we currently expect the developer to return table-like data,
to write to a table. This will be replaced shortly.

```
contract MessagingSystem is System {
  function sendOffchainMessage(string memory message) public returns (OffchainMessagesTableData memory) {
    // ...
    return OffchainMessagesTableData(_msgSender(), block.timestamp, message);
  }
}
```

### Reading from Tables

TBD, see db.get() documentation.

### Improvements

* Add state override so standard Table.set() calls can be used to write to offchain tables.
* Find a better API for getting system ABIs. Components are exposed directly, not systems.
* Find a better API for getting the burner private key.
* Add config option for specifying exactly which tables to sync (`offchainSync: true`).
* Add config option for specifying exactly which systems to sync (`contract System is OffchainSystem`).
* Add other Canvas config options.