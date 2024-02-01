'use client';

import { useEffect, useState } from "react";
import { isMobile as isMobileRigid } from 'react-device-detect';

export const useScreenDetector = () => {
    const [width, setWidth] = useState(10_000);

    const handleWindowSizeChange = () => {
        setWidth(window?.innerWidth || 0);
    };

    useEffect(() => {
        handleWindowSizeChange();
        window.addEventListener("resize", handleWindowSizeChange);

        return () => {
            window.removeEventListener("resize", handleWindowSizeChange);
        };
    }, []);

    const isMobile = width <= 768;
    const isTablet = width <= 1024;
    const isDesktop = width > 1024;

    return { isMobile, isTablet, isDesktop, width };
};