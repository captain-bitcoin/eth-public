const CBERC20Token = artifacts.require("CBERC20Token");
const CBBank = artifacts.require("CBBank");
const MintableModule = artifacts.require("MintableModule");

const {
  ERC20: ERC20_OPTIONS,
  MINT_MODULE: MINT_MODULE_OPTIONS
} = require("../deploy-params");


module.exports = function(deployer) {
  deployer.then(async () => {
      await deployer.deploy(CBERC20Token, ERC20_OPTIONS.initialBeneficiar);
      await deployer.deploy(CBBank, CBERC20Token.address);
      await deployer.deploy(MintableModule, CBBank.address, MINT_MODULE_OPTIONS.teamAddresses, MINT_MODULE_OPTIONS.teamPcts);
  });
};
