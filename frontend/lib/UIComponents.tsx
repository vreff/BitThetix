import { createChart, ColorType, CustomData, Time, TickMarkType, CrosshairMode, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';


import { Card, Typography } from 'antd';
const { Title, Text } = Typography;

const titleMarginBottom = 10;

export const getTitle = (text: string) => {
    return (
        <Title level={4} style={{ marginBottom: titleMarginBottom, marginTop: titleMarginBottom * 2, paddingLeft: 10 }}>
            {text}
        </Title>
    );
}

export const ChartComponent = (props: {
    data: any[],
    colors: {
        backgroundColor: string,
        lineColor: string,
        textColor: string,
        borderColor: string,
        areaTopColor?: string,
        areaBottomColor?: string,
    },
    loading: boolean,
}) => {
    const {
        data,
        colors: {
            backgroundColor,
            lineColor,
            borderColor,
            textColor,
        } = {},
    } = props;

    const chartContainerRef = useRef<any>();
    const mainSeriesRef = useRef<ISeriesApi<"Candlestick", any>>();

    useEffect(
        () => {
            const handleResize = () => {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            };

            const chart = createChart(chartContainerRef.current, {
                layout: {
                    background: { type: ColorType.Solid, color: backgroundColor },
                    textColor,
                },
                width: chartContainerRef.current.clientWidth,
                height: 300,
                grid: {
                    vertLines: { color: props.colors.lineColor },
                    horzLines: { color: props.colors.lineColor },
                },
                rightPriceScale: {
                    borderColor: props.colors.borderColor,
                    borderVisible: true,
                    ticksVisible: true,
                },
                timeScale: {
                    borderColor: props.colors.borderColor,
                    timeVisible: true, // Ensure the time is visible
                },
                crosshair: {
                    mode: CrosshairMode.Normal
                },
            });
            mainSeriesRef.current = chart.addCandlestickSeries();
            mainSeriesRef.current.setData(data);
            chart.timeScale().fitContent();
            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                chart.remove();
            };
        },
        [backgroundColor, lineColor, textColor]
    );

    useEffect(() => {
        mainSeriesRef.current?.setData(data);
    }, [data])

    return (
        <Card style={{ borderRadius: 0, borderRightWidth: 0, borderLeftWidth: 0 }} bodyStyle={{ padding: 0 }}>
            <div
                style={{}}
                ref={chartContainerRef}
            />
            {props.loading && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.5)', // Semi-transparent white
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 10
                }}>
                    <span>Loading...</span>
                </div>
            )}
        </Card>
    );
};