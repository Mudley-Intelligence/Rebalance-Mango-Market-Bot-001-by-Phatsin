# Rebalance Mango Market Bot by Phatsin 

Rebalance Mango Market Bot by DuPhatsin for run trading bot in Solana Mango Market Defi.

Thanks to Phatsin https://github.com/Phatsin for sharing. 

File contain JavaScript client library for interacting with Mango Markets DEX v3.

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

