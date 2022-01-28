import * as os from 'os';
import * as fs from 'fs';
import { MangoClient } from './client';
import { Account, Commitment, Connection, PublicKey } from '@solana/web3.js';
import configFile from './ids.json';
import { Config, getMarketByBaseSymbolAndKind, Cluster } from './config';
import { Market } from '@project-serum/serum';
import { MangoCache, sleep } from './index';
import MangoAccount from './MangoAccount';
import RootBank from './RootBank';

const interval = parseInt(process.env.INTERVAL || '10000');
const control = { isRunning: true, interval: interval };
const config = new Config(configFile);
const groupName = process.env.GROUP || 'devnet.2';
const mangoAccountName = process.env.MANGO_ACCOUNT_NAME;

const payer = new Account(
  JSON.parse(
    fs.readFileSync(
      process.env.KEYPAIR || os.homedir() + '/.config/solana/id.json',
      'utf-8',
    ),
  ),
);

const alter = parseFloat(process.env.ALTER || '0');
const fxval = parseFloat(process.env.FIXED_VALUE || '0');
const action = parseFloat(process.env.ACTION || '0');

async function rebalance() {
  // setup client

  const groupConfig = config.getGroupWithName(groupName);
  if (!groupConfig) {
    throw new Error(`Group ${groupName} not found`);
  }
  const cluster = groupConfig.cluster as Cluster;

  const connection = new Connection(
    process.env.ENDPOINT_URL || config.cluster_urls[cluster],
    'processed' as Commitment,
  );
  const client = new MangoClient(connection, groupConfig.mangoProgramId);
  
  const mangoGroup = await client.getMangoGroup(groupConfig.publicKey);

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

  const owner = new Account(
    JSON.parse(
      fs.readFileSync(
        process.env.KEYPAIR || os.homedir() + '/.config/solana/id.json',
        'utf-8',
      ),
    ),
  );

  // load group & market

  const marketName = process.env.MARKET;
  if (!marketName) {
    throw new Error('Please add env variable MARKET');
  }

  const spotMarketConfig = getMarketByBaseSymbolAndKind(
    groupConfig,
    marketName.toUpperCase(),
    'spot',
  );

  const spotMarket = await Market.load(
    connection,
    spotMarketConfig.publicKey,
    undefined,
    groupConfig.serumProgramId,
  );

  process.on('SIGINT', function () {
    console.log('Caught keyboard interrupt.');
    control.isRunning = false;
  });

  while (control.isRunning) {
    try {

      const [mangoCache, mangoAccount]: [
        MangoCache,
        MangoAccount,
      ] = await Promise.all([
        mangoGroup.loadCache(connection),
        client.getMangoAccount(mangoAccountPk, mangoGroup.dexProgramId),
      ]);

      console.log("Market             : " + marketName.toUpperCase() + " SPOT");
      console.log("Minimum order size : " + spotMarket.minOrderSize.toString())

      const fairValue = mangoGroup.getPrice(spotMarketConfig.marketIndex, mangoCache).toNumber();
      
      console.log("Fair value         : " + fairValue)

      const openOrders = await mangoAccount.loadSpotOrdersForMarket(
        connection,
        spotMarket,
        spotMarketConfig.marketIndex,
      );
    
      console.log("Open orders        : " + openOrders.length);

      const net = mangoAccount.getUiDeposit(mangoCache.rootBankCache[spotMarketConfig.marketIndex], mangoGroup, spotMarketConfig.marketIndex);

      const balan =  parseFloat(net.toString());

      console.log("Balance            : " + balan + " " + marketName.toUpperCase());
      
      const balVal = balan * fairValue;

      console.log("Balance value      : " + balVal + " USDC");

      // Fetch orderbooks
      //////////////////////////////////////////////////

      const decimal_ = spotMarket.minOrderSize.toString().split(".")[1].length;

      var much = false;

      if (balVal > (fxval + alter)) {
        console.log("Balance value is greater than " + (fxval + alter) + " USDC");
        much = true;

        const sell_ = ((balVal - fxval) / fairValue);
        const sell__ = parseFloat(sell_.toFixed(decimal_));
        
        let bids = await spotMarket.loadBids(connection);
        const bid = bids.getL2(1)[0][0]
  
        if (action) {
          await client.placeSpotOrder2(
            mangoGroup,
            mangoAccount,
            spotMarket,
            owner,
            'sell',
            bid,
            sell__,
            'limit',
          ); // or 'ioc' or 'postOnly'
          
        } else {
          console.log("Want to sell " + sell__ + " " + marketName.toUpperCase())
        }
      }

      var few = false;

      if (balVal < (fxval - alter)) {
        console.log("Balance value is less than " + (fxval - alter) + " USDC");
        few = true;

        const buy_ = (fxval - balVal) / fairValue;
        const buy__ = parseFloat(buy_.toFixed(decimal_));
        
        let asks = await spotMarket.loadAsks(connection);
        const ask = asks.getL2(1)[0][0];
  
        if (action) {
          await client.placeSpotOrder2(
            mangoGroup,
            mangoAccount,
            spotMarket,
            owner,
            'buy',
            ask,
            buy__,
            'limit',
          ); // or 'ioc' or 'postOnly'
          
        } else {
          console.log("Want to buy " + buy__ + " " + marketName.toUpperCase())
        }
      }

      ///////////////////////////////////////////

      if (alter != 0 && fxval != 0) {

      }else{
        if(!fxval) console.log("Error: FIXED_VALUE");
        if(!alter) console.log("Error: ALTER")
      }

      const sellPrice = (fxval / balan) + (alter / balan);
      const buyPrice = (fxval / balan) - (alter / balan);
      const sellSize = parseFloat((alter / sellPrice).toFixed(decimal_));
      const buySize = parseFloat((alter / buyPrice).toFixed(decimal_));

      if (sellSize == 0 || buySize == 0) {
        console.log("Error: Size error!");
        return
      }

      if (openOrders.length != 0 ) {
        if (openOrders.length != 2 && action && !much && !few) {
          // cancel all, requote

          const rootBanks = await mangoGroup.loadRootBanks(client.connection);

          for (const order of openOrders) {
            await client.cancelSpotOrder(
              mangoGroup,
              mangoAccount,
              owner,
              spotMarket,
              order,
            );
          }
        }
      }

      if (openOrders.length == 0 && action && !much && !few) {
        // Place order

        await client.placeSpotOrder2(
          mangoGroup,
          mangoAccount,
          spotMarket,
          owner,
          'buy',
          buyPrice,
          buySize,
          'limit',
        ); // or 'ioc' or 'postOnly'

        await client.placeSpotOrder2(
          mangoGroup,
          mangoAccount,
          spotMarket,
          owner,
          'sell',
          sellPrice,
          sellSize,
          'limit',
        ); // or 'ioc' or 'postOnly'

      }

    } catch (e) {
      // sleep for some time and retry
      console.log(e);
    } finally {
      console.log(`~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~`);
      await sleep(interval);
    }
  }
}
function startRebalance() {
  if (control.isRunning) {
    rebalance().finally(startRebalance);
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

startRebalance();