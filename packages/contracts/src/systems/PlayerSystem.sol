// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import { System } from "@latticexyz/world/src/System.sol";
import { PlayersTable } from "../codegen/Tables.sol";

contract PlayerSystem is System {
  event Registered(address from);
  event Unregistered(address from);

  function registerPlayer(string memory name) public {
    emit Registered(_msgSender());
    PlayersTable.set(_msgSender(), name);
	}
  function registerPlayer() public {
    emit Registered(_msgSender());
    PlayersTable.set(_msgSender(), "Anonymous");
	}
  function unregisterPlayer() public {
    emit Unregistered(_msgSender());
    PlayersTable.deleteRecord(_msgSender());
	}
}
