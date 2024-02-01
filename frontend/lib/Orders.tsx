'use client';

// If used in Pages Router, is no need to add "use client"
import React from 'react';
import _ from 'lodash';

import type { ColumnsType, TableProps } from 'antd/es/table';
import { Table } from 'antd';
import { useBitThetixState } from '@/providers/BitThetixStateProvider';
import { Order, Orders } from './types';

const columns: ColumnsType<ExtendedOrder> = [
    {
        title: 'Transaction Id',
        dataIndex: 'txId',
        sorter: (a, b) => a.txId.localeCompare(b.txId),
        sortDirections: ['descend', 'ascend'],
        render: (text, record) => `${record.txId.slice(0, 5)}...${record.txId.slice(record.txId.length - 5)}`,
    },
    {
        title: 'Ticker',
        dataIndex: 'ticker',
        sorter: (a, b) => a.ticker.localeCompare(b.ticker),
        sortDirections: ['descend', 'ascend'],
        render: (text: string, record) => (text)
    },
    {
        title: 'Amount',
        dataIndex: 'amountAsset',
        sorter: (a, b) => (a.amountAsset - b.amountAsset > 0 ? 1 : -1),
        sortDirections: ['descend', 'ascend'],
        render: (text: string, record) => parseFloat(text).toLocaleString("en-US", { maximumFractionDigits: 10 })
    },
    {
        title: 'Amount (USD)',
        dataIndex: 'amountUSD',
        sorter: (a, b) => (a.amountUSD - b.amountUSD > 0 ? 1 : -1),
        sortDirections: ['descend', 'ascend'],
        render: (text: string, record) => (`$${parseFloat(text).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`)
    },
    {
        title: 'Order Time',
        dataIndex: 'timestamp',
        defaultSortOrder: 'descend',
        sorter: (a, b) => (a.timestamp - b.timestamp > 0 ? 1 : -1),
        sortDirections: ['descend', 'ascend'],
        render: (text: string, record) => ((new Date(parseInt(text) * 1000)).toLocaleString())
    },
];

const onChange: TableProps<ExtendedOrder>['onChange'] = (pagination, filters, sorter, extra) => {
};

type ExtendedOrder = Order & {
    ticker: string,
    amountUSD: number,
}

const Orders = ({ orders, assetKey }: { orders: Orders, assetKey?: string }) => {
    const { assets } = useBitThetixState();
    const [, asset] = Array.from(assets).find(([, a]) => a.ticker === "BTC") || [];
    const btcPrice = asset?.price || 0;
    let ordersArray = Array.from(orders.values())
    if (assetKey) ordersArray = ordersArray.filter(o => o.assetKey === assetKey);

    return (
        <Table
            onRow={(record) => {
                return {
                    onClick: () => {
                        // window.open(`https://google.com`, '_blank', 'noopener,noreferrer');
                        window.open(`localhost:8000/txid/${record.txId}?chain=testnet&api=http://localhost:3999`, '_blank', 'noopener,noreferrer');
                    }, // click row
                    onDoubleClick: _.noop, // double click row
                    onContextMenu: _.noop, // right button click row
                    onMouseEnter: _.noop, // mouse enter row
                    onMouseLeave: _.noop, // mouse leave row
                };
            }}
            columns={columns}
            rowKey={"txId"}
            dataSource={ordersArray.map(order => {
                const asset = assets.get(order.assetKey);
                return { ...order, ticker: asset?.ticker || "", amountUSD: ((asset?.price || 0)) * ((btcPrice / (asset?.price || 0)) * order.amountSBTC) }
            })}
            scroll={{ x: "max-overflow" }}
            onChange={onChange}
        />
    );
};

export default Orders;