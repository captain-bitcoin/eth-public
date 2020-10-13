const { BN, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const CBERC20Token = artifacts.require("CBERC20Token");
const {
  ERC20: ERC20Options,
} = require("../deploy-params");

require('chai').should();

contract('CBERC20Token', (accounts) => {
  const initialSupply = new BN("2100000000000000000000000000")
  const beneficiar = ERC20Options.initialBeneficiar;
  /*
  * - Deployer
  * - Minter
  */
  const account_0 = accounts[0];
  const account_1 = accounts[1];
  const account_2 = accounts[2];

  let erc20;

  it(`should put ${initialSupply} tokens in the beneficiar (${beneficiar}) account`, async () => {
    erc20 = await CBERC20Token.new(beneficiar);
    const balance = await erc20.balanceOf(beneficiar);
    expect(balance).to.be.bignumber.equal(initialSupply);
  });

  it(`should mint 2000 tokens`, async () => {
    const mintAmount = new BN("1000");
    const totalSupplyBefore = await erc20.totalSupply();
    const benBalanceBefore = await erc20.balanceOf(beneficiar);

    await erc20.mint(beneficiar, mintAmount);
    const balanceAfter = await erc20.balanceOf(beneficiar);
    const totalSupplyAfter = await erc20.totalSupply();

    expect(balanceAfter).to.be.bignumber.equal(benBalanceBefore.add(mintAmount));
    expect(totalSupplyAfter).to.be.bignumber.equal(totalSupplyBefore.add(mintAmount));
  });

  it(`should deny to mint tokens if user is not minter`, async () => {
    const mintAmount = new BN("1000");
    
    await expectRevert(erc20.mint(beneficiar, mintAmount, { from: account_1 }),
      'MinterRole: caller does not have the Minter role',
    );
  });

  it(`should allow to mint tokens if user added as minter`, async () => {
    const mintAmount = new BN("1000");
    const isMinterBefore = await erc20.isMinter(account_1);
    expect(isMinterBefore).equal(false);
    
    await erc20.addMinter(account_1);
    await erc20.mint(beneficiar, mintAmount, { from: account_1 });
    const isMinterAfter = await erc20.isMinter(account_1);

    expect(isMinterAfter).equal(true);
  });

  it(`should remove minter`, async () => {
    const mintAmount = new BN("1000");
    await erc20.renounceMinter();
    
    await expectRevert(erc20.mint(beneficiar, mintAmount),
      'MinterRole: caller does not have the Minter role',
    );
  });

});
