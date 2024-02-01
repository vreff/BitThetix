import { StacksNetwork } from "@stacks/network";
import { OnChainAsset, OnChainAssets } from "./types";
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
import { UTCTimestamp } from "lightweight-charts";
import { Granularity, SatoshisPerBTC } from "./constants";
import { getKeyFromAsset } from "./util";

// Root user contract asset (owner of BitThetix).
const contractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';


/** STACKS API */

// Get user balance of a given asset.
export async function getAssetBalance(asset: OnChainAsset, address: string, network: StacksNetwork) {
    const contractName = 'bitthetix';
    const functionName = 'get-asset-balance';
    const senderAddress = address;

    const options = {
        contractAddress,
        contractName,
        functionName,
        functionArgs: [uintCV(asset.key)],
        network,
        senderAddress,
    };

    const rawResult = await callReadOnlyFunction(options);
    const result = ((rawResult as ResponseCV).value as UIntCV).value;
    return Number(result) / SatoshisPerBTC;
}

export async function getAssetsAllAtOnce(network: StacksNetwork) {
    const contractName = 'bitthetix';
    const functionName = 'get-supported-feeds';
    const senderAddress = contractAddress;

    const options = {
        contractAddress,
        contractName,
        functionName,
        functionArgs: [],
        network,
        senderAddress,
    };

    const result = await callReadOnlyFunction(options);
    const list = ((result as ResponseCV).value as ListCV).list;
    const newAssets: OnChainAsset[] = list.map((t, i) => {
        const data = (t as TupleCV).data;
        return {
            key: i,
            ticker: (data["ticker"] as StringAsciiCV).data,
            name: (data["name"] as StringAsciiCV).data,
            price: Number((data["current-value"] as UIntCV).value) / SatoshisPerBTC,
            change: 0,
            type: (data["type"] as StringAsciiCV).data,
            impliedVolatility: Number((data["implied-volatility"] as UIntCV).value),
            pythFeedId: (data["pyth-feed-id"] as StringAsciiCV).data
        };
    });

    return newAssets;
}

export async function getAssets(network: StacksNetwork, callback: (assets: OnChainAssets) => void) {
    const contractName = 'bitthetix';
    const functionName = 'get-supported-feeds-ids';
    const senderAddress = contractAddress;

    const options = {
        contractAddress,
        contractName,
        functionName,
        functionArgs: [],
        network,
        senderAddress,
    };

    const result = await callReadOnlyFunction(options);
    const list = ((result as ResponseCV).value as ListCV).list;
    let itemCount = 0;
    const newAssets: OnChainAssets = new Map();
    for (const item of list) {
        (async () => {
            const contractName = 'mock-price-feed';
            const functionName = 'get-feed';

            const options = {
                contractAddress,
                contractName,
                functionName,
                functionArgs: [(item as UIntCV)],
                network,
                senderAddress,
            };
            const result = await callReadOnlyFunction(options);
            const data = ((result as ResponseCV).value as TupleCV).data;
            const asset: OnChainAsset = {
                key: Number((item as UIntCV).value),
                ticker: (data["ticker"] as StringAsciiCV).data,
                name: (data["name"] as StringAsciiCV).data,
                price: Number((data["current-value"] as UIntCV).value) / SatoshisPerBTC,
                change: 0,
                type: (data["type"] as StringAsciiCV).data,
                impliedVolatility: Number((data["implied-volatility"] as UIntCV).value) / SatoshisPerBTC,
                pythFeedId: (data["pyth-feed-id"] as StringAsciiCV).data
            };
            newAssets.set(getKeyFromAsset(asset), asset);
            itemCount++;
            if (itemCount === list.length) {
                callback(newAssets);
            }
        })();
    }
}

// Get a user's sBTC balance.
export async function getSBTCBalance(address: string, network: StacksNetwork) {
    const contractName = 'bitthetix';
    const functionName = 'get-sbtc-balance';
    const senderAddress = address;

    const options = {
        contractAddress,
        contractName,
        functionName,
        functionArgs: [],
        network,
        senderAddress,
    };

    const rawResult = await callReadOnlyFunction(options);
    const result = ((rawResult as ResponseCV).value as UIntCV).value;
    return Number(result) / SatoshisPerBTC;
}


/** PYTH API */

const benchmarkBaseUrl = "https://benchmarks.pyth.network/v1/shims/tradingview/history";

// Fetch benchmark data for a given feed and granularity (1m, 5m, etc..).
export async function getBenchmarkDataForFeed(granularity: Granularity, asset: OnChainAsset) {
    // Symbols are denominated in USD.
    const { ticker, type } = asset;
    const symbol = `${type}.${ticker}/USD`;

    // Create a reasonably large lookback window for good UX.
    // (now - size_of_bars * number_of_bars * seconds_in_a_minute) = start_time
    const now = Math.floor(Date.now() / 1000);
    const resolution = granularity.resolution;
    const barCount = granularity.queryParam === "M" ? 100 : 3000;
    const startTime = now - (resolution * barCount * 60);

    // Fetch data.
    const pythUrl = `${benchmarkBaseUrl}?symbol=${symbol}&resolution=${granularity.queryParam}&from=${startTime}&to=${now}`;
    const res = await fetch(pythUrl)
    if (!res.ok) {
        return [];
    }

    // Normalize and sort benchmark data.
    const rawData = (await res.json() as {
        c: number[],
        o: number[],
        h: number[],
        l: number[],
        t: number[],
    });
    const data = rawData.c.map((c, i) => ({
        time: rawData.t[i] as UTCTimestamp,
        open: rawData.o[i],
        high: rawData.h[i],
        low: rawData.l[i],
        close: c,
    }));


    return data.sort((a, b) => a.time - b.time);
}

export async function getPriceReference24hr(asset: OnChainAsset) {
    // Symbols are denominated in USD.
    const { ticker, type } = asset;
    const symbol = `${type}.${ticker}/USD`;

    // Get data from the last 24 hours.
    // For non-crypto assets, use a wider lookback window (5 days) to account for non-business days.
    const now = Math.floor(Date.now() / 1000);
    const resolution = 240; // 4 hr blocks
    const lookback = asset.type === "Crypto" ? (60 * 60 * 24) : (60 * 60 * 24 * 5);
    const from = now - lookback;

    // Fetch data.
    const pythUrl = `${benchmarkBaseUrl}?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${now}`;
    const res = await fetch(pythUrl);
    if (!res.ok) {
        return 0;
    }

    // Find the first bar that is 24 hours old or less.
    // If none are found, use the most recent bar.
    const rawData = (await res.json() as {
        c: number[],
        o: number[],
        h: number[],
        l: number[],
        t: number[],
    });
    let priceReference24hr = 0;
    for (let i = 0; i < rawData.t.length; i++) {
        priceReference24hr = rawData.o[i];
        if (rawData.t[i] >= now - (60 * 60 * 24)) {
            break;
        }
    }

    return priceReference24hr;
}