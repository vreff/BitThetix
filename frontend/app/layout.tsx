'use client';
import './globals.css';

import themeConfig from './theme/themeConfig';
import React, { useEffect, useLayoutEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation'
import { Inter } from 'next/font/google';
import StyledComponentsRegistry from '../lib/AntdRegistry';

import { Button, Layout, Menu, ConfigProvider, Card } from 'antd';
import { AlipayCircleFilled, AlertFilled, MenuFoldOutlined, QuestionCircleFilled, MenuOutlined } from '@ant-design/icons';
import { theme as antdTheme } from "antd";
import StacksProvider from '../providers/StacksProvider';
import Auth from '@/lib/Auth';
import BitThetixStateProvider from '@/providers/BitThetixStateProvider';
import TransactionAndOrderProvider from '@/providers/TransactionAndOrderProvider';
import { Toaster } from 'react-hot-toast'
import { CardGradient } from '@/lib/UI';
import { useScreenDetector } from '@/lib/ScreenDetector';

const { Header, Footer, Content } = Layout;
const inter = Inter({ subsets: ['latin'] });

const items = [{ key: "/", label: 'Home' }, { key: "trade", label: 'Trade' }, { key: "stake", label: 'Stake' }]
const RootLayout = ({ children }: React.PropsWithChildren) => {

  const { isMobile, width } = useScreenDetector();
  const [darkMode, setDarkMode] = React.useState(true);
  const router = useRouter();
  const pathname = usePathname();

  return (
    <html lang="en">
      <head>
        <title>BitThetix</title>
        <link rel="icon" href="/favicon.svg" />
      </head>
      <body className={inter.className}>
        <StyledComponentsRegistry>
          <ConfigProvider theme={{
            ...themeConfig,
            algorithm: darkMode
              ? antdTheme.darkAlgorithm
              : antdTheme.defaultAlgorithm
          }}>
            <StacksProvider>
              <TransactionAndOrderProvider>
                <BitThetixStateProvider>
                  <Toaster position="bottom-right" />
                  {<Layout style={{ minHeight: '100vh' }}>
                    {pathname === "/" && !isMobile && <div className="absolute left-1/2 top-0 ml-[-38rem] h-[100vh] w-[80vw] dark:[mask-image:linear-gradient(white,transparent)]"><div className="absolute inset-0 bg-gradient-to-r from-[#36b49f] to-[#DBFF75] opacity-40 [mask-image:radial-gradient(farthest-side_at_top,white,transparent)] dark:from-[#36b49f]/30 dark:to-[#DBFF75]/30 dark:opacity-100"><svg aria-hidden="true" className="absolute inset-x-0 inset-y-[-50%] h-[100%] w-full skew-y-[-18deg] fill-black/40 stroke-black/50 mix-blend-overlay dark:fill-white/2.5 dark:stroke-white/5"><defs><pattern id=":S1:" width="72" height="56" patternUnits="userSpaceOnUse" x="-12" y="4"><path d="M.5 56V.5H72" fill="none"></path></pattern></defs><rect width="100%" height="100%" strokeWidth="0" fill="url(#:S1:)"></rect><svg x="-12" y="4" className="overflow-visible"><rect strokeWidth="0" width="73" height="57" x="288" y="168"></rect><rect strokeWidth="0" width="73" height="57" x="144" y="56"></rect><rect strokeWidth="0" width="73" height="57" x="504" y="168"></rect><rect strokeWidth="0" width="73" height="57" x="720" y="336"></rect></svg></svg></div></div>}
                    <CardGradient bodyStyle={{ padding: 0 }} className='!rounded-none !border-x-0'>
                      <Header className='!pl-0 !pr-3 md:!px-6 ' style={{ display: 'flex', alignItems: 'center', backgroundColor: 'transparent' }}>
                        <Menu
                          mode="horizontal"
                          theme="dark"
                          selectedKeys={[(pathname?.split("/")[1] || "/")]}
                          items={items}
                          overflowedIndicator={<MenuOutlined />}
                          style={{ flex: 1, minWidth: 0, backgroundColor: 'transparent' }}
                          className='pr-0 sm:pr-6'
                          onClick={(e) => {
                            if (e.key === "trade" && pathname.includes("trade") && pathname.split("/").length > 2) {
                              router.back()
                            } else {
                              router.push(e.key)
                            }
                          }}
                        />
                        <Auth />
                      </Header>
                    </CardGradient>
                    <Content style={{}}>
                      {children}
                    </Content>
                    <Footer style={{ textAlign: 'center' }}></Footer>
                  </Layout>}
                </BitThetixStateProvider>
              </TransactionAndOrderProvider>
            </StacksProvider>
          </ConfigProvider >
        </StyledComponentsRegistry>
      </body>
    </html >
  );
}

export default RootLayout;