'use client';

// If used in Pages Router, is no need to add "use client"
import React from 'react';
import _ from 'lodash';

import type { ColumnsType, TableProps } from 'antd/es/table';
import { Table } from 'antd';
import { useBitThetixState } from '@/providers/BitThetixStateProvider';
import { getKeyFromAsset } from '@/lib/util';
import { Balances, Order } from './types';
import { useRouter } from 'next/navigation';
import { isMobile } from 'react-device-detect';

const columns: ColumnsType<ExtendedBalance> = [
    {
        title: 'Ticker',
        dataIndex: 'ticker',
        sorter: (a, b) => a.ticker.localeCompare(b.ticker),
        sortDirections: ['descend', 'ascend'],
        render: (text, record) => text === "BTC" ? "sBTC" : text,
    },
    {
        title: isMobile ? 'Qty' : 'Quantity',
        dataIndex: 'amount',
        sorter: (a, b) => (a.amount - b.amount > 0 ? 1 : -1),
        sortDirections: ['descend', 'ascend'],
        render: (text: string, record) => text
    },
    {
        title: isMobile ? 'Value' : 'Amount (USD)',
        dataIndex: 'amountUSD',
        defaultSortOrder: 'descend',
        sorter: (a, b) => (a.amountUSD - b.amountUSD > 0 ? 1 : -1),
        sortDirections: ['descend', 'ascend'],
        render: (text: string, record) => (`$${parseFloat(text).toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`)
    }
];

const onChange: TableProps<ExtendedBalance>['onChange'] = (pagination, filters, sorter, extra) => {
};

type ExtendedBalance = {
    amount: number,
    amountUSD: number,
    ticker: string,
}

const Positions = ({ balances }: { balances: Balances }) => {
    const router = useRouter();
    const { assets } = useBitThetixState();

    return (
        <Table
            onRow={(record) => {
                return {
                    onClick: () => {
                        router.push(`/trade/${record.ticker}`);
                    }, // click row
                    onDoubleClick: _.noop, // double click row
                    onContextMenu: _.noop, // right button click row
                    onMouseEnter: _.noop, // mouse enter row
                    onMouseLeave: _.noop, // mouse leave row
                };
            }}
            columns={columns}
            rowKey={"ticker"}
            dataSource={Object.keys(balances).filter(k => balances[k]).map(k => {
                const asset = assets.get(k);
                const balance = balances[k];
                return { amount: balance, amountUSD: balance * (asset?.price || 0), ticker: asset?.ticker || "" }
            })}
            scroll={{ x: "max-overflow" }}
            onChange={onChange}
        />
    );
};

export default Positions;