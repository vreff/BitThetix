'use client';

import { useRouter } from 'next/navigation';

import { Typography, Row, Button, Card, Col, Layout, Space, Image, Tabs, theme } from 'antd';
import { ChartComponent } from '@/lib/UIComponents';
import _ from 'lodash';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useBitThetixState } from '@/providers/BitThetixStateProvider';
import React from 'react';
import { EmptyOffChainAsset, EmptyOnChainAsset, Granularities, GreenColor, PrimaryColor, RedColor, SatoshisPerBTC } from '@/lib/constants';
import { get24hrChange, getKeyFromAsset } from '@/lib/util';
import { useTransactionToasts } from '@/providers/TransactionAndOrderProvider';
import Orders from '@/lib/Orders';
import Order from '@/lib/Order';

const { Title, Text } = Typography;
const { Content } = Layout;

export default function Page({ params }: { params: { ticker: string } }) {
    const router = useRouter();
    const token = theme.useToken();

    const { pendingOrders, completedOrders } = useTransactionToasts();

    const {
        priceHistoryMapping,
        selectedGranularity,
        updateGranularity,
        assets,
        chartLoading,
        offChainAssets,
        balances,
    } = useBitThetixState();

    // Calculate 24hr change, if data available.
    let dailyChange = 0;
    const onChainAsset = Array.from(assets.values()).find(a => a.ticker === params.ticker) || EmptyOnChainAsset;
    const offchainAsset = offChainAssets[getKeyFromAsset(onChainAsset)] || EmptyOffChainAsset;
    if (offchainAsset.price) {
        dailyChange = get24hrChange(offchainAsset.priceReference24hr, offchainAsset.price);
    }

    // Get balance and total asset holdings.
    const balance = (balances[getKeyFromAsset(onChainAsset)] || 0);
    const assetPrice = onChainAsset.price;
    const assetHoldings = balance * assetPrice;

    return (
        <Content>
            <Row>
                <Col xs={24} md={8}>
                    <Card
                        title={
                            <Content className='!pl-3 !pr-3 md:!px-6'>
                                <Space>
                                    <Image
                                        width={40}
                                        src={`/assets/images/${params.ticker}.png`}
                                        style={{ marginTop: 20, marginBottom: 20 }}
                                    />
                                    <Space direction="vertical" style={{ marginLeft: 10 }}>
                                        <Title level={3}>{params.ticker}</Title>
                                    </Space>
                                </Space>
                            </Content>
                        }
                        extra={<Content className='!pl-3 !pr-3 md:!px-6'><Button onClick={() => router.back()}><ArrowLeftOutlined /></Button></Content>}
                        style={{ borderRadius: 0, borderRightWidth: 0, borderLeftWidth: 0, height: '100%' }}
                        headStyle={{ padding: 0 }}
                        bodyStyle={{ padding: 0 }}
                        hoverable={false}
                    >
                        <Card
                            title={
                                <Row justify="space-between" >
                                    <Text type="secondary">Balance: </Text>
                                    <Space direction='vertical' align="end">
                                        <Text style={{ color: GreenColor }}>${(assetHoldings).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: assetHoldings > 1 ? 2 : 6 })}<Text type="secondary"> | {(balance).toLocaleString("en-US", { maximumFractionDigits: 10 })} {params.ticker}</Text></Text>
                                    </Space>
                                </Row>
                            }
                            style={{ borderRadius: 0, borderWidth: 0, height: '100%' }}
                            bodyStyle={{ padding: 0 }}
                            hoverable={false}
                        >
                            <Content className='!px-6'>
                                <Tabs
                                    defaultActiveKey="1"
                                    items={[
                                        {
                                            label: 'Buy',
                                            key: '1',
                                            children: (<Order type={"buy"} />),
                                        },
                                        {
                                            label: 'Sell',
                                            key: '2',
                                            children: (<Order type={"sell"} />),
                                        },
                                    ]}
                                />
                            </Content>
                        </Card>
                    </Card>
                </Col>
                <Col xs={24} md={16}>
                    <Card bodyStyle={{ paddingRight: 0, paddingLeft: 0 }} className='!border-0 !rounded-none sm:!border-y sm:!border-l !h-full' style={{ textAlign: 'center' }} hoverable={false}>
                        <Row className="!mb-6 sm:!mb-3 w-full !px-6" gutter={[30, 30]}>
                            <Col>
                                <Space direction="vertical" align="start">
                                    <Text type="secondary">Off-chain price</Text>
                                    <Title style={{ color: offchainAsset.previousPrice > offchainAsset.price ? RedColor : GreenColor }} level={4}>${offchainAsset.price?.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</Title>
                                </Space>
                            </Col>
                            <Col>
                                <Space direction="vertical" align="start">
                                    <Text type="secondary">On-chain price</Text>
                                    <Title level={4}>${(onChainAsset?.price).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</Title>
                                </Space>
                            </Col>
                            <Col>
                                <Space direction="vertical" align="start">
                                    <Text type="secondary">24 hr change</Text>
                                    <Title style={{ color: dailyChange >= 0 ? GreenColor : RedColor }} level={4}>{(dailyChange * 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%</Title>
                                </Space>
                            </Col>
                        </Row>
                        <Card className="!border-y !border-x-0 !rounded-none !text-center sm:!text-left" bodyStyle={{ padding: 0, }}>
                            {Granularities.map(g =>
                                <Button
                                    key={`granularity-${g.resolution}`}
                                    style={(g.resolution === selectedGranularity.resolution ? { color: PrimaryColor } : {})}
                                    type="text"
                                    onClick={() => {
                                        if (selectedGranularity.resolution !== g.resolution) {
                                            updateGranularity(g, params.ticker);
                                        }
                                    }}
                                >
                                    {g.name}
                                </Button>
                            )}
                        </Card>
                        <ChartComponent loading={chartLoading} colors={{
                            backgroundColor: token.token.colorBgBase,
                            borderColor: token.token.colorBorder,
                            textColor: token.token.colorTextBase,
                            lineColor: token.token.colorSplit
                        }} data={priceHistoryMapping[params.ticker] || []}></ChartComponent>
                        <Tabs
                            size="large"
                            className='!pl-3 !pr-3 md:!px-6'
                            items={[{
                                label: `Pending`,
                                key: "pending",
                                children: <><br />{pendingOrders.size ? <Orders orders={pendingOrders} assetKey={getKeyFromAsset(onChainAsset)} /> : `No pending orders`}</>,
                            }, {
                                label: `Completed`,
                                key: "orders",
                                children: <><br />{completedOrders.size ? <Orders orders={completedOrders} assetKey={getKeyFromAsset(onChainAsset)} /> : `No completed orders`}</>,
                            }]}
                        />
                    </Card>
                </Col>
            </Row>
        </Content >
    )
}