const CBBank = artifacts.require("CBBank");
const CBERC20Token = artifacts.require("CBERC20Token");
const {
  BANK: BANK_OPTIONS,
} = require("../deploy-params");


module.exports = async function(deployer) {
  deployer.then(async () => {   
      const erc20 = await CBERC20Token.at(CBERC20Token.address);
      await erc20.addMinter(CBBank.address);
      await erc20.addMinter(BANK_OPTIONS.adminAddress);
      await erc20.renounceMinter();
  });
};
