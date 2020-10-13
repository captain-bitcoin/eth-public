const { BN, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const CBERC20Token = artifacts.require("CBERC20Token");
const CBBank = artifacts.require("CBBank");
const WithdrawalModule = artifacts.require("WithdrawalModule");
const MintableModule = artifacts.require("MintableModule");
const {
  ERC20: ERC20Options,
  MINT_MODULE: MINT_MODULE_OPTIONS,
} = require("../deploy-params");
const {
  signData,
} = require('../scripts/signer');

require('chai').should();

contract('WithdrawalModule', (accounts) => {
  const beneficiar = ERC20Options.initialBeneficiar;
  /*
  * - Deployer
  * - Admin for Bank
  */
  const account_0 = accounts[0];
  const account_1 = accounts[1];

  const trustedSignerAddress = '0xc2A8A4321454958B39BfC0654bacA78AE4E07Cf1';
  const trustedSignerPrivateKey = '0x3d553d9378d53cfc1f0692983c272e57f42809306ff3109b137fe071bfde8516';
  const trustedInvalidSignerPrivateKey = '0x722a39b81353bc9ff3b090d9d970f18096fe94495d4bc5899ebd763d4c309263';

  let erc20;
  let bank;
  let withdrawal;
  let nonce = 0;

  const dataToSign = {
    userId: new BN(0),
    beneficiar: account_1,
    amount: new BN("2100000000000000000000"),
    nonce: new BN(nonce),
    maxTimestamp: undefined,
  };

  beforeEach(async () => {
      erc20 = await CBERC20Token.new(beneficiar);
      bank = await CBBank.new(erc20.address);
      withdrawal = await WithdrawalModule.new(bank.address, trustedSignerAddress);
      minter = await MintableModule.new(bank.address, MINT_MODULE_OPTIONS.teamAddresses, MINT_MODULE_OPTIONS.teamPcts);

      await bank.addWhitelisted(minter.address);
      // await bank.addWhitelisted(withdrawal.address);

      await time.increase(10000);
      await erc20.addMinter(bank.address);
      await minter.mint({ from: account_0 });
  });

  it('should be valid pull tokens signature', async () => {
    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 150);
    const {
      signature,
    } = await signData(Object.values(dataToSign), trustedSignerPrivateKey);

    const isValid = await withdrawal.isValidOperation(
      dataToSign.userId,
      dataToSign.beneficiar,
      dataToSign.amount,
      dataToSign.nonce,
      dataToSign.maxTimestamp,
      signature,
    );
    expect(isValid).to.equal(true);
  });

  it('should not be valid pull tokens signature', async () => {
    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 150);
    const {
      signature,
    } = await signData(Object.values(dataToSign), trustedInvalidSignerPrivateKey);

    const isValid = await withdrawal.isValidOperation(
      dataToSign.userId,
      dataToSign.beneficiar,
      dataToSign.amount,
      dataToSign.nonce,
      dataToSign.maxTimestamp,
      signature,
    );
    expect(isValid).to.equal(false);
  });

  it('should allow pull tokens', async () => {
    await bank.addWhitelisted(withdrawal.address);
    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 150);
    const balanceBefore = await erc20.balanceOf(dataToSign.beneficiar);

    const {
      signature,
    } = await signData(Object.values(dataToSign), trustedSignerPrivateKey);
    await withdrawal.pullTokens(
      dataToSign.userId,
      dataToSign.beneficiar,
      dataToSign.amount,
      dataToSign.nonce,
      dataToSign.maxTimestamp,
      signature,
    );
    const balanceAfter = await erc20.balanceOf(dataToSign.beneficiar);

    expect(balanceBefore).to.be.bignumber.equal(new BN(0));
    expect(balanceAfter).to.be.bignumber.equal(new BN(balanceBefore + dataToSign.amount));
  });

  it('should not allow pull tokens when signature is invalid', async () => {
    await bank.addWhitelisted(withdrawal.address);
    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 150);

    const {
      signature,
    } = await signData(Object.values(dataToSign), trustedInvalidSignerPrivateKey);

    await expectRevert(withdrawal.pullTokens(
      dataToSign.userId,
      dataToSign.beneficiar,
      dataToSign.amount,
      dataToSign.nonce,
      dataToSign.maxTimestamp,
      signature,
    ),
      'WithdrawalModule: signature is not valid',
    );
  });

  it('should not allow pull tokens twice', async () => {
    await bank.addWhitelisted(withdrawal.address);
    const currentTime = await time.latest();
    dataToSign.maxTimestamp = new BN(currentTime + 150);

    const {
      signature,
    } = await signData(Object.values(dataToSign), trustedSignerPrivateKey);

    await withdrawal.pullTokens(
      dataToSign.userId,
      dataToSign.beneficiar,
      dataToSign.amount,
      dataToSign.nonce,
      dataToSign.maxTimestamp,
      signature,
    );

    await expectRevert(withdrawal.pullTokens(
      dataToSign.userId,
      dataToSign.beneficiar,
      dataToSign.amount,
      dataToSign.nonce,
      dataToSign.maxTimestamp,
      signature,
    ),
      'WithdrawalModule: tokens were already pulled',
    );
  });
});
