import React, { useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    Animated
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGame } from '../context/GameContext';
import { useFirebaseRoom, markReady } from '../hooks/useFirebaseRoom';
import { LinearGradient } from 'expo-linear-gradient';

export default function RoleRevealScreen({ navigation, route }) {
    const { roomCode } = route.params;
    const { theme, player, isDark } = useGame();
    const [room, setRoom] = useState(null);
    const [revealed, setRevealed] = useState(false);
    const [ready, setReady] = useState(false);
    const holdTimer = useRef(null);
    const [holdProgress] = useState(() => new Animated.Value(0));

    useFirebaseRoom(roomCode, (data) => {
        if (!data) return;
        setRoom(data);
        if (data.phase === 'clueGiving') {
            navigation.navigate('ClueGiving', { roomCode });
        }
        if (data.phase === 'discussion') {
            navigation.navigate('Discussion', { roomCode });
        }
    });

    const myRole = room?.roles?.[player?.uid];
    const isImposter = myRole?.role === 'imposter';
    const totalPlayers = room?.players ? Object.keys(room.players).length : 0;

    const holdWidth = holdProgress.interpolate({
        inputRange: [0, 1], outputRange: ['0%', '100%'],
    });

    const onPressIn = () => {
        holdProgress.setValue(0);
        Animated.timing(holdProgress, {
            toValue: 1, duration: 1500, useNativeDriver: false,
        }).start();
        holdTimer.current = setTimeout(async () => {
            setRevealed(true);
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 1500);
    };

    const onPressOut = () => {
        clearTimeout(holdTimer.current);
        if (!revealed) {
            holdProgress.setValue(0);
        }
    };

    const handleReady = async () => {
        if (ready || totalPlayers === 0) return;
        setReady(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Every player increments readyCount; when all ready, phase advances to discussion
        await markReady(roomCode, totalPlayers);
    };

    return (
        <LinearGradient
            colors={isDark ? ['#0D0D0D', '#1A0000'] : ['#F5F5F5', '#FFE5E5']}
            style={styles.container}
        >
            <Text style={[styles.title, { color: theme.text }]}>Your Role</Text>
            <Text style={[styles.sub, { color: theme.textSub }]}>
                {"Hold the card to reveal. Don't show others!"}
            </Text>

            <TouchableOpacity
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                activeOpacity={1}
                style={[styles.card, {
                    backgroundColor: revealed
                        ? (isImposter ? theme.primary : theme.card)
                        : theme.card,
                    borderColor: theme.border,
                }]}
            >
                {!revealed ? (
                    <View style={styles.hiddenContent}>
                        <Text style={styles.lockEmoji}>🔒</Text>
                        <Text style={[styles.holdText, { color: theme.textSub }]}>HOLD TO REVEAL</Text>
                        <View style={[styles.holdTrack, { backgroundColor: theme.border }]}>
                            <Animated.View style={[styles.holdFill, {
                                width: holdWidth, backgroundColor: theme.primary,
                            }]} />
                        </View>
                    </View>
                ) : (
                    <View style={styles.revealedContent}>
                        <Text style={styles.roleEmoji}>
                            {isImposter ? '🕵️' : '👤'}
                        </Text>
                        <Text style={[styles.roleLabel, {
                            color: isImposter ? '#fff' : theme.primary,
                        }]}>
                            {isImposter ? 'IMPOSTER' : 'PLAYER'}
                        </Text>
                        {!isImposter && (
                            <View style={[styles.wordBox, { backgroundColor: theme.bg }]}>
                                <Text style={[styles.wordLabel, { color: theme.textSub }]}>THE TOPIC IS</Text>
                                <Text style={[styles.word, { color: theme.text }]}>{myRole?.word}</Text>
                            </View>
                        )}
                        {isImposter && (
                            <Text style={[styles.imposterHint, { color: '#FFE5E5' }]}>
                                {"Blend in. Don't get caught."}
                            </Text>
                        )}
                    </View>
                )}
            </TouchableOpacity>

            {revealed && !ready && (
                <TouchableOpacity
                    style={[styles.readyBtn, { backgroundColor: theme.primary }]}
                    onPress={handleReady}
                >
                    <Text style={styles.readyBtnText}>{"I'M READY ✓"}</Text>
                </TouchableOpacity>
            )}
            {ready && (
                <Text style={[styles.waitText, { color: theme.textSub }]}>
                    ⏳ Waiting for others... ({room?.readyCount || 0}/{totalPlayers})
                </Text>
            )}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 32, fontWeight: '900', marginBottom: 8 },
    sub: { fontSize: 13, marginBottom: 40, textAlign: 'center' },
    card: {
        width: '90%', minHeight: 300, borderRadius: 24,
        borderWidth: 2, justifyContent: 'center',
        alignItems: 'center', padding: 32,
        shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3, shadowRadius: 20, elevation: 15,
    },
    hiddenContent: { alignItems: 'center', width: '100%' },
    lockEmoji: { fontSize: 64, marginBottom: 16 },
    holdText: { fontSize: 14, letterSpacing: 3, fontWeight: '700', marginBottom: 20 },
    holdTrack: { width: '80%', height: 6, borderRadius: 3, overflow: 'hidden' },
    holdFill: { height: 6, borderRadius: 3 },
    revealedContent: { alignItems: 'center' },
    roleEmoji: { fontSize: 64, marginBottom: 12 },
    roleLabel: { fontSize: 40, fontWeight: '900', letterSpacing: 4 },
    wordBox: {
        marginTop: 20, padding: 16, borderRadius: 12, alignItems: 'center', width: '100%',
    },
    wordLabel: { fontSize: 11, letterSpacing: 3, fontWeight: '600', marginBottom: 4 },
    word: { fontSize: 28, fontWeight: '900' },
    imposterHint: { fontSize: 16, marginTop: 16, fontStyle: 'italic' },
    readyBtn: { marginTop: 32, paddingVertical: 16, paddingHorizontal: 48, borderRadius: 14 },
    readyBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
    waitText: { marginTop: 32, fontSize: 16 },
});