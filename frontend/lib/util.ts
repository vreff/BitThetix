import { OnChainAsset } from "./types";

export function getKeyFromAsset(asset: OnChainAsset) {
    return `${asset.key}`;
}

export function get24hrChange(reference: number, currentPrice: number) {
    return (currentPrice - reference) / reference;
}