import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function PineappleHeartLogo({ size = 320 }) {
  return (
    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size * 1.25} viewBox="0 0 800 1000">
        {/* Leaves */}
        <Path d="M400 20 C360 120 360 200 400 280 C440 200 440 120 400 20Z" fill="#4BAA43" />
        <Path d="M250 80 C300 180 340 260 395 340 C390 220 340 130 250 80Z" fill="#4BAA43" />
        <Path d="M550 80 C460 130 410 220 405 340 C460 260 500 180 550 80Z" fill="#4BAA43" />
        <Path d="M120 240 C220 220 310 260 395 360 C280 340 200 310 120 240Z" fill="#4BAA43" />
        <Path d="M680 240 C600 310 520 340 405 360 C490 260 580 220 680 240Z" fill="#4BAA43" />
        <Path d="M220 360 C300 390 350 450 395 530 C300 500 250 450 220 360Z" fill="#4BAA43" />
        <Path d="M580 360 C550 450 500 500 405 530 C450 450 500 390 580 360Z" fill="#4BAA43" />

        {/* Heart body */}
        <Path
          d="M400 880 C260 740 160 620 160 500 C160 400 230 340 320 340 C370 340 410 370 400 430 C390 370 430 340 480 340 C570 340 640 400 640 500 C640 620 540 740 400 880"
          fill="#F7A11A"
        />

        {/* White scale pattern */}
        <Path d="M220 450L540 780" stroke="white" strokeWidth="14" />
        <Path d="M180 540L500 870" stroke="white" strokeWidth="14" />
        <Path d="M280 370L600 700" stroke="white" strokeWidth="14" />
        <Path d="M340 330L650 640" stroke="white" strokeWidth="14" />
        <Path d="M580 450L260 780" stroke="white" strokeWidth="14" />
        <Path d="M620 540L300 870" stroke="white" strokeWidth="14" />
        <Path d="M520 370L200 700" stroke="white" strokeWidth="14" />
        <Path d="M460 330L150 640" stroke="white" strokeWidth="14" />
      </Svg>
    </View>
  );
}
