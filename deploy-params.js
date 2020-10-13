// RINKEBY

const ERC20 = {
  initialBeneficiar: '0x6c510D51C9Db214B6525a6B1D10D9108451457a0',
};

const BANK = {
  adminAddress: '0xB3443C809a105F78a73F92DddBf42e6f70d7f70E',
};

const MINT_MODULE = {
  teamAddresses: [
    '0x23be3e0c99377403458E638C7dadC1f7b9F1A9d3',
  ],
  teamPcts: [
    100,
  ]
};

const WITHDRAWAL_MODULE = {
  trustedAddress: '0x81DFec22e6131161f6189C9E05c250c887f02804',
};

// PRODUCTION

// const ERC20 = {
//   initialBeneficiar: '0xe9d71E6df895C19BD63cc041f1e8b4Bd9479340D',
// };

// const BANK = {
//   adminAddress: '0x1FC877b0E479486D152FcC5Bf6DEbF268c0C102C',
// };

// const MINT_MODULE = {
//   teamAddresses: [
//     '0x23be3e0c99377403458E638C7dadC1f7b9F1A9d3', // HARSH
//     '0xbD718db4569c925701016b2Cac3797C4cf531AC5', // NICK
//     '0xaF1951A32b84a72B66aeA47FDe07D7Cc26186431', // ZOE
//     '0xD3BB93C85e490e3b58ED013c3C27E82ee0911153', // TEAM MULTISIG
//     '0x40C316D95A363DEB0065D4AA220596514B5F2fE1', // YUVI
//   ],
//   teamPcts: [
//     32, // HARSH
//     16, // NICK
//     16, // ZOE
//     33, // TEAM MULTISIG
//     3 // YUVI
//   ]
// };

module.exports = {
  ERC20,
  MINT_MODULE,
  BANK,
  WITHDRAWAL_MODULE,
};
