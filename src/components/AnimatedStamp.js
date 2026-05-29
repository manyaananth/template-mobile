import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

export default function AnimatedStamp({ text, color }) {
    const [scale] = useState(() => new Animated.Value(0));
    const [rotate] = useState(() => new Animated.Value(-15));

    useEffect(() => {
        Animated.spring(scale, {
            toValue: 1, friction: 4, tension: 80,
            useNativeDriver: true,
        }).start();
        Animated.spring(rotate, {
            toValue: -8, useNativeDriver: true,
        }).start();
    }, []);

    const rotateStr = rotate.interpolate({
        inputRange: [-15, 0],
        outputRange: ['-15deg', '0deg'],
    });

    return (
        <Animated.Text style={[
            styles.stamp,
            { color, borderColor: color, transform: [{ scale }, { rotate: rotateStr }] }
        ]}>
            {text}
        </Animated.Text>
    );
}

const styles = StyleSheet.create({
    stamp: {
        fontSize: 52, fontWeight: '900',
        letterSpacing: 4, borderWidth: 5,
        borderRadius: 12, paddingHorizontal: 20,
        paddingVertical: 8, textAlign: 'center',
    }
});