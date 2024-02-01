'use client';

// If used in Pages Router, is no need to add "use client"
import React, { useState } from 'react';
import _ from 'lodash';
import { useRouter } from 'next/navigation'
import { getTitle } from '@/lib/UIComponents';

import type { ColumnsType, TableProps } from 'antd/es/table';
import { QuestionCircleOutlined, SearchOutlined } from '@ant-design/icons';
import { Typography, Image, Table, Layout, Space, Input, Tooltip, Row, Col, Card, Button } from 'antd';
import { useBitThetixState } from '@/providers/BitThetixStateProvider';
import { getKeyFromAsset } from '@/lib/util';
import { SatoshisPerBTC } from '@/lib/constants';
import { OnChainAsset } from '@/lib/types';
import { isMobile as isMobileRigid } from 'react-device-detect';
import { useScreenDetector } from '@/lib/ScreenDetector';
import Positions from '@/lib/Positions';
import Orders from '@/lib/Orders';
import { useTransactionToasts } from '@/providers/TransactionAndOrderProvider';
const { Content } = Layout;
const { Title, Text } = Typography;

const greenColor = "rgb(127, 212, 130)";
const redColor = "rgb(242, 84, 84)";

type ExtendedAsset = OnChainAsset & {
    offChainPrice: number,
    previousOffChainPrice: number,
    btcPrice: number,
    priceReference24hr: number,
}

const columns: ColumnsType<ExtendedAsset> = [
    {
        title: 'Name',
        dataIndex: 'name',
        sorter: (a, b) => a.name.localeCompare(b.name),
        sortDirections: ['descend', 'ascend'],
        render: (text, record) => (
            <Space className="!flex-col sm:!flex-row" align={'center'} >
                <Image
                    width={30}
                    src={`/assets/images/${record.ticker}.png`}
                />
                <Space direction="vertical" className="sm:!ml-2">
                    {!isMobileRigid && <Text type="secondary">{record.name}</Text>}
                    <Text type="secondary">{record.ticker}</Text>
                </Space>
            </Space>
        ),
    },
    {
        title: 'Price',
        dataIndex: 'price',
        defaultSortOrder: 'descend',
        sorter: (a, b) => (a.price - b.price > 0 ? 1 : -1),
        sortDirections: ['descend', 'ascend'],
        render: (text: string, record) => (
            <Space direction="vertical">
                <Text
                    style={{ color: (record.previousOffChainPrice > record.offChainPrice) ? redColor : greenColor }}
                    type="secondary"
                >
                    ${(record.offChainPrice).toLocaleString("en-US",
                        {
                            maximumFractionDigits: record.offChainPrice > 1 ? 2 : 6,
                            minimumFractionDigits: 2
                        })}
                </Text>
                <Text type="secondary">
                    {((record.price / record.btcPrice) * SatoshisPerBTC).toLocaleString("en-US", { maximumFractionDigits: 0 })} SATS
                </Text>
            </Space>
        )
    },
    {
        title: 'Change (24hr)',
        dataIndex: 'change',
        sorter: (a, b) => (a.price - b.price > 0 ? 1 : -1),
        sortDirections: ['descend', 'ascend'],
        render: (text: string, record) => (
            <Text
                style={{ color: record.offChainPrice - record.priceReference24hr >= 0 ? greenColor : redColor }}
                type="secondary"
            >
                {((record.offChainPrice - record.priceReference24hr) / record.priceReference24hr * 100).toFixed(2)}%
            </Text >
        )
    }
];
const extraColumns: ColumnsType<ExtendedAsset> = [
    {
        title: <Tooltip title="Implied Volatility (IV) is the expected price volatility of the asset. On BitThetix, a higher trading fee is charged for assets with higher IV.">Implied Volatility <QuestionCircleOutlined /></Tooltip>,
        dataIndex: 'impliedVolatility',
        showSorterTooltip: false,
        sorter: (a, b) => (a.impliedVolatility - b.impliedVolatility),
        sortDirections: ['descend', 'ascend'],
        render: (text: string, record) => text
    }
];

const onChange: TableProps<ExtendedAsset>['onChange'] = (pagination, filters, sorter, extra) => {
};

const Trade = () => {

    const { isMobile } = useScreenDetector();

    const router = useRouter();
    const { completedOrders } = useTransactionToasts();
    const { assets, offChainAssets, balances, totalBalance, sBTCBalance } = useBitThetixState();
    const [query, setQuery] = useState("");
    const btcAsset = Array.from(assets.values()).find(a => a.ticker === "BTC");
    const btcPrice = btcAsset?.price || 0;

    const balancesIncludingBTC = btcAsset ? { ...balances, [getKeyFromAsset(btcAsset)]: sBTCBalance } : balances;

    return (
        <Content className='!pl-3 !pr-3 md:!px-6'>
            {getTitle("Markets")}
            <Input
                onChange={(e) => {
                    setQuery(e.target.value.toLocaleLowerCase())
                }}
                className='mb-3'
                size="large"
                placeholder="Search..."
                prefix={<SearchOutlined />}
            />
            <Table
                onRow={(record) => {
                    return {
                        onClick: () => {
                            router.push(`/trade/${record.ticker}`)
                        }, // click row
                        onDoubleClick: _.noop, // double click row
                        onContextMenu: _.noop, // right button click row
                        onMouseEnter: _.noop, // mouse enter row
                        onMouseLeave: _.noop, // mouse leave row
                    };
                }}
                columns={(isMobile ? columns : [...columns, ...extraColumns])}
                dataSource={Array.from(assets.values()).filter(
                    d => d.name.toLocaleLowerCase().includes(query) ||
                        d.ticker.toLocaleLowerCase().includes(query)
                ).map((a) => {
                    const key = getKeyFromAsset(a);
                    return ({
                        ...a,
                        offChainPrice: offChainAssets[key]?.price || 0,
                        previousOffChainPrice: offChainAssets[key]?.previousPrice || 0,
                        btcPrice: btcPrice,
                        priceReference24hr: offChainAssets[key]?.priceReference24hr || 0,
                    });
                }
                )}
                onChange={onChange}
            />
        </Content>
    );
};

export default Trade;