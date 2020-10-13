const { BN, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const CBERC20Token = artifacts.require("CBERC20Token");
const CBBank = artifacts.require("CBBank");
const {
  ERC20: ERC20Options,
  MINT_MODULE: MINT_MODULE_OPTIONS,
} = require("../deploy-params");

require('chai').should();

contract('CBBANK', (accounts) => {
  const beneficiar = ERC20Options.initialBeneficiar;
  const bankBudget = new BN('100000000000000000000000');
  /*
  * - Deployer
  * - Minter
  * - Admin for Bank
  */
  const account_0 = accounts[0];
  const account_1 = accounts[1];
  const account_2 = accounts[2];

  let erc20;
  let bank;

  beforeEach(async () => {
      erc20 = await CBERC20Token.new(beneficiar);
      bank = await CBBank.new(erc20.address);

      erc20.mint(bank.address, bankBudget);
  });

  it('bank should have right initial props', async () => {
    const balance = await erc20.balanceOf(bank.address);
    const tokenAddress = await bank.token();
    const isWhitelistAdmin = await bank.isWhitelistAdmin(account_0);

    expect(balance).to.be.bignumber.equal(bankBudget);
    expect(tokenAddress).to.be.bignumber.equal(erc20.address);
    expect(isWhitelistAdmin).equal(true);
  });

  it('should have possibility transfering tokens if user has whitelisted role', async () => {
    const amount = new BN("100939");
    const balanceBefore = await erc20.balanceOf(account_1);
    expect(balanceBefore).to.be.bignumber.equal(new BN(0));
    
    await bank.addWhitelisted(account_0);
    await bank.transfer(account_1, amount);
    const balanceAfter = await erc20.balanceOf(account_1);

    expect(balanceAfter).to.be.bignumber.equal(amount);
  });

  it('should have possibility increaseAllowance if user has whitelisted role', async () => {
    const amount = new BN('103443');
    const allowenceBefore = await erc20.allowance(bank.address, account_1);
    expect(allowenceBefore).to.be.bignumber.equal(new BN(0));
    
    await bank.addWhitelisted(account_0);
    await bank.increaseAllowance(account_1, amount);
    const allowenceAfter = await erc20.allowance(bank.address, account_1);

    expect(allowenceAfter).to.be.bignumber.equal(amount);
  });

  it('should have possibility decreaseAllowance if user has whitelisted role', async () => {
    const amount = new BN('103443');
    const amountDecr = new BN('200');
    await bank.addWhitelisted(account_0);
    await bank.increaseAllowance(account_1, amount);

    await bank.decreaseAllowance(account_1, amountDecr);
    const allowenceAfter = await erc20.allowance(bank.address, account_1);

    expect(allowenceAfter).to.be.bignumber.equal(amount.sub(amountDecr));
  });


  it('should have possibility transferFrom tokens if user has whitelisted role', async () => {
    await bank.addWhitelisted(account_0);
    const amount = new BN("100939");
    erc20.mint(account_0, amount);
    await erc20.approve(bank.address, amount);
    const balanceBefore = await erc20.balanceOf(account_1);
    expect(balanceBefore).to.be.bignumber.equal(new BN(0));
    
    await bank.transferFrom(account_0, account_1, amount);
    const balanceAfter = await erc20.balanceOf(account_1);

    expect(balanceAfter).to.be.bignumber.equal(amount);
  });

  it('should fail if user doesn\'t whitelisted role', async () => { 
    const amount = new BN("100939");

    await expectRevert(bank.transfer(account_1, amount),
      'WhitelistedRole: caller does not have the Whitelisted role',
    );
    await expectRevert(bank.approve(account_1, amount),
      'WhitelistedRole: caller does not have the Whitelisted role',
    );
    await expectRevert(bank.transferFrom(account_1, account_2, amount),
      'WhitelistedRole: caller does not have the Whitelisted role',
    );
    await expectRevert(bank.increaseAllowance(account_1, amount),
      'WhitelistedRole: caller does not have the Whitelisted role',
    );
    await expectRevert(bank.decreaseAllowance(account_1, amount),
      'WhitelistedRole: caller does not have the Whitelisted role',
    );
  });
});
