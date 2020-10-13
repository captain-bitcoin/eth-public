const CBBank = artifacts.require("CBBank");
const WithdrawalModule = artifacts.require("WithdrawalModule");

const {
  WITHDRAWAL_MODULE: WITHDRAWAL_MODULE_OPTIONS,
} = require("../deploy-params");


module.exports = async function(deployer) {
  deployer.then(async () => {
      await deployer.deploy(WithdrawalModule, CBBank.address, WITHDRAWAL_MODULE_OPTIONS.trustedAddress);
      const bank = await CBBank.at(CBBank.address);
      await bank.addWhitelisted(WithdrawalModule.address);
  });
};
