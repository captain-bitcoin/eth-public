const Web3 = require('web3');
const { soliditySha3 } = Web3.utils;
const fixSignature = require('./helpers/fixSignature');


const signData = async (data, privateKey) => {
  const solSha3Data = soliditySha3(...data);
  const { message, messageHash, signature } = await web3.eth.accounts.sign(solSha3Data, privateKey);

  return {
      data: message,
      dataHash: messageHash,
      signature: fixSignature(signature),
  };
}

module.exports = {
  signData,
};
