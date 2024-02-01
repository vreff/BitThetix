import { useParams } from 'next/navigation'

import { Typography, Row, Button, Col, Layout, Form, InputNumber, Tooltip } from 'antd';
import _ from 'lodash';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { useBitThetixState } from '@/providers/BitThetixStateProvider';
import React from 'react';
import { EmptyOnChainAsset, appDetails } from '@/lib/constants';
import { getKeyFromAsset } from '@/lib/util';
import { ContractCallOptions, openContractCall } from '@stacks/connect';
import { useStacks } from '@/providers/StacksProvider';
import { useTransactionToasts } from '@/providers/TransactionAndOrderProvider';
import { FungibleConditionCode, createAssetInfo, makeContractFungiblePostCondition, makeStandardFungiblePostCondition, uintCV } from '@stacks/transactions';

const { Text } = Typography;
const { Content } = Layout;

export default function Order({ type }: { type: string }) {
    const [form] = Form.useForm();

    const shouldBuy = type === "buy";

    const { network, address = "" } = useStacks();
    const { addOrderToast } = useTransactionToasts();

    const params = useParams();
    const ticker = (params["ticker"] || "") as string;

    const {
        assets,
        sBTCBalance,
        balances,
    } = useBitThetixState();

    // Calculate 24hr change, if data available.
    const onChainAsset = Array.from(assets.values()).find(a => a.ticker === params.ticker) || EmptyOnChainAsset;

    const btcPrice = (Array.from(assets.values()).find(a => a.ticker === "BTC")?.price || 0);
    const assetPrice = onChainAsset.price;

    const num = form.getFieldValue("Amount") || 0;
    const assetAmount = (num / assetPrice);
    const btcToBuy = (num / btcPrice);

    const isBTC = ticker === "BTC";

    const buyAsset = async () => {
        const tokenPostCondition = makeStandardFungiblePostCondition(
            address,
            FungibleConditionCode.GreaterEqual,
            0,
            createAssetInfo("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", 'sbtc', 'sbtc')
        );

        const options: ContractCallOptions = {
            contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
            contractName: "bitthetix",
            functionName: 'purchase-asset',
            functionArgs: [uintCV(onChainAsset.key), uintCV(Math.floor(btcToBuy * 100_000_000))],
            postConditions: [tokenPostCondition],
            network,
            appDetails,
            onFinish: async ({ stacksTransaction }) => {
                addOrderToast({
                    txId: stacksTransaction.txid(),
                    status: 'pending',
                    assetKey: getKeyFromAsset(onChainAsset),
                    amountSBTC: btcToBuy,
                    timestamp: Date.now() / 1000,
                    amountAsset: assetAmount,
                }, `Purchasing $${num} of ${onChainAsset.ticker}...`);
            },
        }
        await openContractCall(options);
        form.setFieldValue("Amount", 0);
    }

    const sellAsset = async () => {

        // Max-sell is balance (sloppy fix for roundoff error).
        const balance = balances[getKeyFromAsset(onChainAsset)];

        const tokenPostCondition = makeContractFungiblePostCondition(
            "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
            "bitthetix",
            FungibleConditionCode.GreaterEqual,
            0,
            createAssetInfo("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", 'sbtc', 'sbtc')
        );

        const options: ContractCallOptions = {
            contractAddress: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
            contractName: "bitthetix",
            functionName: 'sell-asset',
            functionArgs: [uintCV(onChainAsset.key), uintCV(Math.floor(Math.min(balance, assetAmount) * 100_000_000))],
            postConditions: [tokenPostCondition],
            network,
            appDetails,
            onFinish: async ({ stacksTransaction }) => {
                addOrderToast({
                    txId: stacksTransaction.txid(),
                    status: 'pending',
                    assetKey: getKeyFromAsset(onChainAsset),
                    amountSBTC: btcToBuy,
                    timestamp: Date.now() / 1000,
                    amountAsset: assetAmount,
                }, `Selling $${num} of ${onChainAsset.ticker}...`);
            },
        }
        await openContractCall(options);
        form.setFieldValue("Amount", 0);
    }

    return (
        <Content>
            <Form
                form={form}
                layout="vertical"
                wrapperCol={{ span: 24 }}
                labelCol={{ span: 24 }}
                onFinish={shouldBuy ? buyAsset : sellAsset}
                initialValues={{ "Amount": "$ 0" }}
            >
                <Form.Item
                    label="Amount"
                    tooltip="The amount you wish to purchase (in USD)"
                >
                    <Row gutter={10}>
                        <Col span={18}>
                            <Form.Item
                                name="Amount"
                                style={{ marginBottom: 0 }}
                            >
                                <InputNumber
                                    style={{ width: '100%', lineHeight: 3 }}
                                    formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    // @ts-ignore - antd issue
                                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Button onClick={() => {
                                form.setFieldsValue({ "Amount": `${sBTCBalance * btcPrice}` })
                            }} style={{ width: '100%', height: '100%' }}>Max</Button>
                        </Col>
                    </Row>
                </Form.Item>
                <Form.Item>
                    <Button
                        disabled={isBTC}
                        style={{ width: '100%' }}
                        type="primary"
                        htmlType="submit"
                    >{isBTC ? "No need to buy Bitcoin..." : shouldBuy ? "Buy" : "Sell"}</Button>
                </Form.Item>
            </Form>
            <Row justify="space-between" className='mt-6'>
                <Text type="secondary">Amount {shouldBuy ? "you spend" : "you receive"} (sBTC):</Text>
                <Text>{(isNaN(btcToBuy) ? 0 : btcToBuy).toLocaleString("en-US", { maximumFractionDigits: 10 })}</Text>
            </Row>
            <Row justify="space-between">
                <Text type="secondary">Trading fee &nbsp;(sBTC):</Text>
                <Text>0</Text>
            </Row>
            <Row justify="space-between">
                <Text type="secondary">I.V fee <Tooltip title="The Implied Volatility (IV) fee is a fee applied depending on the asset's volatility. It is disabled for testnet."><QuestionCircleOutlined /></Tooltip> (sBTC):</Text>
                <Text>0</Text>
            </Row>
            <Row justify="space-between" className='!mb-6'>
                <Text type="secondary">You {shouldBuy ? "get" : "sell"} ({ticker}):</Text>
                <Text>{(isNaN(assetAmount) ? 0 : assetAmount).toLocaleString("en-US", { maximumFractionDigits: 10 })}</Text>
            </Row>
            <Col className='!mb-6'>
                <Text type="secondary">* The price of the asset you buy/sell is not guaratneed to match the price at the time of your order. This is due to the Bitcoin block time of ~10 minutes.</Text>
            </Col>
        </Content>
    )
}