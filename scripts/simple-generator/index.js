const hexGenerator = require('./hex-generator');
const erc20MintableContract = require('../../build/contracts/ERC20Mintable.json')
const CBBankContract = require('../../build/contracts/CBBank.json')

if (!erc20MintableContract) {
  throw new Error(`There is no such compiled contract: erc20MintableContract`);
}

if (!CBBankContract) {
  throw new Error(`There is no such compiled contract: CBBankContract`);
}

/** CONFIG */

const NETWORKS = {
  RINKEBY: 'RINKEBY',
  MAINNET: 'MAINNET',
};

const CONTRACTS = {
  ERC20: {
    name: 'ERC20',
    abi: erc20MintableContract.abi,
    address: {
      RINKEBY: '0x8E09b8C63b9560778D1B57a66a80D024C6Bf1e0f',
      MAINNET: '',
    }
  },
  BANK: {
    name: 'BANK',
    abi: CBBankContract.abi,
    address: {
      RINKEBY: '0x0be1D58934120Ed3fB6eD7Dcb0Da89A550b63297',
      MAINNET: '',
    }
  },
};


/** FILL DESIRED PARAMS !!!! ONLY NEXT SECTION CAN BE MODIFIED !!!! */

const network = NETWORKS.RINKEBY;
const contract = CONTRACTS.BANK;
const method = 'addWhitelisted';
const params = ['0x84f1ba6f587d629995e8bade1ae91863e3be10d7'];

/** NOTHING SHOUD BE CHANGED BELLOW */

const contractAddress = contract.address[network];
const abi = contract.abi;

console.table([
  {
    network: network,
    contract: contract.name,
    method: method,
    params: JSON.stringify(params),
  }
]);

if (!NETWORKS[network]) {
  throw new Error(`Pls, select right network, possible networks: ${JSON.stringify(NETWORKS)}`);
}

if (!contractAddress || contractAddress === '') {
  throw new Error(`Pls, provide right contract address in CONFIG section
   for contract ${contract.name} and network: ${network}, current address is: ${contractAddress}`);
}

if (!method) {
  throw new Error(`Pls, select right method, current value: ${JSON.stringify(method)}`);
}

const hex = hexGenerator(abi, contractAddress, method, params);

console.dir({
  generatedHexData: hex,
})