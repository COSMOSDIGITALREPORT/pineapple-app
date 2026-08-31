import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const HEARTS = [
  { left: width * 0.05, size: 22, duration: 10000, delay: 0 },
  { left: width * 0.2,  size: 16, duration: 13000, delay: 2500 },
  { left: width * 0.38, size: 26, duration: 11000, delay: 1000 },
  { left: width * 0.55, size: 18, duration: 14000, delay: 4000 },
  { left: width * 0.7,  size: 24, duration: 12000, delay: 2000 },
  { left: width * 0.85, size: 14, duration: 9500,  delay: 5500 },
];

function FloatingHeart({ left, size, duration, delay }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (isFirst) => {
      translateY.setValue(0);
      opacity.setValue(0);
      Animated.sequence([
        Animated.delay(isFirst ? delay : 600),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -(height + 200),
            duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.35, duration: 1800, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: duration - 1800, useNativeDriver: true }),
          ]),
        ]),
      ]).start(() => animate(false));
    };
    animate(true);
  }, []);

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left,
        bottom: -size,
        fontSize: size,
        color: '#FFA726',
        opacity,
        transform: [{ translateY }],
      }}>
      ❤
    </Animated.Text>
  );
}

export default function HeartBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {HEARTS.map((h, i) => (
        <FloatingHeart key={i} {...h} />
      ))}
    </View>
  );
}
