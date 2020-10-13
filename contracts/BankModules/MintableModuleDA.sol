pragma solidity >=0.4.25 <0.7.0;

import "../Bank/IBankProxy.sol";
import "../ERC20/IERC20Detailed.sol";


contract MintableModuleDA {
	/**
	* 672 million tokens per 32 days
	*/
	uint public constant secondsPerPeriod = 2764800; // 32 days into seconds
	uint public constant tokensPerPeriod = 672000 * (10 ** uint(18));
	uint public constant persentDecrease = 21;
	uint public startMintTime;
	uint public lastMintTime;
	IBankProxy private _bank;
	address[] private _teamAddresses;
	uint[] private _teamPcts;

	constructor(IBankProxy bank, address[] memory teamAddresses, uint[] memory teamPcts) public {
			_bank = bank;
			// To start from second period
			startMintTime = now - secondsPerPeriod;
			lastMintTime = now;
			_teamAddresses = teamAddresses;
			_teamPcts = teamPcts;
	}

	/**
	* Mints tokens for specific day, you can't mint tokens for the same day twice
	*/
	function mint() public {
			uint tokensToMint = caclulateMint(lastMintTime, now);
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
	* Calculates how manu tokens should be mined during specified period of time
	*/
	function caclulateMint(uint timeStart, uint timeEnd) 
		public
		view
    returns (uint tokensToMint)
	{
			require(timeStart >= startMintTime);
			require(timeEnd > timeStart, "timeEnd sould be bigger than timeStart");

			uint prevN = (timeStart - startMintTime) / secondsPerPeriod;
			uint nSinceEnd = (timeEnd - startMintTime) / secondsPerPeriod;
			uint prevNSeconds = startMintTime + secondsPerPeriod * prevN;

			tokensToMint = 0;
			if (timeStart == prevNSeconds && timeEnd < timeStart + secondsPerPeriod) {
				uint minValue = startMintTime + secondsPerPeriod * (prevN + 1);
				if (minValue > timeEnd) {
					minValue = timeEnd;
				}
				tokensToMint = ((minValue - timeStart) * tokensPerPeriod * ((100 - persentDecrease) ** prevN) / (100 ** prevN)) / secondsPerPeriod;
			}

			if (timeStart > prevNSeconds) {
				uint minValue = startMintTime + secondsPerPeriod * (prevN + 1);
				if (minValue > timeEnd) {
					minValue = timeEnd;
				}
				tokensToMint = ((minValue - timeStart) * tokensPerPeriod * ((100 - persentDecrease) ** prevN) / (100 ** prevN)) / secondsPerPeriod;
			}

			uint startLoopFrom = timeStart == prevNSeconds ? prevN : prevN + 1;
			for (uint n = startLoopFrom; n < nSinceEnd; n++) {
				tokensToMint += (tokensPerPeriod * ((100 - persentDecrease) ** n)) / (100 ** n);
			}
			uint secondsSinceStartMinting = timeEnd - startMintTime;
			uint restSeconds = secondsSinceStartMinting - (nSinceEnd * secondsPerPeriod);
			if (nSinceEnd - prevN > 0 && restSeconds > 0) {
				tokensToMint += restSeconds * tokensPerPeriod * ((100 - persentDecrease) ** nSinceEnd) / ((100 ** nSinceEnd) * secondsPerPeriod);
			}
			return tokensToMint;
	}

	/**
	* @dev Emitted when a `minter` called mint method.
	*/
	event Mint(address indexed minter, uint256 amount, uint256 indexed timestamp);
}
