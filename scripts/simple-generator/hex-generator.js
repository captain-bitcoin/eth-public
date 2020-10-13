const Web3 = require('web3');

const ETH_PROVIDER_URL = process.env.ETH_PROVIDER_URL;

const web3 = new Web3(ETH_PROVIDER_URL);

module.exports = (abi, address, method, params = []) => {
  const contract = new web3.eth.Contract(abi, address);
  return contract.methods[method](...params).encodeABI();
};
