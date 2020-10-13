const { BN, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const CBERC20Token = artifacts.require("CBERC20Token");
const CBBank = artifacts.require("CBBank");
const MintableModule = artifacts.require("MintableModule");
const {
  ERC20: ERC20Options,
  MINT_MODULE: MINT_MODULE_OPTIONS,
} = require("../deploy-params");

require('chai').should();

contract('MintableModule', (accounts) => {
  const beneficiar = ERC20Options.initialBeneficiar;
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
  let minter;

  beforeEach(async () => {
      erc20 = await CBERC20Token.new(beneficiar);
      bank = await CBBank.new(erc20.address);
      minter = await MintableModule.new(bank.address, MINT_MODULE_OPTIONS.teamAddresses, MINT_MODULE_OPTIONS.teamPcts);

      await bank.addWhitelisted(minter.address);
      await erc20.addMinter(bank.address);
  });

  it('should have possibility mint tokens pro rata if MintableModule has whitelisted role', async () => {
    const bankBalanceBefore = await erc20.balanceOf(bank.address);
    const balancesTeamBefore = await Promise.all(MINT_MODULE_OPTIONS.teamAddresses.map(x => erc20.balanceOf(x)))
    expect(bankBalanceBefore).to.be.bignumber.zero;
    const lastBlockTime = await minter.lastMintTime();
    const tokensPerSecond = await minter.tokensPerSecond();

    // advance the blockchain clock
    await time.increase(100);
    const txHash = await minter.mint({ from: account_0 });
    const blockNumber = txHash.receipt.blockNumber;
    const block = await web3.eth.getBlock(blockNumber);
    const blockTime = new BN(block.timestamp);
    const bankBalanceAfter = await erc20.balanceOf(bank.address);
    const balancesTeamAfter = await Promise.all(MINT_MODULE_OPTIONS.teamAddresses.map(x => erc20.balanceOf(x)))

    const expectedTokensMinted = blockTime.sub(lastBlockTime).mul(tokensPerSecond);
    const expectedTeamTokens = expectedTokensMinted.div(new BN(10));

    let teamSum = new BN(0);

    // check that each team member received the proportional number of tokens
    MINT_MODULE_OPTIONS.teamPcts.forEach((pct, i) => {
      const expectedMemberTokens = expectedTeamTokens.mul(new BN(pct)).div(new BN(100));
      expect(balancesTeamAfter[i]).to.be.bignumber.equal(expectedMemberTokens);
      teamSum = teamSum.add(expectedMemberTokens);
    })

    // it should have only sent tokens to the team
    expect(bankBalanceAfter.add(teamSum)).to.be.bignumber.equal(expectedTokensMinted);
  });

  it('should deny minting tokens if MintableModule is not whitelisted', async () => {
    await minter.mint({ from: account_0 });
    await bank.removeWhitelisted(minter.address);

    await expectRevert(minter.mint({ from: account_0 }),
      'WhitelistedRole: caller does not have the Whitelisted role',
    );
  });
});
