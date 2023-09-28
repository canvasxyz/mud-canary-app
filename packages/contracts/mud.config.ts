import { mudConfig } from "@latticexyz/world/register";

export default mudConfig({
  systems: {
    PlayerSystem: {
      name: "players",
      openAccess: true,
    },
    MessagingSystem: {
      name: "messaging",
      openAccess: true,
    },
  },
  tables: {
    PlayersTable: {
      keySchema: {
        player: "address",
      },
      valueSchema: {
        name: "string",
        bio: "string",
      },
    },
    OffchainMessagesTable: {
      valueSchema: {
        from: "address",
        timestamp: "uint256",
        message: "string",
      },
      offchainOnly: true,
    },
    Counter: {
      keySchema: {},
      valueSchema: "uint32",
    },
  },
});
