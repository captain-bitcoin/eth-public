pragma solidity >=0.4.25 <0.7.0;

import "./ERC20/IERC20Detailed.sol";
import "./Bank/BankProxy.sol";


contract CBBank is BankProxy  {

	/**
	* @dev Constructor
	*/
	constructor(IERC20Detailed token) public BankProxy(token) {}
}
