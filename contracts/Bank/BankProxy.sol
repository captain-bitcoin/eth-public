pragma solidity >=0.4.25 <0.7.0;


import "@openzeppelin/contracts/access/roles/WhitelistedRole.sol";
import "../ERC20/IERC20Detailed.sol";
import "./IBankProxy.sol";


contract BankProxy is IBankProxy, WhitelistedRole {
	IERC20Detailed private _token;

	/**
	* @dev Constructor
	*/
	constructor(IERC20Detailed token) public {
			_token = token;
	}

	/**
	* @dev Returns address of the _token
	*/
	function token() public view returns (address) {
			return address(_token);
	}

	/**
	* @dev See {IERC20-transfer}.
	*
	* Requirements:
	*
	* - `recipient` cannot be the zero address.
	* - the caller must have a balance of at least `amount`.
	*/
	function transfer(address recipient, uint256 amount) public onlyWhitelisted returns (bool) {
			return _token.transfer(recipient, amount);
	}

	/**
	* @dev See {IERC20-approve}.
	*
	* Requirements:
	*
	* - `spender` cannot be the zero address.
	*/
	function approve(address spender, uint256 amount) public onlyWhitelisted returns (bool) {
			return _token.approve(spender, amount);
	}

	/**
	* @dev See {IERC20-transferFrom}.
	*
	* Emits an {Approval} event indicating the updated allowance. This is not
	* required by the EIP. See the note at the beginning of {ERC20};
	*
	* Requirements:
	* - `sender` and `recipient` cannot be the zero address.
	* - `sender` must have a balance of at least `amount`.
	* - the caller must have allowance for `sender`'s tokens of at least
	* `amount`.
	*/
	function transferFrom(address sender, address recipient, uint256 amount) public onlyWhitelisted returns (bool) {
			return _token.transferFrom(sender, recipient, amount);
	}

	/**
	* @dev Atomically increases the allowance granted to `spender` by the caller.
	*
	* This is an alternative to {approve} that can be used as a mitigation for
	* problems described in {IERC20-approve}.
	*
	* Emits an {Approval} event indicating the updated allowance.
	*
	* Requirements:
	*
	* - `spender` cannot be the zero address.
	*/
	function increaseAllowance(address spender, uint256 addedValue) public onlyWhitelisted returns (bool) {
			return _token.increaseAllowance(spender, addedValue);
	}

	/**
	* @dev Atomically decreases the allowance granted to `spender` by the caller.
	*
	* This is an alternative to {approve} that can be used as a mitigation for
	* problems described in {IERC20-approve}.
	*
	* Emits an {Approval} event indicating the updated allowance.
	*
	* Requirements:
	*
	* - `spender` cannot be the zero address.
	* - `spender` must have allowance for the caller of at least
	* `subtractedValue`.
	*/
	function decreaseAllowance(address spender, uint256 subtractedValue) public onlyWhitelisted returns (bool) {
			return _token.decreaseAllowance(spender, subtractedValue);
	}

	/**
	* @dev See {ERC20-_mint}.
	*
	* Requirements:
	*
	* - the caller must have the {MinterRole}.
	*/
	function mint(address account, uint256 amount) public onlyWhitelisted returns (bool) {
		return _token.mint(account, amount);
	}
}


