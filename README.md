# Deploy Manual
## ERC20
- Deploy ERC20 token
- Add Bank token as minter
- Add new minter from CapitanBitcoin Side
- Remove deployer account from minters


# Generate Hex for custom transction Manual
- add `.env` file in the root directory (see `sample.env` sample) and fill right `ETH_PROVIDER_URL` value from infura
- open `scripts/simple-generator/index.js` file
- set right network (line 42)
- set right contract (line 43)
- set right method (line 44)
- set right params (line 45)
- open root dir in the terminal
- run `npm i`
- run `npm run hex`
- done, you will see `generatedHexData:` data
