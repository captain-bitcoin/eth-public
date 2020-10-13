const CBBank = artifacts.require("CBBank");
const MintableModule = artifacts.require("MintableModule");

const {
  BANK: BANK_OPTIONS,
} = require("../deploy-params");


module.exports = async function(deployer) {
  deployer.then(async () => {
      const bank = await CBBank.at(CBBank.address);
      await bank.addWhitelisted(MintableModule.address);
      await bank.addWhitelistAdmin(BANK_OPTIONS.adminAddress);
      await bank.renounceWhitelistAdmin();
  });
};
