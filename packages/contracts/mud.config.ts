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
      schema: {
        name: "string",
        bio: "string",
      },
    },
    OffchainMessagesTable: {
      schema: {
        from: "address",
        timestamp: "uint256",
        message: "string",
      },
      ephemeral: true,
    },
    Counter: {
      keySchema: {},
      schema: "uint32",
    },
  },
});
