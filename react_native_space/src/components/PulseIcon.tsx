import React from 'react';
import Svg, { Path } from 'react-native-svg';

export interface PulseIconProps {
  size?: number;
  color?: string;
}

export function PulseIcon({ size = 24, color = '#FFFFFF' }: PulseIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M3 13h2l3-6 4 12 4-9h3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M2 13h2l3-6 4 12 4-9h3"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
