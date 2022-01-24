import {
  Cluster,
  Config,
  getPerpMarketByBaseSymbol,
  PerpMarketConfig,
} from './config';
import configFile from './ids.json';
import {
  Account,
  Commitment,
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import fs from 'fs';
import os from 'os';
import { MangoClient } from './client';
import {
  BookSide,
  makeCancelAllPerpOrdersInstruction,
  makePlacePerpOrderInstruction,
  MangoCache,
  ONE_BN,
  sleep,
} from './index';
import { BN } from 'bn.js';
import MangoAccount from './MangoAccount';
import MangoGroup from './MangoGroup';
import PerpMarket from './PerpMarket';

const interval = parseInt(process.env.INTERVAL || '10000');
const control = { isRunning: true, interval: interval };

async function rb() {
  // load mango group and clients
  const config = new Config(configFile);
  const groupName = process.env.GROUP || 'devnet.2';
  const mangoAccountName = process.env.MANGO_ACCOUNT_NAME;

  const groupIds = config.getGroupWithName(groupName);
  if (!groupIds) {
    throw new Error(`Group ${groupName} not found`);
  }
  const cluster = groupIds.cluster as Cluster;
  const mangoProgramId = groupIds.mangoProgramId;
  const mangoGroupKey = groupIds.publicKey;

  const payer = new Account(
    JSON.parse(
      fs.readFileSync(
        process.env.KEYPAIR || os.homedir() + '/.config/solana/id.json',
        'utf-8',
      ),
    ),
  );
  console.log(`Payer: ${payer.publicKey.toBase58()}`);

  const connection = new Connection(
    process.env.ENDPOINT_URL || config.cluster_urls[cluster],
    'processed' as Commitment,
  );
  const client = new MangoClient(connection, mangoProgramId);

  const mangoGroup = await client.getMangoGroup(mangoGroupKey);

  const ownerAccounts = await client.getMangoAccountsForOwner(
    mangoGroup,
    payer.publicKey,
    true,
  );

  let mangoAccountPk;
  if (mangoAccountName) {
    for (const ownerAccount of ownerAccounts) {
      if (mangoAccountName === ownerAccount.name) {
        mangoAccountPk = ownerAccount.publicKey;
        break;
      }
    }
    if (!mangoAccountPk) {
      throw new Error('MANGO_ACCOUNT_NAME not found');
    }
  } else {
    const mangoAccountPkStr = process.env.MANGO_ACCOUNT_PUBKEY;
    if (!mangoAccountPkStr) {
      throw new Error(
        'Please add env variable MANGO_ACCOUNT_PUBKEY or MANGO_ACCOUNT_NAME',
      );
    } else {
      mangoAccountPk = new PublicKey(mangoAccountPkStr);
    }
  }

  // TODO make it be able to quote all markets
  const marketName = process.env.MARKET;
  if (!marketName) {
    throw new Error('Please add env variable MARKET');
  }

  const perpMarketConfig = getPerpMarketByBaseSymbol(
    groupIds,
    marketName.toUpperCase(),
  ) as PerpMarketConfig;
  const marketIndex = perpMarketConfig.marketIndex;
  const perpMarket = await client.getPerpMarket(
    perpMarketConfig.publicKey,
    perpMarketConfig.baseDecimals,
    perpMarketConfig.quoteDecimals,
  );

  const alter = parseFloat(process.env.ALTER || '0');
  const fxval = parseFloat(process.env.FIXED_VALUE || '0');
  const action = parseFloat(process.env.ACTION || '0');

  process.on('SIGINT', function () {
    console.log('Caught keyboard interrupt. Canceling orders');
    control.isRunning = false;
    onExit(
      client,
      payer,
      mangoProgramId,
      mangoGroup,
      perpMarket,
      mangoAccountPk,
    );
  });

  while (control.isRunning) {
    try {
      // get fresh data
      // get orderbooks, get perp markets, caches
      // TODO load pyth oracle itself for most accurate prices
      const [bids, asks, mangoCache, mangoAccount]: [
        BookSide,
        BookSide,
        MangoCache,
        MangoAccount,
      ] = await Promise.all([
        perpMarket.loadBids(connection),
        perpMarket.loadAsks(connection),
        mangoGroup.loadCache(connection),
        client.getMangoAccount(mangoAccountPk, mangoGroup.dexProgramId),
      ]);

      // TODO store the prices in an array to calculate volatility

      // Model logic
      const fairValue = mangoGroup.getPrice(marketIndex, mangoCache).toNumber();

      // TODO volatility adjustment

      // TODO use order book to requote if size has changed
      const openOrders = mangoAccount
        .getPerpOpenOrders()
        .filter((o) => o.marketIndex === marketIndex);

      console.log("Open orders : " + openOrders.length + ", Market : " + marketName + "-PERP")


      const perpSize = mangoAccount
        .getPerpPositionUi(marketIndex, perpMarket)

      console.log("Perp size   : " + perpSize)

      const perpVal = perpSize * fairValue;
      console.log("Perp value  : " + perpVal)
      console.log("Fair value  : " + fairValue)
//console.log(equity)
//console.log(openOrders.length)
//console.log(getSpotVal)
      
      var much = false;

      const decimal_ = perpMarket.minOrderSize.toString().split(".")[1].length;

      if (perpVal > (fxval + alter)) {
        console.log("Error: Perp value is too much!");
        much = true;

        const sell_ = ((perpVal - fxval) / fairValue);
        const sell__ = parseFloat(sell_.toFixed(decimal_));
        
        const bid = bids.getL2(1)[0][0];

        if (action) {
          await client.placePerpOrder(
            mangoGroup,
            mangoAccount,
            mangoGroup.mangoCache,
            perpMarket,
            payer,
            'buy', // or 'sell'
            bid,
            sell__,
            'limit',
          ); // or 'ioc' or 'postOnly'          
        } else {
          console.log("Want to sell " + sell__ + " " + marketName)
        }
      }

      var few = false;

      if (perpVal < (fxval - alter)) {
        console.log("Error: Perp value is too few!");
        few = true;

        const buy_ = (fxval - perpVal) / fairValue;
        const buy__ = parseFloat(buy_.toFixed(decimal_));
        
        const ask = asks.getL2(1)[0][0];

        if (action) {
          await client.placePerpOrder(
            mangoGroup,
            mangoAccount,
            mangoGroup.mangoCache,
            perpMarket,
            payer,
            'buy', // or 'sell'
            ask,
            buy__,
            'limit',
          ); // or 'ioc' or 'postOnly'

        } else {
          console.log("Want to buy " + buy__ + " " + marketName)
        }

      }

        if (alter != 0 && fxval != 0) {

        }else{
          if(!fxval) console.log("Error: FIXED_VALUE");
          if(!alter) console.log("Error: ALTER")
        }

        const sellPrice = (fxval / perpSize) + (alter / perpSize);
        const buyPrice = (fxval / perpSize) - (alter / perpSize);
        const sellSize = parseFloat((alter / sellPrice).toFixed(decimal_));
        const buySize = parseFloat((alter / buyPrice).toFixed(decimal_));
  
        if (sellSize == 0 || buySize == 0) {
          console.log("Error: Size error!");
          return
        }
//console.log(bidPrice);
//console.log(askPrice);
//console.log(bidSize);
//console.log(askSize);

        // Start building the transaction
        const tx = new Transaction();
        if (openOrders.length != 0 ) {
          if (openOrders.length != 2 && action && !much && !few) {
            // cancel all, requote
            console.log("test");
            const cancelAllInstr = makeCancelAllPerpOrdersInstruction(
              mangoProgramId,
              mangoGroup.publicKey,
              mangoAccount.publicKey,
              payer.publicKey,
              perpMarket.publicKey,
              perpMarket.bids,
              perpMarket.asks,
              new BN(20),
            );

            tx.add(cancelAllInstr);

          }

          if (tx.instructions.length > 0) {
            const txid = await client.sendTransaction(tx, payer, []);
          }          
        }

        if (openOrders.length == 0 && action && !much && !few) {
          // Place order

          await client.placePerpOrder(
            mangoGroup,
            mangoAccount,
            mangoGroup.mangoCache,
            perpMarket,
            payer,
            'buy', // or 'sell'
            buyPrice,
            buySize,
            'limit',
          ); // or 'ioc' or 'postOnly'

          await client.placePerpOrder(
            mangoGroup,
            mangoAccount,
            mangoGroup.mangoCache,
            perpMarket,
            payer,
            'sell', // or 'sell'
            sellPrice,
            sellSize,
            'limit',
          ); // or 'ioc' or 'postOnly'          
        }

    } catch (e) {
      // sleep for some time and retry
      console.log(e);
    } finally {
      console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
      await sleep(interval);
    }
  }
}

async function onExit(
  client: MangoClient,
  payer: Account,
  mangoProgramId: PublicKey,
  mangoGroup: MangoGroup,
  perpMarket: PerpMarket,
  mangoAccountPk: PublicKey,
) {
  await sleep(control.interval);
  const mangoAccount = await client.getMangoAccount(
    mangoAccountPk,
    mangoGroup.dexProgramId,
  );

  const cancelAllInstr = makeCancelAllPerpOrdersInstruction(
    mangoProgramId,
    mangoGroup.publicKey,
    mangoAccount.publicKey,
    payer.publicKey,
    perpMarket.publicKey,
    perpMarket.bids,
    perpMarket.asks,
    new BN(20),
  );
  const tx = new Transaction();
  tx.add(cancelAllInstr);

  const txid = await client.sendTransaction(tx, payer, []);
  console.log(`cancel successful: ${txid.toString()}`);

  process.exit();
}

function startMarketMaker() {
  if (control.isRunning) {
    rb().finally(startMarketMaker);
  }
}

process.on('unhandledRejection', function (err, promise) {
  console.error(
    'Unhandled rejection (promise: ',
    promise,
    ', reason: ',
    err,
    ').',
  );
});

startMarketMaker();
