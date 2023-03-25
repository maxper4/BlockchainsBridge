# Token Bridge

The Token Bridge is an interoperability protocol which enables ERC20 tokens to be moved between 2 different chains (EVM) for example Ethereum and Binance Smart Chain. There are 2 components to the Token Bridge, the Bridge UI and the Bridge Contracts. The Bridge UI is a web application which allows users to move tokens between chains. It is located under the /bridge-front folder. The Bridge Contracts are a set of smart contracts which are deployed on both chains and are used to move tokens between chains.

## Bot
The bridge bot is a service which is used to account transactions on the different chains. It is located in the script /scripts/BridgeBot.js.

## Deployed Tests Contracts
### Goerli
Token: [0x7C80C62f28E2b0801F7887a062A63501733e008f](https://goerli.etherscan.io/address/0x7C80C62f28E2b0801F7887a062A63501733e008f)

Bridge: [0xddcf3F0019bE5718b82E85E015Db4e2998A7bdeC](https://goerli.etherscan.io/address/0xddcf3F0019bE5718b82E85E015Db4e2998A7bdeC)

### Binance Smart Chain (Testnet)
Token: [0xC3035bFbE953e7DEF29dFc8b0687521efF5bf02E](https://testnet.bscscan.com/address/0xC3035bFbE953e7DEF29dFc8b0687521efF5bf02E)

Bridge: [0x0ac255c21FbB81b559B0B66727bBef643A15b87B](https://testnet.bscscan.com/address/0x0ac255c21FbB81b559B0B66727bBef643A15b87B)