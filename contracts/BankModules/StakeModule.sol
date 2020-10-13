pragma solidity >=0.5.0 <0.7.0;

import "@openzeppelin/contracts/access/roles/WhitelistedRole.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../Bank/IBankProxy.sol";
import "../ERC20/IERC20Detailed.sol";


contract StakeModule is WhitelistedRole {
	using ECDSA for bytes32;
	using SafeMath for uint256;

	mapping(uint256 => bool) private _historyStak;
	
	/**
		* @notice The stakes for each stakeholder.
		*/
	mapping(address => uint256) private stakes;

	uint256 public oneTicketInTokens = 2100 * (10 ** uint256(18));

	IBankProxy private _bank;
	IERC20Detailed private _erc20;
	address private _trustedSigner;

	constructor(IBankProxy bank, IERC20Detailed erc20, address trustedSigner) public {
		_bank = bank;
		_erc20 = erc20;
		_trustedSigner = trustedSigner;
	}

	/**
	* Pull tokens
	*/
	function setTrustedSigner(
		address trustedSigner
	) public onlyWhitelisted {
		require(trustedSigner != address(0), "StakeModule: trusted signer can't be a zero address");
		require(trustedSigner != _trustedSigner, "StakeModule: trying to set the same address");
		_trustedSigner = trustedSigner;
	}

	/**
	* Stake tokens
	*/
	function stakeTokensFromBank(
		uint userId,
		address beneficiar,
		uint tickets,
		uint nonce,
		uint256 minTimestamp,
		uint256 maxTimestamp,
		bytes memory signature
	) public {
		require(isValidOperation(
			userId,
			beneficiar,
			tickets,
			nonce,
			minTimestamp,
			maxTimestamp,
			signature
		), "StakeModule: signature is not valid");
		require(_historyStak[nonce] == false, "StakeModule: tokens were already staked");
		
		/* calculate amount of tokens */
		uint256 amount = ticketsToTokens(tickets);

		/* transfer tokens */
		_bank.transfer(address(this), amount);

		/* mark nonce as spent */
		_historyStak[nonce] = true;

		/* add staked tokens */
		_createStake(beneficiar, amount);

		emit StakeFromBank(nonce, userId, beneficiar, amount);
	}

	/**
	* @notice A method for a stakeholder to create a stake.
	* @param tickets The size of the stake in tickets.
	*/
	function stakeTokensFromWallet(uint256 tickets)
			public
	{
			uint256 amount = ticketsToTokens(tickets);
			require(_erc20.allowance(msg.sender, address(this)) >= amount, "Insufficient amount of tokens allowed to withdraw");

			_erc20.transferFrom(msg.sender, address(this), amount);
			_createStake(msg.sender, amount);

			emit StakeFromWallet(msg.sender, amount);
	}

	/**
	* @notice A method for a stakeholder to withdraw a stake.
	*/
	function withdrawStake(
		uint userId,
		address beneficiar,
		uint tickets,
		uint nonce,
		uint256 minTimestamp,
		uint256 maxTimestamp,
		bytes memory signature
	)
			public
	{
			require(isValidOperation(
				userId,
				beneficiar,
				tickets,
				nonce,
				minTimestamp,
				maxTimestamp,
				signature
			), "StakeModule: signature is not valid");
			require(_historyStak[nonce] == false, "StakeModule: tokens were already withdrawn");

			uint256 amount = ticketsToTokens(tickets);
			require(stakes[msg.sender] >= amount, "Insufficient amount of staked tokens");

			stakes[msg.sender] = stakes[msg.sender].sub(amount);
			
			/* Send tokens to beneficiar */
			_erc20.transfer(msg.sender, amount);

			emit Withdrawal(nonce, userId, beneficiar, amount);
	}

	/**
	* @notice A method to retrieve the stake for a stakeholder.
	* @param _stakeholder The stakeholder to retrieve the stake for.
	* @return uint256 The amount of wei staked.
	*/
	function stakeOf(address _stakeholder)
			public
			view
			returns(uint256)
	{
			return stakes[_stakeholder];
	}

	/**
	* @notice A method to calculate amount of tokens per tickets.
	* @param _tickets Number of tickets
	*/
	function ticketsToTokens(uint256 _tickets)
			public
			view
			returns(uint256)
	{
			return _tickets.mul(oneTicketInTokens);
	}

	function _createStake(address beneficiar, uint256 amount)
		internal
	{
			stakes[beneficiar] = stakes[beneficiar].add(amount);
	}

	// ---------- STAKEHOLDERS ----------

	/**
		* @notice A method to check if an address is a stakeholder.
		* @param _address The address to verify.
		* @return bool Whether the address is a stakeholder
		*/
	function isStakeholder(address _address)
			public
			view
			returns(bool)
	{
			if(stakes[_address] == 0) return false;
			return true;
	}

	// ---------- HELPERS ----------

	/**
	* Signature validation
	*/
	function isValidOperation(
		uint256 userId,
		address beneficiar,
		uint256 tickets,
		uint256 nonce,
		uint256 minTimestamp,
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
				tickets,
				nonce, // Prevents double spend
				minTimestamp, // Prevents sending tx before this perion of time 
				maxTimestamp // Prevents sending tx after this perion of time
		);
		if (keccak256(blob).toEthSignedMessageHash().recover(signature) == _trustedSigner) {
				if (block.timestamp < minTimestamp || block.timestamp > maxTimestamp) {
						return false;
				}
				return true;
		} else {
				return false;
		}
	}

	/**
	* @dev Emitted when a `staker` wants to stake tokens from bank.
	*/
	event StakeFromBank(uint256 indexed nonce, uint256 indexed userId, address beneficiar, uint256 amount);

	/**
	* @dev Emitted when a `staker` wants to stake tokens from his own wallet.
	*/
	event StakeFromWallet(address indexed beneficiar, uint256 indexed amount);

	/**
	* @dev Emitted when a `staker` called withdrawal method.
	*/
	event Withdrawal(uint256 indexed nonce, uint256 indexed userId, address beneficiar, uint256 amount);
}
