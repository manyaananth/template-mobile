import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    TextInput, ScrollView, KeyboardAvoidingView,
    Platform, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useGame } from '../context/GameContext';
import { useFirebaseRoom, submitClueAndAdvance, skipTurn } from '../hooks/useFirebaseRoom';

const CLUE_SECONDS = 15;

export default function ClueGivingScreen({ navigation, route }) {
    const { roomCode } = route.params;
    const { theme, player, isDark } = useGame();
    const [room, setRoom] = useState(null);
    const [clueText, setClueText] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(CLUE_SECONDS);
    const timerRef = useRef(null);
    const hasSkipped = useRef(false);
    const [pulseAnim] = useState(() => new Animated.Value(1));
    const [slideIn] = useState(() => new Animated.Value(50));
    const [fadeIn] = useState(() => new Animated.Value(0));

    useFirebaseRoom(roomCode, (data) => {
        if (!data) return;
        setRoom(data);
        if (data.phase === 'discussion') navigation.navigate('Discussion', { roomCode });
        if (data.phase === 'voting') navigation.navigate('Voting', { roomCode });
        if (data.phase === 'reveal') navigation.navigate('Reveal', { roomCode });
    });

    const turnOrder = room?.turnOrder || [];
    const currentIdx = room?.currentTurnIndex ?? 0;
    const currentTurnUID = turnOrder[currentIdx];
    const isMyTurn = currentTurnUID === player?.uid;
    const myRole = room?.roles?.[player?.uid];
    const isImposter = myRole?.role === 'imposter';
    const secretWord = myRole?.word;
    const players = room?.players || {};
    const totalTurns = turnOrder.length;
    const completedTurns = Math.min(currentIdx, totalTurns);
    const clues = room?.clues || {};

    // Entrance animation on turn change
    useEffect(() => {
        slideIn.setValue(40);
        fadeIn.setValue(0);
        Animated.parallel([
            Animated.spring(slideIn, { toValue: 0, friction: 7, tension: 80, useNativeDriver: true }),
            Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]).start();
    }, [currentIdx]);

    // Pulse when it's your turn
    useEffect(() => {
        if (!isMyTurn) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [isMyTurn, currentIdx]);

    // Per-turn countdown timer
    useEffect(() => {
        if (!room || submitted) return;
        const startTime = room.clueStartTime || Date.now();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, CLUE_SECONDS - elapsed);
        setSecondsLeft(remaining);
        hasSkipped.current = false;

        if (remaining === 0) { handleTimeout(); return; }

        timerRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [currentIdx, room?.clueStartTime]);

    const handleTimeout = async () => {
        if (hasSkipped.current) return;
        hasSkipped.current = true;
        if (isMyTurn) {
            await skipTurn(roomCode);
        }
    };

    const handleSubmitClue = async () => {
        if (!clueText.trim() || submitted || !isMyTurn) return;
        setSubmitted(true);
        clearInterval(timerRef.current);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await submitClueAndAdvance(roomCode, player.uid, clueText.trim(), totalTurns);
        setClueText('');
        setSubmitted(false);
    };

    if (!room) return null;

    const currentPlayerName = players[currentTurnUID]?.name || '?';
    const currentPlayerAvatar = players[currentTurnUID]?.avatar || '🦊';
    const timerPct = secondsLeft / CLUE_SECONDS;
    const timerColor = secondsLeft > 8 ? theme.success : secondsLeft > 4 ? theme.warning : theme.danger;

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <LinearGradient
                colors={isDark ? ['#0D0D0D', '#1A0000'] : ['#F5F5F5', '#FFE5E5']}
                style={styles.container}
            >
                {/* ── Header ── */}
                <View style={styles.header}>
                    <Text style={[styles.phase, { color: theme.textSub }]}>CLUE GIVING</Text>
                    <Text style={[styles.progress, { color: theme.textSub }]}>
                        {completedTurns}/{totalTurns} players done
                    </Text>
                </View>

                {/* ── Turn progress bar ── */}
                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                    <Animated.View style={[styles.progressFill, {
                        width: `${(completedTurns / Math.max(totalTurns, 1)) * 100}%`,
                        backgroundColor: theme.primary,
                    }]} />
                </View>

                {/* ── Timer bar ── */}
                <View style={[styles.timerTrack, { backgroundColor: theme.border }]}>
                    <View style={[styles.timerFill, { width: `${timerPct * 100}%`, backgroundColor: timerColor }]} />
                </View>
                <Text style={[styles.timerText, { color: timerColor }]}>{secondsLeft}s</Text>

                {/* ── Current player card ── */}
                <Animated.View style={[
                    styles.turnCard,
                    {
                        backgroundColor: isMyTurn ? theme.primary : theme.card,
                        borderColor: isMyTurn ? theme.primary : theme.border,
                        opacity: fadeIn,
                        transform: [{ translateY: slideIn }, { scale: isMyTurn ? pulseAnim : 1 }],
                    }
                ]}>
                    <Text style={styles.turnEmoji}>{currentPlayerAvatar}</Text>
                    <Text style={[styles.turnName, { color: isMyTurn ? '#fff' : theme.text }]}>
                        {isMyTurn ? 'YOUR TURN!' : `${currentPlayerName}'s turn`}
                    </Text>

                    {isMyTurn && (
                        <View style={styles.myTurnContent}>
                            {isImposter ? (
                                <View style={[styles.wordBox, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                                    <Text style={[styles.wordLabel, { color: 'rgba(255,255,255,0.7)' }]}>
                                        YOU'RE THE IMPOSTER 🕵️
                                    </Text>
                                    <Text style={[styles.wordHint, { color: 'rgba(255,255,255,0.9)' }]}>
                                        Listen carefully and blend in!
                                    </Text>
                                </View>
                            ) : (
                                <View style={[styles.wordBox, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                                    <Text style={[styles.wordLabel, { color: 'rgba(255,255,255,0.7)' }]}>
                                        THE WORD IS
                                    </Text>
                                    <Text style={[styles.wordReveal, { color: '#fff' }]}>{secretWord}</Text>
                                </View>
                            )}

                            <TextInput
                                style={[styles.clueInput, {
                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                    color: '#fff',
                                    borderColor: 'rgba(255,255,255,0.3)',
                                }]}
                                placeholder={isImposter
                                    ? "Give a vague clue... blend in!"
                                    : `Give a clue about "${secretWord}"...`}
                                placeholderTextColor="rgba(255,255,255,0.5)"
                                value={clueText}
                                onChangeText={setClueText}
                                maxLength={60}
                                autoFocus
                                returnKeyType="done"
                                onSubmitEditing={handleSubmitClue}
                            />
                            <TouchableOpacity
                                style={[styles.submitBtn, {
                                    backgroundColor: clueText.trim() ? '#fff' : 'rgba(255,255,255,0.3)'
                                }]}
                                onPress={handleSubmitClue}
                                disabled={!clueText.trim() || submitted}
                            >
                                <Text style={[styles.submitBtnText, {
                                    color: clueText.trim() ? theme.primary : 'rgba(255,255,255,0.5)'
                                }]}>
                                    {submitted ? 'Submitted ✓' : 'SUBMIT CLUE →'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {!isMyTurn && (
                        <Text style={[styles.watchText, { color: theme.textSub }]}>
                            👂 Listen carefully...
                        </Text>
                    )}
                </Animated.View>

                {/* ── Clues given so far ── */}
                {Object.keys(clues).length > 0 && (
                    <View style={styles.cluesList}>
                        <Text style={[styles.cluesLabel, { color: theme.textSub }]}>CLUES GIVEN</Text>
                        <ScrollView style={{ maxHeight: 120 }} showsVerticalScrollIndicator={false}>
                            {Object.entries(clues).map(([uid, clue]) => (
                                <View key={uid} style={[styles.clueRow, { backgroundColor: theme.card }]}>
                                    <Text style={styles.clueAvatar}>{players[uid]?.avatar || '🦊'}</Text>
                                    <Text style={[styles.clueText, { color: theme.text }]}>
                                        <Text style={{ fontWeight: '700' }}>{players[uid]?.name}: </Text>
                                        {clue}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* ── Player queue ── */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.queue}>
                    {turnOrder.map((uid, idx) => {
                        const p = players[uid];
                        const isDone = idx < currentIdx;
                        const isCurrent = idx === currentIdx;
                        return (
                            <View key={uid} style={[styles.queueItem, {
                                opacity: isDone ? 0.4 : 1,
                                backgroundColor: isCurrent ? theme.primary : theme.card,
                                borderColor: isCurrent ? theme.primary : theme.border,
                            }]}>
                                <Text style={styles.queueAvatar}>{p?.avatar || '🦊'}</Text>
                                {isDone && <Text style={styles.queueDone}>✓</Text>}
                            </View>
                        );
                    })}
                </ScrollView>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, paddingTop: 52 },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    phase: { fontSize: 12, letterSpacing: 3, fontWeight: '700' },
    progress: { fontSize: 12 },
    progressTrack: { height: 4, borderRadius: 2, marginBottom: 8, overflow: 'hidden' },
    progressFill: { height: 4, borderRadius: 2 },
    timerTrack: { height: 6, borderRadius: 3, marginBottom: 4, overflow: 'hidden' },
    timerFill: { height: 6, borderRadius: 3 },
    timerText: { fontSize: 13, fontWeight: '700', textAlign: 'right', marginBottom: 16 },
    turnCard: {
        borderRadius: 24, borderWidth: 2, padding: 24,
        alignItems: 'center', marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2, shadowRadius: 16, elevation: 10,
    },
    turnEmoji: { fontSize: 52, marginBottom: 8 },
    turnName: { fontSize: 22, fontWeight: '900', marginBottom: 12 },
    myTurnContent: { width: '100%', alignItems: 'center' },
    wordBox: {
        borderRadius: 12, padding: 14, alignItems: 'center',
        marginBottom: 16, width: '100%',
    },
    wordLabel: { fontSize: 11, letterSpacing: 3, fontWeight: '600', marginBottom: 4 },
    wordReveal: { fontSize: 28, fontWeight: '900' },
    wordHint: { fontSize: 14, fontStyle: 'italic' },
    clueInput: {
        width: '100%', borderRadius: 12, borderWidth: 1.5,
        padding: 14, fontSize: 16, marginBottom: 12,
    },
    submitBtn: {
        width: '100%', padding: 14, borderRadius: 12, alignItems: 'center',
    },
    submitBtnText: { fontSize: 16, fontWeight: '900' },
    watchText: { fontSize: 15, marginTop: 4 },
    cluesList: { marginBottom: 12 },
    cluesLabel: { fontSize: 11, letterSpacing: 3, fontWeight: '600', marginBottom: 6 },
    clueRow: {
        flexDirection: 'row', alignItems: 'center',
        padding: 10, borderRadius: 10, marginBottom: 6,
    },
    clueAvatar: { fontSize: 18, marginRight: 8 },
    clueText: { flex: 1, fontSize: 14 },
    queue: { flexDirection: 'row' },
    queueItem: {
        width: 52, height: 52, borderRadius: 26, marginRight: 8,
        borderWidth: 2, alignItems: 'center', justifyContent: 'center',
        position: 'relative',
    },
    queueAvatar: { fontSize: 24 },
    queueDone: {
        position: 'absolute', bottom: -2, right: -2,
        fontSize: 12, backgroundColor: '#2ECC71',
        width: 18, height: 18, borderRadius: 9,
        textAlign: 'center', lineHeight: 18, color: '#fff',
    },
});
