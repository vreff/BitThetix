'use client';

import {
  callReadOnlyFunction,
  principalCV,
  UIntCV,
  ResponseCV,
  ListCV,
  TupleCV,
  StringAsciiCV,
  uintCV,
} from '@stacks/transactions';
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { useStacks } from "./StacksProvider";
import _ from "lodash";
import { UTCTimestamp } from "lightweight-charts";
import { Granularities, Granularity } from "@/lib/constants";
import { PriceServiceConnection } from "@pythnetwork/price-service-client";

import { getKeyFromAsset } from "@/lib/util";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useParams } from 'next/navigation'
import { useTransactionToasts } from "./TransactionAndOrderProvider";
import { getAssetBalance, getAssets, getBenchmarkDataForFeed, getPriceReference24hr, getSBTCBalance } from '@/lib/API';
import { Balances, OffChainAsset, OnChainAsset, OnChainAssets } from '@/lib/types';

type Candle = {
  time: UTCTimestamp,
  open: number,
  high: number,
  low: number,
  close: number,
}

interface BitThetixStateContextValue {
  assets: OnChainAssets,
  offChainAssets: { [key: string]: OffChainAsset },
  sBTCBalance: number,
  priceHistoryMapping: { [key: string]: Candle[] },
  selectedGranularity: Granularity,
  updateGranularity: (granularity: Granularity, ticker: string) => void,
  chartLoading: boolean,
  balances: Balances,
  totalBalance: number,
}

const offChainUpdateMapping: { [key: string]: number } = {};
const connection = new PriceServiceConnection("https://hermes.pyth.network", {});

