import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { useGame } from '../context/GameContext';

export default function TimerBar({ seconds, total }) {
    const { theme } = useGame();
    const [anim] = useState(() => new Animated.Value(seconds / total));

    useEffect(() => {
        Animated.timing(anim, {
            toValue: seconds / total,
            duration: 900,
            useNativeDriver: false,
        }).start();
    }, [seconds]);

    const color = seconds > total * 0.5
        ? theme.success
        : seconds > total * 0.2
            ? theme.warning
            : theme.danger;

    const width = anim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={[styles.track, { backgroundColor: theme.border }]}>
            <Animated.View style={[styles.fill, { width, backgroundColor: color }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    track: { height: 8, borderRadius: 4, overflow: 'hidden', marginHorizontal: 20 },
    fill: { height: 8, borderRadius: 4 },
});