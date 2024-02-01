'use client';

// If used in Pages Router, is no need to add "use client"
import React from 'react';
import { useRouter } from 'next/navigation'

import { Button, Card, Col, Layout, Space, } from 'antd';
import { Row } from 'antd';
import { Typography } from 'antd';
import { getTitle } from '@/lib/UIComponents';
import { useBitThetixState } from '@/providers/BitThetixStateProvider';
import Positions from '@/lib/Positions';
import { getKeyFromAsset } from '@/lib/util';
import { useTransactionToasts } from '@/providers/TransactionAndOrderProvider';
import Orders from '@/lib/Orders';
import { useScreenDetector } from '@/lib/ScreenDetector';
import { CardGradient } from '@/lib/UI';

const { Content } = Layout;
const { Title, Text } = Typography;

const Home = () => {
  const { isMobile } = useScreenDetector();
  const router = useRouter();
  const { completedOrders } = useTransactionToasts();
  const { sBTCBalance, assets, balances, totalBalance } = useBitThetixState();
  const btcAsset = Array.from(assets.values()).find(a => a.ticker === "BTC");
  const btcPrice = btcAsset?.price || 0;

  const balancesIncludingBTC = btcAsset ? { ...balances, [getKeyFromAsset(btcAsset)]: sBTCBalance } : balances;

  return (
    <Content className='!pl-3 !pr-3 md:!px-6'>
      <CardGradient hoverable={false} style={{ marginTop: 20 }}>
        <Space>
          <img style={{ height: 200, width: 200 }} src="/assets/svgs/logo.svg"></img>
          <Space direction="vertical">
            <Title>Welcome to BitThetix</Title>
            <Title level={4} type="secondary" >A synthetic asset platform built for Bitcoin.</Title>
          </Space>
        </Space>
      </CardGradient>
      {!isMobile && getTitle("Portfolio")}
      <Row >
        <Col order={Number(isMobile)} xs={24} md={8}>
          <CardGradient
            style={{ height: '100%', ...(isMobile ? { borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0 } : { borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0, }) }}>
            <Text type="secondary">Portfolio Value</Text>
            <Title className='!mt-2' level={3} >{(Number(totalBalance)).toLocaleString("en-US", { minimumFractionDigits: 4 })} BTC</Title>
            <Title level={4} type="secondary">${((Number(totalBalance)) * (btcPrice)).toLocaleString("en-US", { minimumFractionDigits: 2 })}</Title>
          </CardGradient>
        </Col>
        <Col order={Number(!isMobile)} xs={24} md={16}>
          <Card style={{ textAlign: 'center', ...(isMobile ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 } : { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }) }} hoverable={false}>
            <Space direction="vertical">
              <Title level={2} style={{ marginTop: 0 }}>Buy any Asset</Title>
              <Text type='secondary'>Trade Altcoins, Commodities, and FX on the Bitcoin network</Text>
              <Button
                onClick={() => router.push('/trade')}
                type="primary"
                style={{ height: 40, marginTop: 10 }}
              >
                Start Trading
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
      {getTitle("Open Positions")}
      <Card className='!backdrop-blur-sm !bg-[#303030]/20'>
        {Object.keys(balancesIncludingBTC).filter(k => balancesIncludingBTC[k]).length > 0 ? <Positions balances={balancesIncludingBTC} /> : <Text type="secondary"> No open positions.</Text>}
      </Card>
      {getTitle("Trade History")}
      <Card className='!backdrop-blur-sm !bg-[#303030]/20'>
        {completedOrders.size ? <Orders orders={completedOrders} /> : <Text type="secondary">No trades yet</Text>}
      </Card>
    </Content>
  );
};

export default Home;

