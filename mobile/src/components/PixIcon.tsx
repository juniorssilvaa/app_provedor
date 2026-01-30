import React from 'react';
import Svg, { Path } from 'react-native-svg';

export interface PixIconProps {
  size?: number;
  color?: string;
}

export function PixIcon({ size = 22, color = '#00B4AA' }: PixIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M7.4 2.9L2.9 7.4a3.5 3.5 0 000 5l4.5 4.5a3.5 3.5 0 005 0l4.5-4.5a3.5 3.5 0 000-5L12.4 2.9a3.5 3.5 0 00-5 0z"
        fill={color}
      />
      <Path
        d="M16.6 21.1l4.5-4.5a3.5 3.5 0 000-5l-4.5-4.5a3.5 3.5 0 00-5 0l-4.5 4.5a3.5 3.5 0 000 5l4.5 4.5a3.5 3.5 0 005 0z"
        fill={color}
      />
    </Svg>
  );
}