const BitThetixStateContext = createContext<BitThetixStateContextValue | undefined>(undefined);
export default function BitThetixStateProvider({ children }: PropsWithChildren<{}>) {
  // Fetch Stacks info.
  const { address, network } = useStacks();

  // Fetch ticker from path, if one exists.
  const params = useParams();
  const ticker = (params["ticker"] || "") as string;

  // Fetch active transactions.
  const { transactionIds, pendingOrders, completedOrders } = useTransactionToasts();

  // BitThetix state.
  const [assets, setAssets] = useState<OnChainAssets>(new Map());
  const [offChainAssets, setOffChainAssets] = useState<{ [key: string]: OffChainAsset }>({});
  const [balances, setBalances] = useState<Balances>({});
  const [totalBalance, setTotalBalance] = useState(0);
  const [priceHistoryMapping, setPriceHistoryMapping] = useState<{ [key: string]: Candle[] }>({});
  const [sBTCBalance, setsBTCBalance] = useState<number>(0);
  const [granularity, setGranularity] = useState<Granularity>(Granularities[3]);
  const [chartLoading, setChartLoading] = useState<boolean>(true);

  // Fetch on-chain assets upon page load.
  useEffect(() => {
    if (!network) return;
    getAssets(network, (newAssets) => {
      setAssets(newAssets);
    });
  }, [network]);

  // Fetch total portfolio balance.
  useEffect(() => {
    if (_.isEmpty(balances) || !assets.size) return;
    const btcAsset = Array.from(assets.values()).find(a => a.ticker === "BTC");
    const btcPrice = btcAsset?.price || 0;
    const totalBalance = Object.keys(balances).reduce((sum, currentValue) => {
      const asset = assets.get(currentValue);
      return sum + balances[currentValue] * (asset?.price || 0) / btcPrice;
    }, 0) + sBTCBalance;
    setTotalBalance(totalBalance);
  }, [balances, sBTCBalance, assets]);

  // Fetch sBTC balance on connected address changes and transactions.
  useEffect(() => {
    if (!address || !network) return;
    (async () => {
      const result = await getSBTCBalance(address, network);
      setsBTCBalance(result);
    })();
  }, [address, transactionIds, network, completedOrders]);

  // Fetch asset balances at page load.
  useEffect(() => {
    if (!address || !network) return;
    assets.forEach(asset => {
      (async () => {
        const balance = await getAssetBalance(asset, address, network);
        setBalances((prevBalances) => ({ ...prevBalances, [getKeyFromAsset(asset)]: balance }));
      })();
    });
  }, [assets, address, network, completedOrders]);

  // Fetch asset balance when on an asset trading page and when transactions are actioned.
  useEffect(() => {
    const asset = Array.from(assets.values()).find(a => a.ticker === ticker);
    if (!asset || !address || !network) return;
    (async () => {
      const balance = await getAssetBalance(asset, address, network);
      setBalances((prevBalances) => ({ ...prevBalances, [getKeyFromAsset(asset)]: balance }));
    })();
  }, [ticker, address, network, assets, transactionIds, pendingOrders]);

  // Fetch historical asset data upon ticker (BTC, ETH, etc..) and granularity changes (1m, 5m, 15m, etc..).
  useEffect(() => {
    const asset = Array.from(assets.values()).find(a => a.ticker === ticker);
    if (!granularity || !asset) return;
    (async () => {
      const data = await getBenchmarkDataForFeed(granularity, asset);
      setPriceHistoryMapping(priceHistoryMapping => ({
        ...priceHistoryMapping,
        [ticker]: data,
      }));
      setChartLoading(false);
    })();
  }, [granularity, assets, ticker]);

  // Fetch realtime asset data upon asset changes and upon granularity changes (15m, 1hr, etc..).
  useEffect(() => {
    if (!assets.size) return;

    connection.subscribePriceFeedUpdates(Array.from(assets.values()).map(a => a.pythFeedId), (priceFeed) => {
      const asset = Array.from(assets.values()).find(a => a.pythFeedId === priceFeed.id);
      if (!asset) return;

      const priceInfo = priceFeed.getPriceNoOlderThan(3600 * 24 * 5);
      if (!priceInfo) return;

      // Throttle price updates on the frontend for performance,
      // unless the user is on an asset's trading page.
      const cadence = (asset.ticker !== ticker) ? 0 : Math.random() * 5;
      const updatedTooRecently = (offChainUpdateMapping[getKeyFromAsset(asset)] || 0) > (priceInfo.publishTime - cadence);

      const price = priceInfo.getPriceAsNumberUnchecked();
      if (!price || updatedTooRecently) return;

      offChainUpdateMapping[getKeyFromAsset(asset)] = Number(priceInfo.publishTime);
      setOffChainAssets(prevAssets => ({
        ...prevAssets,
        [getKeyFromAsset(asset)]: {
          price: price,
          previousPrice: prevAssets[getKeyFromAsset(asset)]?.price || 0,
          ticker: asset.ticker,
          type: asset.type,
          lastUpdateTimestamp: priceInfo.publishTime,
          priceReference24hr: prevAssets[getKeyFromAsset(asset)]?.priceReference24hr || 0,
        }
      }));

      setPriceHistoryMapping(priceHistoryMapping => {
        if (!priceHistoryMapping[asset.ticker]) {
          return priceHistoryMapping;
        }

        const now = (Date.now() / 1000);
        const currentData = [...priceHistoryMapping[asset.ticker]];
        const candleSizeSeconds = (granularity.resolution * 60);
        const mostRecentCandle = currentData[currentData.length - 1];

        if (now - mostRecentCandle.time > candleSizeSeconds) {
          return ({
            ...priceHistoryMapping,
            [asset.ticker]: [...priceHistoryMapping[asset.ticker], {
              time: priceInfo.publishTime as UTCTimestamp,
              open: price,
              high: price,
              low: price,
              close: price
            }],
          });
        } else {
          currentData[currentData.length - 1] = {
            close: price,
            low: Math.min(mostRecentCandle.low, price),
            high: Math.max(mostRecentCandle.high, price),
            time: mostRecentCandle.time,
            open: mostRecentCandle.open,
          };
          return ({
            ...priceHistoryMapping,
            [asset.ticker]: currentData,
          });
        }
      }
      );
    });

    return () => { connection.closeWebSocket(); }
  }, [assets, granularity]);

  // Fetch off-chain benchmark data once for each asset to calculate ~24-hour-change in realtime. 
  useEffect(() => {
    assets.forEach(asset => {
      (async () => {
        const price = await getPriceReference24hr(asset);
        const key = getKeyFromAsset(asset);
        setOffChainAssets(prevAssets => ({
          ...prevAssets,
          [key]: {
            priceReference24hr: price,
            ticker: asset.ticker,
            type: asset.type,
            price: prevAssets[key]?.price || 0,
            previousPrice: prevAssets[key]?.previousPrice || 0,
            lastUpdateTimestamp: prevAssets[key]?.lastUpdateTimestamp || 0,
          }
        }));
      })();
    });
  }, [assets]);

  const updateGranularity = async (granularity: Granularity, ticker: string) => {
    setGranularity(granularity);
    setChartLoading(true);
  }

  const value: BitThetixStateContextValue = {
    assets,
    offChainAssets,
    sBTCBalance,
    priceHistoryMapping,
    selectedGranularity: granularity,
    updateGranularity,
    chartLoading,
    balances,
    totalBalance,
  };

  return (
    <BitThetixStateContext.Provider value={value}>
      {children}
    </BitThetixStateContext.Provider>
  )
}

export function useBitThetixState() {
  const context = useContext(BitThetixStateContext);
  if (context === undefined) {
    throw new Error('useTransactionToasts must be used within a TransactionToastProvider');
  }
  return context;
}