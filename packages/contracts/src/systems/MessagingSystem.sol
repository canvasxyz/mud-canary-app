// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import { System } from "@latticexyz/world/src/System.sol";
import { PlayersTable, OffchainMessagesTable, OffchainMessagesTableData } from "../codegen/Tables.sol";

contract MessagingSystem is System {
  event SentMessage(address indexed _from, string message);

  function sendOffchainMessage(string memory message) public returns (OffchainMessagesTableData memory) {
    emit SentMessage(_msgSender(), message);

    string memory fromName = PlayersTable.getName(_msgSender());
    if (bytes(fromName).length == 0) revert("Must be registered as a player");

    OffchainMessagesTable.set(
      keccak256(abi.encode(_msgSender(), block.timestamp, message)),
      OffchainMessagesTableData({
         from: _msgSender(),
         timestamp: block.timestamp,
         message: message
      })
    );

    return OffchainMessagesTableData(_msgSender(), 999, "hello");
  }
}
