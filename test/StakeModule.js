const { BN, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const CBERC20Token = artifacts.require("CBERC20Token");
const CBBank = artifacts.require("CBBank");
const StakeModule = artifacts.require("StakeModule");
const MintableModule = artifacts.require("MintableModule");
const {
  ERC20: ERC20Options,
  MINT_MODULE: MINT_MODULE_OPTIONS,
} = require("../deploy-params");
const {
  signData,
} = require('../scripts/signer');

require('chai').should();

contract.only('StakeModule', (accounts) => {
  /*
  * - Deployer
  * - Admin for Bank
  */
  const account_0 = accounts[0];
  const account_1 = accounts[1];
  const beneficiar = account_1;

  const trustedSignerAddress = '0xc2A8A4321454958B39BfC0654bacA78AE4E07Cf1';
  const trustedSignerPrivateKey = '0x3d553d9378d53cfc1f0692983c272e57f42809306ff3109b137fe071bfde8516';
  const trustedInvalidSignerPrivateKey = '0x722a39b81353bc9ff3b090d9d970f18096fe94495d4bc5899ebd763d4c309263';

  let erc20;
  let bank;
  let stake;
  let nonce = 0;
  let oneTicketInTokens = 0;

  const dataToSign = {
    userId: new BN(0),
    beneficiar: account_1,
    tickets: new BN("2"),
    nonce: new BN(nonce),
    minTimestamp: new BN(0),
    maxTimestamp: undefined,
  };

  beforeEach(async () => {
      erc20 = await CBERC20Token.new(beneficiar);
      bank = await CBBank.new(erc20.address);
      stake = await StakeModule.new(bank.address, erc20.address, trustedSignerAddress);
      minter = await MintableModule.new(bank.address, MINT_MODULE_OPTIONS.teamAddresses, MINT_MODULE_OPTIONS.teamPcts);

      await bank.addWhitelisted(minter.address);
      await bank.addWhitelisted(stake.address);

      await time.increase(10000);
      await erc20.addMinter(bank.address);
      await minter.mint({ from: account_0 });
  });

  it('should be valid stake tokens signature', async () => {
    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 150);
    const {
      signature,
    } = await signData(Object.values(dataToSign), trustedSignerPrivateKey);

    const isValid = await stake.isValidOperation(
      dataToSign.userId,
      dataToSign.beneficiar,
      dataToSign.tickets,
      dataToSign.nonce,
      dataToSign.minTimestamp,
      dataToSign.maxTimestamp,
      signature,
    );
    expect(isValid).to.equal(true);
  });

  it('should be invalid stake tokens signature if minTimestamp bigger than current block time', async () => {
    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 150);
    const {
      signature,
    } = await signData(Object.values(dataToSign), trustedSignerPrivateKey);

    const isValid = await stake.isValidOperation(
      dataToSign.userId,
      dataToSign.beneficiar,
      dataToSign.tickets,
      dataToSign.nonce,
      new BN(currentTime + 1),
      dataToSign.maxTimestamp,
      signature,
    );
    expect(isValid).to.equal(false);
  });

  it('should not be valid stake tokens signature if trusted pk is not right', async () => {
    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 150);
    const {
      signature,
    } = await signData(Object.values(dataToSign), trustedInvalidSignerPrivateKey);

    const isValid = await stake.isValidOperation(
      dataToSign.userId,
      dataToSign.beneficiar,
      dataToSign.tickets,
      dataToSign.nonce,
      dataToSign.minTimestamp,
      dataToSign.maxTimestamp,
      signature,
    );
    expect(isValid).to.equal(false);
  });

  it('should allow stake tokens from bank', async () => {
    oneTicketInTokens = await stake.oneTicketInTokens();
    const tokensToStake = oneTicketInTokens.mul(dataToSign.tickets);
    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 400);
    const balanceBefore = await stake.stakeOf(dataToSign.beneficiar);

    const {
      signature,
    } = await signData(Object.values(dataToSign), trustedSignerPrivateKey);
    await stake.stakeTokensFromBank(
      dataToSign.userId,
      dataToSign.beneficiar,
      dataToSign.tickets,
      dataToSign.nonce,
      dataToSign.minTimestamp,
      dataToSign.maxTimestamp,
      signature,
    );
    const balanceAfter = await stake.stakeOf(dataToSign.beneficiar);

    expect(balanceBefore).to.be.bignumber.equal(new BN(0));
    expect(balanceAfter).to.be.bignumber.equal(new BN(balanceBefore + tokensToStake));
  });

  it('should not allow stake tokens from bank if signature is invalid', async () => {
    oneTicketInTokens = await stake.oneTicketInTokens();
    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 150);

    const {
      signature,
    } = await signData(Object.values(dataToSign), trustedInvalidSignerPrivateKey);
    await expectRevert(stake.stakeTokensFromBank(
      dataToSign.userId,
      dataToSign.beneficiar,
      dataToSign.tickets,
      dataToSign.nonce,
      dataToSign.minTimestamp,
      dataToSign.maxTimestamp,
      signature,
    ),
      'StakeModule: signature is not valid',
    );
  });

  it('should not allow stake tokens from bank if param in signature is different than it was in signature', async () => {
    oneTicketInTokens = await stake.oneTicketInTokens();
    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 150 + 1); // param

    const {
      signature,
    } = await signData(Object.values(dataToSign), trustedInvalidSignerPrivateKey);
    await expectRevert(stake.stakeTokensFromBank(
      dataToSign.userId,
      dataToSign.beneficiar,
      dataToSign.tickets,
      dataToSign.nonce,
      dataToSign.minTimestamp,
      dataToSign.maxTimestamp,
      signature,
    ),
      'StakeModule: signature is not valid',
    );
  });

  it('should allow stake tokens from wallet', async () => {
    oneTicketInTokens = await stake.oneTicketInTokens();
    const tokensToStake = oneTicketInTokens.mul(dataToSign.tickets);
    const walletBalance = await erc20.balanceOf(dataToSign.beneficiar);
    expect(walletBalance).to.be.bignumber.at.least(tokensToStake);

    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 150);
    const balanceBefore = await stake.stakeOf(dataToSign.beneficiar);
    const isStakeholderBefore = await stake.isStakeholder(dataToSign.beneficiar);
    expect(isStakeholderBefore).to.equal(false);

    await erc20.increaseAllowance(stake.address, tokensToStake, { from: dataToSign.beneficiar});
    await stake.stakeTokensFromWallet(dataToSign.tickets, { from: dataToSign.beneficiar});
    const balanceAfter = await stake.stakeOf(dataToSign.beneficiar);
    const isStakeholderAfter = await stake.isStakeholder(dataToSign.beneficiar);

    expect(balanceBefore).to.be.bignumber.equal(new BN(0));
    expect(balanceAfter).to.be.bignumber.equal(new BN(balanceBefore + tokensToStake));
    expect(isStakeholderAfter).to.equal(true);
  });

  it('should allow stake tokens from wallet', async () => {
    oneTicketInTokens = await stake.oneTicketInTokens();
    const tokensToStake = oneTicketInTokens.mul(dataToSign.tickets);
    const walletBalance = await erc20.balanceOf(dataToSign.beneficiar);
    const stakeBalanceBefore = await erc20.balanceOf(stake.address);
    expect(walletBalance).to.be.bignumber.at.least(tokensToStake);
    expect(stakeBalanceBefore).to.be.bignumber.equal(new BN(0));

    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 150);
    const balanceBefore = await stake.stakeOf(dataToSign.beneficiar);
    const isStakeholderBefore = await stake.isStakeholder(dataToSign.beneficiar);
    expect(isStakeholderBefore).to.equal(false);

    await erc20.increaseAllowance(stake.address, tokensToStake, { from: dataToSign.beneficiar});
    await stake.stakeTokensFromWallet(dataToSign.tickets, { from: dataToSign.beneficiar});
    const balanceAfter = await stake.stakeOf(dataToSign.beneficiar);
    const isStakeholderAfter = await stake.isStakeholder(dataToSign.beneficiar);
    const stakeBalanceAfter = await erc20.balanceOf(stake.address);

    expect(balanceBefore).to.be.bignumber.equal(new BN(0));
    expect(balanceAfter).to.be.bignumber.equal(new BN(balanceBefore + tokensToStake));
    expect(isStakeholderAfter).to.equal(true);
    expect(stakeBalanceAfter).to.be.bignumber.equal(tokensToStake);
    expect(tokensToStake).to.be.bignumber.not.equal(new BN(0));
  });

  it('should allow stake tokens from bank', async () => {
    oneTicketInTokens = await stake.oneTicketInTokens();
    const tokensToStake = oneTicketInTokens.mul(dataToSign.tickets);
    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 400);
    const balanceBefore = await stake.stakeOf(dataToSign.beneficiar);

    const {
      signature,
    } = await signData(Object.values(dataToSign), trustedSignerPrivateKey);
    await stake.stakeTokensFromBank(
      dataToSign.userId,
      dataToSign.beneficiar,
      dataToSign.tickets,
      dataToSign.nonce,
      dataToSign.minTimestamp,
      dataToSign.maxTimestamp,
      signature,
    );
    const balanceAfter = await stake.stakeOf(dataToSign.beneficiar);

    expect(balanceBefore).to.be.bignumber.equal(new BN(0));
    expect(balanceAfter).to.be.bignumber.equal(new BN(balanceBefore + tokensToStake));
  });

  it('should allow stake tokens from bank', async () => {
    oneTicketInTokens = await stake.oneTicketInTokens();
    const tokensToStake = oneTicketInTokens.mul(dataToSign.tickets);
    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 400);
    const balanceBefore = await stake.stakeOf(dataToSign.beneficiar);

    const {
      signature,
    } = await signData(Object.values(dataToSign), trustedSignerPrivateKey);
    await stake.stakeTokensFromBank(
      dataToSign.userId,
      dataToSign.beneficiar,
      dataToSign.tickets,
      dataToSign.nonce,
      dataToSign.minTimestamp,
      dataToSign.maxTimestamp,
      signature,
    );
    const balanceAfter = await stake.stakeOf(dataToSign.beneficiar);

    expect(balanceBefore).to.be.bignumber.equal(new BN(0));
    expect(balanceAfter).to.be.bignumber.equal(new BN(balanceBefore + tokensToStake));
  });

  it('should allow withdraw tokens from stake if all params valid', async () => {
    oneTicketInTokens = await stake.oneTicketInTokens();
    const tokensToStake = oneTicketInTokens.mul(dataToSign.tickets);
    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 400);
    const {
      signature: signatureStake,
    } = await signData(Object.values(dataToSign), trustedSignerPrivateKey);
    await stake.stakeTokensFromBank(
      dataToSign.userId,
      dataToSign.beneficiar,
      dataToSign.tickets,
      dataToSign.nonce,
      dataToSign.minTimestamp,
      dataToSign.maxTimestamp,
      signatureStake,
    );
    const walletBalanceBefore = await erc20.balanceOf(dataToSign.beneficiar);
    const stakedBalanceBefore = await stake.stakeOf(dataToSign.beneficiar);
    expect(stakedBalanceBefore).to.be.bignumber.equal(tokensToStake);

    const withdtawData = {
      ...dataToSign,
      nonce: dataToSign.nonce.add(new BN(1)),
    }
    const {
      signature: signatureWithdraw,
    } = await signData(Object.values(withdtawData), trustedSignerPrivateKey);
    await stake.withdrawStake(
      withdtawData.userId,
      withdtawData.beneficiar,
      withdtawData.tickets,
      withdtawData.nonce,
      withdtawData.minTimestamp,
      withdtawData.maxTimestamp,
      signatureWithdraw,
      { from: dataToSign.beneficiar },
    );
    const stakedBalanceAfter = await stake.stakeOf(dataToSign.beneficiar);
    const walletBalanceAfter = await erc20.balanceOf(dataToSign.beneficiar);
    const stakeBalanceAfter = await erc20.balanceOf(stake.address);

    expect(stakedBalanceAfter).to.be.bignumber.equal(stakedBalanceBefore.sub(tokensToStake));
    expect(walletBalanceAfter).to.be.bignumber.equal(walletBalanceBefore.add(tokensToStake));
    expect(stakeBalanceAfter).to.be.bignumber.equal(new BN(0));
  });

  it('should not allow withdraw tokens from stake if user has not enough tokens', async () => {
    oneTicketInTokens = await stake.oneTicketInTokens();
    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 400);
  
    const withdtawData = {
      ...dataToSign,
      nonce: dataToSign.nonce.add(new BN(1)),
    }
    const {
      signature: signatureWithdraw,
    } = await signData(Object.values(withdtawData), trustedSignerPrivateKey);
    await expectRevert(
      stake.withdrawStake(
        withdtawData.userId,
        withdtawData.beneficiar,
        withdtawData.tickets,
        withdtawData.nonce,
        withdtawData.minTimestamp,
        withdtawData.maxTimestamp,
        signatureWithdraw,
        { from: dataToSign.beneficiar },
      ),
      "Insufficient amount of staked tokens",
    );
  });
});
