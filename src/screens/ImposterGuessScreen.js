import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    Animated, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useGame } from '../context/GameContext';
import { useFirebaseRoom, submitImposterGuess, resolveExpiredGuess } from '../hooks/useFirebaseRoom';

const GUESS_SECONDS = 20;

export default function ImposterGuessScreen({ navigation, route }) {
    const { roomCode } = route.params;
    const { theme, player, isDark } = useGame();
    const [room, setRoom] = useState(null);
    const [guess, setGuess] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(GUESS_SECONDS);
    const timerRef = useRef(null);
    const hasExpired = useRef(false);
    const [shakeAnim] = useState(() => new Animated.Value(0));
    const [fadeIn] = useState(() => new Animated.Value(0));

    useFirebaseRoom(roomCode, (data) => {
        if (!data) return;
        setRoom(data);
        if (data.phase === 'reveal') navigation.navigate('Reveal', { roomCode });
    });

    const eliminatedUID = room?.eliminated;
    const isImposter = eliminatedUID === player?.uid;
    const eliminatedPlayer = room?.players?.[eliminatedUID];
    const players = room?.players || {};
    const roles = room?.roles || {};
    const imposterUIDs = Object.entries(roles).filter(([, v]) => v.role === 'imposter').map(([uid]) => uid);

    useEffect(() => {
        Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        // Shake entrance
        setTimeout(() => {
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
            ]).start();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        }, 300);
    }, []);

    // Countdown timer
    useEffect(() => {
        if (!room?.guessDeadline) return;
        const remaining = Math.max(0, Math.ceil((room.guessDeadline - Date.now()) / 1000));
        setSecondsLeft(remaining);

        timerRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    if (!hasExpired.current) {
                        hasExpired.current = true;
                        // Only HOST resolves expiry → scores players_win + moves to reveal
                        const isHost = room?.hostId === player?.uid;
                        if (isHost) {
                            resolveExpiredGuess(roomCode);
                        }
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [room?.guessDeadline]);

    const handleSubmit = async () => {
        if (!guess.trim() || submitted || !isImposter) return;
        setSubmitted(true);
        clearInterval(timerRef.current);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await submitImposterGuess(roomCode, guess.trim());
    };

    if (!room) return null;

    const timerPct = secondsLeft / GUESS_SECONDS;
    const timerColor = secondsLeft > 10 ? theme.warning : theme.danger;

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <LinearGradient
                colors={isDark ? ['#1A0800', '#0D0D0D'] : ['#FFF3E0', '#F5F5F5']}
                style={styles.container}
            >
                <Animated.View style={[styles.content, { opacity: fadeIn }]}>

                    {/* ── Caught badge ── */}
                    <Animated.View style={[styles.caughtBadge, { transform: [{ translateX: shakeAnim }] }]}>
                        <Text style={styles.caughtEmoji}>🚨</Text>
                        <Text style={[styles.caughtTitle, { color: theme.danger }]}>IMPOSTER CAUGHT!</Text>
                    </Animated.View>

                    {/* ── Eliminated player ── */}
                    {eliminatedPlayer && (
                        <View style={[styles.playerCard, { backgroundColor: theme.card, borderColor: theme.danger }]}>
                            <Text style={styles.playerEmoji}>{eliminatedPlayer.avatar || '🕵️'}</Text>
                            <Text style={[styles.playerName, { color: theme.text }]}>
                                {eliminatedPlayer.name}
                            </Text>
                            <Text style={[styles.playerRole, { color: theme.danger }]}>THE IMPOSTER</Text>
                        </View>
                    )}

                    {/* ── Last chance description ── */}
                    <View style={[styles.descBox, { backgroundColor: theme.card }]}>
                        <Text style={[styles.descTitle, { color: theme.text }]}>
                            ⚡ Last Chance, Imposter!
                        </Text>
                        <Text style={[styles.descText, { color: theme.textSub }]}>
                            {isImposter
                                ? "Guess the secret word correctly and you still WIN!\nWrong guess? Players take the points."
                                : "The imposter has one last chance to guess the secret word.\nIf they get it right, they still win!"}
                        </Text>
                    </View>

                    {/* ── Timer ── */}
                    <View style={[styles.timerTrack, { backgroundColor: theme.border }]}>
                        <View style={[styles.timerFill, {
                            width: `${timerPct * 100}%`,
                            backgroundColor: timerColor,
                        }]} />
                    </View>
                    <Text style={[styles.timerText, { color: timerColor }]}>
                        {secondsLeft}s remaining
                    </Text>

                    {/* ── Guess input (imposter only) ── */}
                    {isImposter && !submitted && (
                        <>
                            <TextInput
                                style={[styles.guessInput, {
                                    backgroundColor: theme.card,
                                    color: theme.text,
                                    borderColor: theme.warning,
                                }]}
                                placeholder="Type the secret word..."
                                placeholderTextColor={theme.textSub}
                                value={guess}
                                onChangeText={setGuess}
                                autoFocus
                                autoCapitalize="words"
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                                maxLength={40}
                            />
                            <TouchableOpacity
                                style={[styles.guessBtn, {
                                    backgroundColor: guess.trim() ? theme.warning : theme.border
                                }]}
                                onPress={handleSubmit}
                                disabled={!guess.trim()}
                            >
                                <Text style={styles.guessBtnText}>🎯 SUBMIT GUESS</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {isImposter && submitted && (
                        <View style={[styles.waitBox, { backgroundColor: theme.card }]}>
                            <Text style={[styles.waitText, { color: theme.textSub }]}>
                                Guess submitted! Revealing result...
                            </Text>
                        </View>
                    )}

                    {!isImposter && (
                        <View style={[styles.watchBox, { backgroundColor: theme.card }]}>
                            <Text style={[styles.watchText, { color: theme.textSub }]}>
                                😰 Hold your breath... will they guess it?
                            </Text>
                        </View>
                    )}
                </Animated.View>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, justifyContent: 'center' },
    content: { alignItems: 'center' },
    caughtBadge: { alignItems: 'center', marginBottom: 20 },
    caughtEmoji: { fontSize: 56, marginBottom: 8 },
    caughtTitle: { fontSize: 28, fontWeight: '900', letterSpacing: 2 },
    playerCard: {
        borderRadius: 20, borderWidth: 2, padding: 20,
        alignItems: 'center', marginBottom: 20, width: '90%',
    },
    playerEmoji: { fontSize: 48, marginBottom: 8 },
    playerName: { fontSize: 24, fontWeight: '900' },
    playerRole: { fontSize: 14, fontWeight: '700', letterSpacing: 2, marginTop: 4 },
    descBox: {
        borderRadius: 16, padding: 16, marginBottom: 20,
        width: '100%',
    },
    descTitle: { fontSize: 18, fontWeight: '900', marginBottom: 6 },
    descText: { fontSize: 14, lineHeight: 20 },
    timerTrack: { height: 8, borderRadius: 4, width: '100%', marginBottom: 6, overflow: 'hidden' },
    timerFill: { height: 8, borderRadius: 4 },
    timerText: { fontSize: 14, fontWeight: '700', marginBottom: 20 },
    guessInput: {
        width: '100%', borderRadius: 14, borderWidth: 2,
        padding: 16, fontSize: 20, fontWeight: '700',
        textAlign: 'center', marginBottom: 12,
    },
    guessBtn: {
        width: '100%', padding: 18, borderRadius: 14,
        alignItems: 'center',
    },
    guessBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
    waitBox: { padding: 16, borderRadius: 14, width: '100%', alignItems: 'center' },
    waitText: { fontSize: 15 },
    watchBox: { padding: 16, borderRadius: 14, width: '100%', alignItems: 'center' },
    watchText: { fontSize: 15 },
});
