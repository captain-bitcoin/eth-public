pragma solidity >=0.5.0 <0.7.0;

import "@openzeppelin/contracts/access/roles/WhitelistedRole.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "../Bank/IBankProxy.sol";
import "../ERC20/IERC20Detailed.sol";


contract WithdrawalModule is WhitelistedRole {
	using ECDSA for bytes32;

	mapping(uint256 => bool) private _historySpent;
	IBankProxy private _bank;
	address private _trustedSigner;

	constructor(IBankProxy bank, address trustedSigner) public {
		_trustedSigner = trustedSigner;
		_bank = bank;
	}

	/**
	* Pull tokens
	*/
	function setTrustedSigner(
		address trustedSigner
	) public onlyWhitelisted {
		require(trustedSigner != address(0), "WithdrawalModule: trusted signer can't be a zero address");
		require(trustedSigner != _trustedSigner, "WithdrawalModule: trying to set the same address");
		_trustedSigner = trustedSigner;
	}

	/**
	* Pull tokens
	*/
	function pullTokens(
		uint userId,
		address beneficiar,
		uint amount,
		uint nonce,
		uint256 maxTimestamp,
		bytes memory signature
	) public {
		require(isValidOperation(
			userId,
			beneficiar,
			amount,
			nonce,
			maxTimestamp,
			signature
		), "WithdrawalModule: signature is not valid");
		require(_historySpent[nonce] == false, "WithdrawalModule: tokens were already pulled");

		/* transfer tokens */
		_bank.transfer(beneficiar, amount);

		/* mark nonce as spent */
		_historySpent[nonce] = true;

		emit Withdrawal(nonce, userId, beneficiar);
	}

	/**
	* Pull tokens
	*/
	function isValidOperation(
		uint256 userId,
		address beneficiar,
		uint256 amount,
		uint256 nonce,
		uint256 maxTimestamp,
		bytes memory signature
	)
		public
		view
    returns (bool)
	{
		bytes memory blob = abi.encodePacked(
				userId,
				beneficiar,
				amount,
				nonce, // Prevents double spend
				maxTimestamp // Prevents sending tx after this perion of time
		);
		if (keccak256(blob).toEthSignedMessageHash().recover(signature) == _trustedSigner) {
				if (block.timestamp > maxTimestamp) {
						return false;
				}
				return true;
		} else {
				return false;
		}
	}

	/**
	* @dev Emitted when a `minter` called mint method.
	*/
	event Withdrawal(uint256 indexed nonce, uint256 indexed userId, address beneficiar);
}
