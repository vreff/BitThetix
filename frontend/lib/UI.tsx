import React, { useState, useRef } from "react"
import { Card, CardProps } from 'antd';


export function CardGradient(props: CardProps) {
    return (
        <Card {...props} className={`${props.className} !backdrop-blur-sm !bg-[#303030]/20`}>
            {props.children}
        </Card>
    )
}