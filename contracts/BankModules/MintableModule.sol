pragma solidity >=0.4.25 <0.7.0;

import "../Bank/IBankProxy.sol";
import "../ERC20/IERC20Detailed.sol";


contract MintableModule {
	/**
	* 2.1 million tokens per day
	*/
	uint256 public constant secondsPerDay = 86400;
	uint256 public constant tokensPerDay = 21000000 * (10 ** uint256(18));
	uint256 public constant tokensPerSecond = tokensPerDay / secondsPerDay;
	uint256 public lastMintTime;
	IBankProxy private _bank;
	address[] private _teamAddresses;
	uint256[] private _teamPcts;

	constructor(IBankProxy bank, address[] memory teamAddresses, uint256[] memory teamPcts) public {
			_bank = bank;
			lastMintTime = now;
			_teamAddresses = teamAddresses;
			_teamPcts = teamPcts;
	}

	/**
	* Mints tokens for specific day, you can't mint tokens for the same day twice
	*/
	function mint() public  {
			uint tokensToMint = (now - lastMintTime) * tokensPerSecond;
			uint teamTokens = tokensToMint / 10;
			_bank.mint(address(_bank), tokensToMint);
			emit Mint(msg.sender, tokensToMint, now);
			lastMintTime = now;
			for (uint i = 0; i < _teamAddresses.length; i++) {
				uint memberTokens = teamTokens * _teamPcts[i] / 100;
				_bank.transfer(_teamAddresses[i], memberTokens);
			}
	}

	/**
	* @dev Emitted when a `minter` called mint method.
	*/
	event Mint(address indexed minter, uint256 amount, uint256 indexed timestamp);
}
