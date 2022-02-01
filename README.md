# Rebalance Mango Market Bot by Phatsin 

Rebalance Mango Market Bot by MR.Phatsin for run trading bot in Solana Mango Market Defi.

Thanks to MR.Phatsin https://github.com/Phatsin for sharing. 

Please read Medium blog from MR.Phatsin for more information.
[Medium Blog](https://medium.com/@phatsinloedkhanitkon/%E0%B8%A7%E0%B8%B4%E0%B8%98%E0%B8%B5%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%83%E0%B8%8A%E0%B9%89%E0%B8%87%E0%B8%B2%E0%B8%99-bot-rebalance-%E0%B9%80%E0%B8%8A%E0%B8%B7%E0%B9%88%E0%B8%AD%E0%B8%A1%E0%B8%95%E0%B9%88%E0%B8%AD%E0%B8%81%E0%B8%B1%E0%B8%9A-mango-markets-%E0%B8%94%E0%B9%89%E0%B8%A7%E0%B8%A2-mango-client-v3-d72ba68d8014)



This file contain JavaScript client library for interacting with Mango Markets DEX v3.

[API Documentation](https://blockworks-foundation.github.io/mango-client-v3/)


## Requirement to Run the Rebalance Mango Market Bot
### Setup
To run the market maker you will need:
* A Solana account with some SOL deposited to cover transaction fees
* A Mango Account with some collateral deposited and a name (tip: use the UI)
* Your wallet keypair saved as a JSON file
* `node` and `yarn`
* A clone of this repository

### Environment Variables
| Variable | Default | Description |
| -------- | ------- | ----------- |
| `KEYPAIR` | `${HOME}/.config/solana/id.json` | The location of your wallet keypair |
| `GROUP` | `mainnet.1` | Name of the group in ids.json |
| `INTERVAL` | `10000` | Milliseconds to wait before checking for sick accounts |
| `MANGO_ACCOUNT_NAME` | N/A | The MangoAccount name you input when initializing the MangoAccount via UI |
| `MARKET` | N/A | Market base symbol e.g. BTC, SOL, SRM |
| `FIXED_VALUE` | `100` | How much the USDC value will be retained by buy/sell. Exaample 100 USDC
| `ALTER` | `5` | Set the order when value +- from the fixed value. 

## Rebalance Example from Phatsin (linux ver.)
```shell
git clone https://github.com/Phatsin/mango-client-v3.git
cd mango-client-v3
yarn install
```
### run bot (linux ver.)
```
KEYPAIR=~/.config/solana/id.json GROUP=mainnet.1 MANGO_ACCOUNT_NAME=Phatsin.lk MARKET=SOL INTERVAL=5000 FIXED_VALUE=8 ALTER=5 ACTION=1 yarn rebalance
```

## Rebalance Example from Mudley Intelligence (window ver.)
### Bot Installation (window ver.)
```
git clone 
cd mango-client-v3
Go to file name package.json
In scripts section change "clean": "rm -rf lib", to  "clean": "del /s lib",  
yarn install
```

### run bot (window ver.)
```
set KEYPAIR=~/.config/solana/id.json && set GROUP=mainnet.1 && set MANGO_ACCOUNT_NAME=YOUR_NAME && set MARKET=SOL INTERVAL=5000 && set FIXED_VALUE=8 && set ALTER=5 && set ACTION=1 && yarn rebalance
```

