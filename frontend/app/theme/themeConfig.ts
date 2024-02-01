// theme/themeConfig.ts
import type { ThemeConfig } from 'antd';
import { Roboto_Mono } from "next/font/google";
import { theme as antdTheme } from "antd";

const oxygen = Roboto_Mono({ subsets: ["latin"] });

const theme: ThemeConfig = {
  token: {
    fontFamily: oxygen.style.fontFamily,
    fontWeightStrong: 700,
    colorPrimary: 'rgb(255, 184, 0)',
  },
  components: {
    Menu: {
      colorPrimary: 'transparent',
      borderRadius: 5,
      algorithm: true,
      darkItemBg: "transparent",
      fontSize: 18,
    },
    Layout: {
      headerPadding: 0,
      algorithm: true,
      headerBg: "rgb(0, 0, 0)",
    },
    Card: {
      algorithm: true,
      borderRadius: 20,
    },
    Typography: {
      titleMarginBottom: 0,
      titleMarginTop: 0,
      margin: 0,
    },
    Button: {
      controlHeight: 40,
    },
    Input: {
      colorBorder: "#303030"
    },
    Form: {
      itemMarginBottom: 10,
    },
    Tabs: {
      cardGutter: 0,
    }
  }
};

export default theme;