import { AuthOptions } from "@stacks/connect";
import { StacksMocknet } from "@stacks/network";
import { SponsorOptionsOpts, StacksTransaction, TransactionVersion, broadcastTransaction, getAddressFromPrivateKey, sponsorTransaction } from "@stacks/transactions";
import { OffChainAsset, OnChainAsset } from "./types";

export const SatoshisPerBTC = 100_000_000;

export const PrimaryColor = '#ffb800';
export const GreenColor = "rgb(127, 212, 130)";
export const RedColor = "rgb(242, 84, 84)";

export const EmptyOnChainAsset: OnChainAsset = {
    type: '',
    ticker: '',
    pythFeedId: '',
    price: 0,
    name: '',
    key: 0,
    impliedVolatility: 0,
    change: 0,
}

export const EmptyOffChainAsset: OffChainAsset = {
    type: '',
    ticker: '',
    price: 0,
    priceReference24hr: 0,
    previousPrice: 0,
    lastUpdateTimestamp: 0,
}

export type Granularity = {
    name: string,
    resolution: number,
    queryParam: string,
}
export const Granularities: Granularity[] = [
    {
        name: '1m',
        resolution: 1,
        queryParam: '1'
    },
    {
        name: '2m',
        resolution: 2,
        queryParam: '2'
    }, {
        name: '5m',
        resolution: 5,
        queryParam: '5'
    }, {
        name: '15m',
        resolution: 15,
        queryParam: '15'
    }, {
        name: '30m',
        resolution: 30,
        queryParam: '30'
    }, {
        name: '1h',
        resolution: 60,
        queryParam: '60'
    }, {
        name: '2h',
        resolution: 120,
        queryParam: '120'
    }, {
        name: '4h',
        resolution: 240,
        queryParam: '240'
    }, {
        name: '6h',
        resolution: 360,
        queryParam: '360'
    }, {
        name: '12h',
        resolution: 720,
        queryParam: '720'
    }, {
        name: '1d',
        resolution: 1440,
        queryParam: 'D'
    }, {
        name: '1w',
        resolution: 10080,
        queryParam: 'W'
    }, {
        name: '1m',
        resolution: 302400,
        queryParam: 'M'
    },
];


export const appDetails: AuthOptions["appDetails"] = {
    name: "Beanstalk Exchange",
    icon: "https://freesvg.org/img/youk-k-Beanstalk.png",
}

export const stubbedSponsorFillTx = async (tx: StacksTransaction, sender: string): Promise<string> => {

    const key = '753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601';
    const address = getAddressFromPrivateKey(key, TransactionVersion.Testnet);
    const network = new StacksMocknet();

    const nonceInfo = await fetch(`${network.coreApiUrl}/extended/v1/address/${address}/nonces`);
    const data = await nonceInfo.json();
    let nonce = data.possible_next_nonce;

    const sponsorOptions: SponsorOptionsOpts = {
        transaction: tx,
        sponsorPrivateKey: key,
        fee: 1000000,
        sponsorNonce: nonce,
    };

    let transaction = await sponsorTransaction(sponsorOptions);
    let broadcastResponse = await broadcastTransaction(transaction, network);
    let txId = broadcastResponse.txid;

    return txId;
}

export const mintingSBTCToastMessage = `Minting 1 sBTC...`;