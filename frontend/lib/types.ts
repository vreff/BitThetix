export type Balances = { [key: string]: number };

export type OnChainAsset = {
  price: number,
  name: string,
  ticker: string,
  key: number,
  change: number,
  type: string,
  impliedVolatility: number,
  pythFeedId: string,
}

export type OnChainAssets = Map<string, OnChainAsset>;

export type OffChainAsset = {
  type: string,
  ticker: string,
  price: number,
  previousPrice: number,
  lastUpdateTimestamp: number,
  priceReference24hr: number,
}

export type Order = {
  status: string,
  assetKey: string,
  amountSBTC: number,
  txId: string,
  blockNumber?: number,
  timestamp: number,
  amountAsset: number,
}

export type Orders = Map<string, Order>;

