import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const COLORS = ['#E8232A', '#FFD700', '#2ECC71', '#3498DB', '#9B59B6', '#FF6B35', '#00BCD4', '#FF4081'];
const PARTICLE_COUNT = 40;

function Particle({ color, delay }) {
    const y = useRef(new Animated.Value(-20)).current;
    const x = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const rotate = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0)).current;

    const startX = (Math.random() - 0.5) * 400;
    const endX = startX + (Math.random() - 0.5) * 200;

    useEffect(() => {
        const duration = 1500 + Math.random() * 1000;
        setTimeout(() => {
            Animated.parallel([
                Animated.timing(y, { toValue: 600 + Math.random() * 200, duration, useNativeDriver: true }),
                Animated.timing(x, { toValue: endX, duration, useNativeDriver: true }),
                Animated.sequence([
                    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                    Animated.delay(duration - 400),
                    Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
                ]),
                Animated.timing(rotate, { toValue: Math.random() > 0.5 ? 1 : -1, duration, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 0.5 + Math.random() * 1, duration: 300, useNativeDriver: true }),
            ]).start();
        }, delay);
    }, []);

    const spin = rotate.interpolate({ inputRange: [-1, 1], outputRange: ['-720deg', '720deg'] });
    const isCircle = Math.random() > 0.5;

    return (
        <Animated.View style={[
            styles.particle,
            isCircle ? styles.circle : styles.square,
            {
                backgroundColor: color,
                transform: [
                    { translateX: Animated.add(new Animated.Value(startX), x) },
                    { translateY: y },
                    { rotate: spin },
                    { scale },
                ],
                opacity,
                top: 0,
                left: '50%',
            }
        ]} />
    );
}

export default function Confetti({ visible = true }) {
    if (!visible) return null;
    return (
        <View style={styles.container} pointerEvents="none">
            {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
                <Particle
                    key={i}
                    color={COLORS[i % COLORS.length]}
                    delay={i * 40}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 999,
        overflow: 'hidden',
    },
    particle: {
        position: 'absolute',
        width: 10,
        height: 10,
    },
    circle: { borderRadius: 5 },
    square: { borderRadius: 2 },
});
