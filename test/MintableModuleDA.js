const { BN, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const CBERC20Token = artifacts.require("CBERC20Token");
const CBBank = artifacts.require("CBBank");
const MintableModuleDA = artifacts.require("MintableModuleDA");
const {
  ERC20: ERC20Options,
  MINT_MODULE: MINT_MODULE_OPTIONS,
} = require("../deploy-params");

require('chai').should();

contract('MintableModuleDA', (accounts) => {
  const beneficiar = ERC20Options.initialBeneficiar;
  /*
  * - Deployer
  * - Minter
  * - Admin for Bank
  */
  const account_0 = accounts[0];

  let erc20;
  let bank;
  let minter;

  function expectEqualWithPrecision(expectValue, actualValue, precision = 1) {
    const expectValueStr = expectValue.toString().slice(0, -precision);
    const actualValueStr = actualValue.toString().slice(0, -precision)

    expect(expectValueStr).to.be.equal(actualValueStr);
  }

  beforeEach(async () => {
      erc20 = await CBERC20Token.new(beneficiar);
      bank = await CBBank.new(erc20.address);
      minter = await MintableModuleDA.new(bank.address, MINT_MODULE_OPTIONS.teamAddresses, MINT_MODULE_OPTIONS.teamPcts);

      await bank.addWhitelisted(minter.address);
      await erc20.addMinter(bank.address);
  });

  it('should create contracts with right balances', async () => {
    const currentTime = await time.latest();
    const bankBalanceBefore = await erc20.balanceOf(bank.address);
    const balancesTeamBefore = await Promise.all(MINT_MODULE_OPTIONS.teamAddresses.map(x => erc20.balanceOf(x)))
    expect(bankBalanceBefore).to.be.bignumber.zero;

    const secondsPerPeriod = await minter.secondsPerPeriod();
    const tokensPerPeriod = await minter.tokensPerPeriod();
    const persentDecrease = await minter.persentDecrease();
    const startMintTime = await minter.startMintTime();
    const lastMintTime = await minter.lastMintTime();

    expect(secondsPerPeriod).to.be.bignumber.equal(new BN(2764800));
    expect(tokensPerPeriod).to.be.bignumber.equal(new BN('672000000000000000000000000'));
    expect(persentDecrease).to.be.bignumber.equal(new BN(21));
    expect(startMintTime).to.be.bignumber.equal(currentTime.sub(secondsPerPeriod));
    expect(lastMintTime).to.be.bignumber.equal(currentTime);

    MINT_MODULE_OPTIONS.teamPcts.forEach((pct, i) => {
      expect(balancesTeamBefore[i]).to.be.bignumber.zero
    })
  });

  it('should deny minting tokens if MintableModule is not whitelisted', async () => {
    await time.increase(new BN('1'));
    await minter.mint({ from: account_0 });
    await time.increase(new BN('1'));
    await bank.removeWhitelisted(minter.address);

    await expectRevert(minter.mint({ from: account_0 }),
      'WhitelistedRole: caller does not have the Whitelisted role',
    );
  });

  it('should lastMint time be adjusted after calling mint', async () => {
    const currentTime = await time.latest();
    const lastMintTime = await minter.lastMintTime();

    expect(lastMintTime).to.be.bignumber.equal(currentTime);

    const increaseOn = new BN(235235);
    await time.increase(increaseOn);
    const txHash = await minter.mint({ from: account_0 });
    const blockNumber = txHash.receipt.blockNumber;
    const block = await web3.eth.getBlock(blockNumber);
    const blockTime = new BN(block.timestamp);

    expect(blockTime).to.be.bignumber.equal(currentTime.add(increaseOn));
  });

  /*

  *       now
  .       second in the period
  .....   1 full period
  _       paid second in the period
  /////   skipped period

  ...*. ..... ..... ..... ..... ..... - we don't have such case as we start from period 2
  ..... ...*. ..... ..... ..... ..... - we don't have such case as we start from period 2
  ///// ...*. ..... ..... ..... ..... - done
  ///// __.*. ..... ..... ..... ..... - done
  ///// __... ..*.. ..... ..... ..... - done
  ///// _____ *.... ..... ..... ..... - done
  ///// _____ ..*.. ..... ..... ..... - done
  ///// _____ ..... *.... ..... ..... - done
  ///// _____ ..... ..*.. ..... ..... - done
  ///// _____ ..... ..... ..*.. ..... - done

  */

  it('should fulfill case: ///// ..*.. ..... ..... ..... .....', async () => {
    const secondsPerPeriod = await minter.secondsPerPeriod();
    const tokensPerPeriod = await minter.tokensPerPeriod();
    const persentDecrease = await minter.persentDecrease();

    const secondsToPayFor = secondsPerPeriod.div(new BN(2));

    // advance the blockchain clock
    const currentTime = await time.latest();
    await time.increase(secondsToPayFor);
    const txHash = await minter.mint({ from: account_0 });
    const blockNumber = txHash.receipt.blockNumber;
    const block = await web3.eth.getBlock(blockNumber);
    const blockTime = new BN(block.timestamp);

    const amountShouldBeMinted = secondsToPayFor.mul(tokensPerPeriod).mul(new BN(100).sub(persentDecrease)).div(new BN(100).mul(secondsPerPeriod));
    const amountShouldBeMintedToTeam = amountShouldBeMinted.div(new BN(10));
    
    const bankBalanceAfter = await erc20.balanceOf(bank.address);

    expect(blockTime).to.be.bignumber.equal(currentTime.add(secondsToPayFor));
    expectEqualWithPrecision(bankBalanceAfter, amountShouldBeMinted.sub(amountShouldBeMintedToTeam))
  });

  it('should fulfill case: ///// __.*. ..... ..... ..... .....', async () => {
    const secondsPerPeriod = await minter.secondsPerPeriod();
    const tokensPerPeriod = await minter.tokensPerPeriod();
    const persentDecrease = await minter.persentDecrease();

    const secondsToIncreaseToMiddle = secondsPerPeriod.div(new BN(2));
    const secondsToAlmostEnd = secondsPerPeriod.sub(secondsToIncreaseToMiddle).sub(new BN(1));
    const secondsToPayFor = secondsToIncreaseToMiddle.add(secondsToAlmostEnd);

    // advance the blockchain clock
    const currentTime = await time.latest();
    await time.increase(secondsToIncreaseToMiddle);
    await minter.mint({ from: account_0 });

    await time.increase(secondsToAlmostEnd);
    const txHash = await minter.mint({ from: account_0 });

    const blockNumber = txHash.receipt.blockNumber;
    const block = await web3.eth.getBlock(blockNumber);
    const blockTime = new BN(block.timestamp);

    const amountShouldBeMinted = secondsToPayFor.mul(tokensPerPeriod).mul(new BN(100).sub(persentDecrease)).div(new BN(100).mul(secondsPerPeriod));

    const amountShouldBeMintedToTeam = amountShouldBeMinted.div(new BN(10));
    
    const bankBalanceAfter = await erc20.balanceOf(bank.address);

    expect(blockTime).to.be.bignumber.equal(currentTime.add(secondsToPayFor));
    expectEqualWithPrecision(bankBalanceAfter, amountShouldBeMinted.sub(amountShouldBeMintedToTeam))
  });

  it('should fulfill case: ///// __... ..*.. ..... ..... .....', async () => {
      const secondsPerPeriod = await minter.secondsPerPeriod();
      const tokensPerPeriod = await minter.tokensPerPeriod();
      const persentDecrease = await minter.persentDecrease();

      const secondsToPayFor_thirdPeriod = secondsPerPeriod.div(new BN(2));

      // advance the blockchain clock
      const currentTime = await time.latest();
      await time.increase(secondsToPayFor_thirdPeriod);      
      await minter.mint({ from: account_0 });

      await time.increase(secondsPerPeriod);
      const txHash = await minter.mint({ from: account_0 });

      const blockNumber = txHash.receipt.blockNumber;
      const block = await web3.eth.getBlock(blockNumber);
      const blockTime = new BN(block.timestamp);

      const persentToLeft = new BN(100).sub(persentDecrease);
      const amountShouldBeMinted_1 = secondsPerPeriod.mul(tokensPerPeriod.mul(persentToLeft)).div(new BN(100).mul(secondsPerPeriod));
      const amountShouldBeMinted_2 = secondsToPayFor_thirdPeriod.mul(tokensPerPeriod.mul(persentToLeft).mul(persentToLeft)).div(new BN(10000).mul(secondsPerPeriod));
      const amountShouldBeMinted = amountShouldBeMinted_1.add(amountShouldBeMinted_2);
      const amountShouldBeMintedToTeam = amountShouldBeMinted.div(new BN(10));

      const bankBalanceAfter = await erc20.balanceOf(bank.address);

      expect(blockTime).to.be.bignumber.equal(currentTime.add(secondsPerPeriod).add(secondsToPayFor_thirdPeriod));
      expectEqualWithPrecision(bankBalanceAfter, amountShouldBeMinted.sub(amountShouldBeMintedToTeam));
  });

  it('should fulfill case: ///// _____ *.... ..... ..... .....', async () => {
    const secondsPerPeriod = await minter.secondsPerPeriod();
    const tokensPerPeriod = await minter.tokensPerPeriod();
    const persentDecrease = await minter.persentDecrease();
    
    const secondsToPayFor_thirdPeriod = new BN(1);

    // advance the blockchain clock
    const currentTime = await time.latest();
    await time.increase(secondsPerPeriod);
    await minter.mint({ from: account_0 });

    await time.increase(secondsToPayFor_thirdPeriod);
    const txHash = await minter.mint({ from: account_0 });

    const blockNumber = txHash.receipt.blockNumber;
    const block = await web3.eth.getBlock(blockNumber);
    const blockTime = new BN(block.timestamp);

    const persentToLeft = new BN(100).sub(persentDecrease);
    const amountShouldBeMinted_1 = secondsPerPeriod.mul(tokensPerPeriod.mul(persentToLeft)).div(new BN(100).mul(secondsPerPeriod));
    const amountShouldBeMinted_2 = tokensPerPeriod.mul(persentToLeft).mul(persentToLeft).div(new BN(10000).mul(secondsPerPeriod));
    const amountShouldBeMinted = amountShouldBeMinted_1.add(amountShouldBeMinted_2);
    const amountShouldBeMintedToTeam = amountShouldBeMinted.div(new BN(10));

    const bankBalanceAfter = await erc20.balanceOf(bank.address);
    const lastMintTime = await minter.lastMintTime();
    
    expect(currentTime.add(secondsPerPeriod).add(secondsToPayFor_thirdPeriod)).to.be.bignumber.equal(blockTime);
    expect(lastMintTime).to.be.bignumber.equal(blockTime);
    expectEqualWithPrecision(bankBalanceAfter, amountShouldBeMinted.sub(amountShouldBeMintedToTeam));
  });

  it('should fulfill case: ///// _____ ..*.. ..... ..... .....', async () => {
    const secondsPerPeriod = await minter.secondsPerPeriod();
    const tokensPerPeriod = await minter.tokensPerPeriod();
    const persentDecrease = await minter.persentDecrease();

    const secondsToPayFor_thirdPeriod = secondsPerPeriod.div(new BN(2));

    // advance the blockchain clock
    const currentTime = await time.latest();
    await time.increase(secondsPerPeriod);
    await minter.mint({ from: account_0 });

    await time.increase(secondsToPayFor_thirdPeriod);
    const txHash = await minter.mint({ from: account_0 });

    const blockNumber = txHash.receipt.blockNumber;
    const block = await web3.eth.getBlock(blockNumber);
    const blockTime = new BN(block.timestamp);

    const persentToLeft = new BN(100).sub(persentDecrease);
    const amountShouldBeMinted_1 = secondsPerPeriod.mul(tokensPerPeriod.mul(persentToLeft)).div(new BN(100).mul(secondsPerPeriod));
    const amountShouldBeMinted_2 = secondsToPayFor_thirdPeriod.mul(tokensPerPeriod.mul(persentToLeft).mul(persentToLeft)).div(new BN(10000).mul(secondsPerPeriod));
    const amountShouldBeMinted = amountShouldBeMinted_1.add(amountShouldBeMinted_2);
    const amountShouldBeMintedToTeam = amountShouldBeMinted.div(new BN(10));

    const bankBalanceAfter = await erc20.balanceOf(bank.address);
    
    expect(blockTime).to.be.bignumber.equal(currentTime.add(secondsPerPeriod).add(secondsToPayFor_thirdPeriod));
    expectEqualWithPrecision(bankBalanceAfter, amountShouldBeMinted.sub(amountShouldBeMintedToTeam));
  });

  it('should fulfill case: ///// _____ ..... *.... ..... .....', async () => {
    const currentTime = await time.latest();
    const secondsPerPeriod = await minter.secondsPerPeriod();
    const tokensPerPeriod = await minter.tokensPerPeriod();
    const persentDecrease = await minter.persentDecrease();

    const secondsToPayFor_fourthPeriod = new BN(1);

    // advance the blockchain clock
    await time.increase(secondsPerPeriod);
    await minter.mint({ from: account_0 });

    await time.increase(secondsPerPeriod.add(secondsToPayFor_fourthPeriod));
    const txHash = await minter.mint({ from: account_0 });

    const blockNumber = txHash.receipt.blockNumber;
    const block = await web3.eth.getBlock(blockNumber);
    const blockTime = new BN(block.timestamp);

    const persentToLeft = new BN(100).sub(persentDecrease);
    const amountShouldBeMinted_1 = secondsPerPeriod.mul(tokensPerPeriod.mul(persentToLeft)).div(new BN(100).mul(secondsPerPeriod));
    const amountShouldBeMinted_2 = secondsPerPeriod.mul(tokensPerPeriod.mul(persentToLeft).mul(persentToLeft)).div(new BN(10000).mul(secondsPerPeriod));
    const amountShouldBeMinted_3 = secondsToPayFor_fourthPeriod.mul(tokensPerPeriod.mul(persentToLeft).mul(persentToLeft).mul(persentToLeft)).div(new BN(1000000).mul(secondsPerPeriod));
    const amountShouldBeMinted = amountShouldBeMinted_1.add(amountShouldBeMinted_2).add(amountShouldBeMinted_3);
    const amountShouldBeMintedToTeam = amountShouldBeMinted.div(new BN(10));

    const bankBalanceAfter = await erc20.balanceOf(bank.address);
    
    expect(blockTime).to.be.bignumber.equal(currentTime.add(secondsPerPeriod).add(secondsPerPeriod).add(secondsToPayFor_fourthPeriod));
    expectEqualWithPrecision(bankBalanceAfter, amountShouldBeMinted.sub(amountShouldBeMintedToTeam));
  });

  it('should fulfill case: ///// _____ ..... ..*.. ..... .....', async () => {
    const currentTime = await time.latest();
    const secondsPerPeriod = await minter.secondsPerPeriod();
    const tokensPerPeriod = await minter.tokensPerPeriod();
    const persentDecrease = await minter.persentDecrease();

    const secondsToPayFor_fourthPeriod = secondsPerPeriod.div(new BN(2));

    // advance the blockchain clock
    await time.increase(secondsPerPeriod);
    await minter.mint({ from: account_0 });

    await time.increase(secondsPerPeriod.add(secondsToPayFor_fourthPeriod));
    const txHash = await minter.mint({ from: account_0 });

    const blockNumber = txHash.receipt.blockNumber;
    const block = await web3.eth.getBlock(blockNumber);
    const blockTime = new BN(block.timestamp);

    const persentToLeft = new BN(100).sub(persentDecrease);
    const amountShouldBeMinted_1 = secondsPerPeriod.mul(tokensPerPeriod.mul(persentToLeft)).div(new BN(100).mul(secondsPerPeriod));
    const amountShouldBeMinted_2 = secondsPerPeriod.mul(tokensPerPeriod.mul(persentToLeft).mul(persentToLeft)).div(new BN(10000).mul(secondsPerPeriod));
    const amountShouldBeMinted_3 = secondsToPayFor_fourthPeriod.mul(tokensPerPeriod.mul(persentToLeft).mul(persentToLeft).mul(persentToLeft)).div(new BN(1000000).mul(secondsPerPeriod));
    const amountShouldBeMinted = amountShouldBeMinted_1.add(amountShouldBeMinted_2).add(amountShouldBeMinted_3);
    const amountShouldBeMintedToTeam = amountShouldBeMinted.div(new BN(10));

    const bankBalanceAfter = await erc20.balanceOf(bank.address);
    
    expect(blockTime).to.be.bignumber.equal(currentTime.add(secondsPerPeriod).add(secondsPerPeriod).add(secondsToPayFor_fourthPeriod));
    expectEqualWithPrecision(bankBalanceAfter, amountShouldBeMinted.sub(amountShouldBeMintedToTeam));
  });

  it('should fulfill case: ///// _____ ..... ..... ..*.. .....', async () => {
    const currentTime = await time.latest();
    const secondsPerPeriod = await minter.secondsPerPeriod();
    const tokensPerPeriod = await minter.tokensPerPeriod();
    const persentDecrease = await minter.persentDecrease();

    const secondsToPayFor_fifthPeriod = secondsPerPeriod.div(new BN(2));

    // advance the blockchain clock
    await time.increase(secondsPerPeriod);
    await minter.mint({ from: account_0 });

    await time.increase(secondsPerPeriod.add(secondsPerPeriod).add(secondsToPayFor_fifthPeriod));
    const txHash = await minter.mint({ from: account_0 });

    const blockNumber = txHash.receipt.blockNumber;
    const block = await web3.eth.getBlock(blockNumber);
    const blockTime = new BN(block.timestamp);

    const persentToLeft = new BN(100).sub(persentDecrease);
    const amountShouldBeMinted_1 = secondsPerPeriod.mul(tokensPerPeriod.mul(persentToLeft)).div(new BN(100).mul(secondsPerPeriod));
    const amountShouldBeMinted_2 = secondsPerPeriod.mul(tokensPerPeriod.mul(persentToLeft).mul(persentToLeft)).div(new BN(10000).mul(secondsPerPeriod));
    const amountShouldBeMinted_3 = secondsPerPeriod.mul(tokensPerPeriod.mul(persentToLeft).mul(persentToLeft).mul(persentToLeft)).div(new BN(1000000).mul(secondsPerPeriod));
    const amountShouldBeMinted_4 = secondsToPayFor_fifthPeriod.mul(tokensPerPeriod.mul(persentToLeft).mul(persentToLeft).mul(persentToLeft).mul(persentToLeft)).div(new BN(100000000).mul(secondsPerPeriod));
    const amountShouldBeMinted = amountShouldBeMinted_1.add(amountShouldBeMinted_2).add(amountShouldBeMinted_3).add(amountShouldBeMinted_4);
    const amountShouldBeMintedToTeam = amountShouldBeMinted.div(new BN(10));

    const bankBalanceAfter = await erc20.balanceOf(bank.address);
    
    expect(blockTime).to.be.bignumber.equal(currentTime.add(secondsPerPeriod).add(secondsPerPeriod).add(secondsPerPeriod).add(secondsToPayFor_fifthPeriod));
    expectEqualWithPrecision(bankBalanceAfter, amountShouldBeMinted.sub(amountShouldBeMintedToTeam));
  });
});
