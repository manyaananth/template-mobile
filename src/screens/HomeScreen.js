import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Animated, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../context/GameContext';
import ThemeToggle from '../components/ThemeToggle';

// Floating spy emojis in background
const FLOAT_EMOJIS = ['🕵️', '🔍', '❓', '🕵️', '🎭', '🔐', '🎯', '🕵️'];

function FloatingEmoji({ emoji, delay, startX, isDark }) {
    const y = useState(() => new Animated.Value(0))[0];
    const opacity = useState(() => new Animated.Value(0))[0];

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 0.15, duration: 1000, useNativeDriver: true }),
                    Animated.timing(y, { toValue: -60, duration: 4000, useNativeDriver: true }),
                ]),
                Animated.parallel([
                    Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
                ]),
                Animated.timing(y, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    return (
        <Animated.Text style={[styles.floatEmoji, { left: startX, opacity, transform: [{ translateY: y }] }]}>
            {emoji}
        </Animated.Text>
    );
}

export default function HomeScreen({ navigation }) {
    const { theme, isDark, player } = useGame();
    const [pulse] = useState(() => new Animated.Value(1));
    const [fadeIn] = useState(() => new Animated.Value(0));

    useEffect(() => {
        Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.06, duration: 900, useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    const goCreate = () => {
        if (!player) navigation.navigate('Auth', { next: 'CreateRoom' });
        else navigation.navigate('CreateRoom');
    };
    const goJoin = () => {
        if (!player) navigation.navigate('Auth', { next: 'JoinRoom' });
        else navigation.navigate('JoinRoom');
    };

    return (
        <LinearGradient
            colors={isDark ? ['#0D0D0D', '#1A0000', '#0D0D0D'] : ['#F5F5F5', '#FFE5E5', '#F5F5F5']}
            style={styles.container}
        >
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <ThemeToggle />

            {/* ── Floating background emojis ── */}
            {FLOAT_EMOJIS.map((em, i) => (
                <FloatingEmoji
                    key={i} emoji={em}
                    delay={i * 600}
                    startX={`${10 + (i * 11)}%`}
                    isDark={isDark}
                />
            ))}

            <Animated.View style={[styles.hero, { opacity: fadeIn }]}>
                <Text style={styles.topBadge}>🕵️ SOCIAL DEDUCTION GAME</Text>

                <Animated.Text style={[styles.title, {
                    color: theme.primary,
                    transform: [{ scale: pulse }]
                }]}>
                    IMPOSTER
                </Animated.Text>

                <Text style={[styles.subtitle, { color: theme.textSub }]}>
                    {"WHO DOESN'T BELONG?"}
                </Text>
            </Animated.View>

            <View style={styles.buttons}>
                <TouchableOpacity
                    onPress={goCreate}
                    style={[styles.btnPrimary, { backgroundColor: theme.primary }]}
                    activeOpacity={0.85}
                >
                    <Text style={styles.btnPrimaryText}>🎮 CREATE ROOM</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={goJoin}
                    style={[styles.btnSecondary, {
                        borderColor: theme.primary, backgroundColor: 'transparent'
                    }]}
                    activeOpacity={0.85}
                >
                    <Text style={[styles.btnSecondaryText, { color: theme.primary }]}>
                        🚪 JOIN ROOM
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => navigation.navigate('HowToPlay')}
                    style={styles.howToBtn}
                >
                    <Text style={[styles.howToText, { color: theme.textSub }]}>
                        ❓ How to Play
                    </Text>
                </TouchableOpacity>

                {!player && (
                    <TouchableOpacity onPress={() => navigation.navigate('Auth', { next: null })}>
                        <Text style={[styles.loginLink, { color: theme.textSub }]}>
                            Sign in for saved scores →
                        </Text>
                    </TouchableOpacity>
                )}
                {player && (
                    <View style={styles.welcomeRow}>
                        <Text style={styles.welcomeAvatar}>{player.avatar || '👤'}</Text>
                        <Text style={[styles.welcome, { color: theme.textSub }]}>{player.name}</Text>
                    </View>
                )}
            </View>

            {/* Grid dot pattern */}
            <View style={[styles.gridOverlay, { opacity: isDark ? 0.06 : 0.04 }]}>
                {Array.from({ length: 200 }).map((_, i) => (
                    <View key={i} style={[styles.dot, { backgroundColor: theme.text }]} />
                ))}
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    floatEmoji: { position: 'absolute', bottom: 120, fontSize: 28, zIndex: 0 },
    hero: { alignItems: 'center', marginBottom: 48, zIndex: 1 },
    topBadge: {
        fontSize: 11, letterSpacing: 2, fontWeight: '600',
        color: '#E8232A', marginBottom: 12,
    },
    title: {
        fontSize: 68, fontWeight: '900',
        letterSpacing: 6, textAlign: 'center',
    },
    subtitle: {
        fontSize: 16, fontWeight: '600',
        letterSpacing: 4, marginTop: 8,
    },
    statsBadge: {
        marginTop: 16, paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20,
    },
    statsText: { fontSize: 12 },
    buttons: { width: '80%', alignItems: 'center', gap: 12, zIndex: 1 },
    btnPrimary: {
        width: '100%', paddingVertical: 18,
        borderRadius: 16, alignItems: 'center',
        shadowColor: '#E8232A', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4, shadowRadius: 20, elevation: 12,
    },
    btnPrimaryText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
    btnSecondary: {
        width: '100%', paddingVertical: 18,
        borderRadius: 16, borderWidth: 2, alignItems: 'center',
    },
    btnSecondaryText: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
    howToBtn: { paddingVertical: 8 },
    howToText: { fontSize: 15, fontWeight: '600' },
    loginLink: { marginTop: 4, fontSize: 13, textDecorationLine: 'underline' },
    welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    welcomeAvatar: { fontSize: 22 },
    welcome: { fontSize: 14 },
    gridOverlay: {
        position: 'absolute', flexDirection: 'row',
        flexWrap: 'wrap', width: '100%', height: '100%', zIndex: 0,
    },
    dot: { width: 2, height: 2, borderRadius: 1, margin: 14 },
});