import React, { useEffect, useRef, useState } from 'react';
import {
    Text, StyleSheet, Animated, View, ScrollView
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../context/GameContext';
import { useFirebaseRoom, updatePhase } from '../hooks/useFirebaseRoom';
import AnimatedStamp from '../components/AnimatedStamp';
import Confetti from '../components/Confetti';

export default function RevealScreen({ navigation, route }) {
    const { roomCode } = route.params;
    const { theme, player, isDark } = useGame();
    const [room, setRoom] = useState(null);
    const [showStamp, setShowStamp] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [countdown, setCountdown] = useState(6);
    const [barWidths, setBarWidths] = useState({});
    const doneRef = useRef(false);
    const [shake] = useState(() => new Animated.Value(0));
    const [scale] = useState(() => new Animated.Value(0.5));
    const [fadeIn] = useState(() => new Animated.Value(0));

    useFirebaseRoom(roomCode, (data) => {
        if (!data) return;
        setRoom(data);
    });

    useEffect(() => {
        if (room?.phase === 'scoreboard') {
            navigation.navigate('Scoreboard', { roomCode });
        }
    }, [room?.phase]);

    useEffect(() => {
        if (!room?.eliminated || doneRef.current) return;
        doneRef.current = true;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});

        // Entrance animation
        Animated.parallel([
            Animated.spring(scale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
            Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();

        // Shake + stamp after 1.5s
        setTimeout(() => {
            Animated.sequence([
                ...Array(5).fill(null).map((_, i) =>
                    Animated.timing(shake, {
                        toValue: i % 2 === 0 ? 14 : -14, duration: 60, useNativeDriver: true,
                    })
                ),
                Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
            ]).start();
            setShowStamp(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        }, 1200);

        // Show confetti for positive outcomes
        setTimeout(() => setShowConfetti(true), 1400);
        setTimeout(() => setShowConfetti(false), 4000);

        // Animate vote bars
        setTimeout(() => {
            const tally = room.tally || {};
            const max = Math.max(...Object.values(tally), 1);
            const widths = {};
            Object.entries(tally).forEach(([uid, count]) => {
                widths[uid] = count / max;
            });
            setBarWidths(widths);
        }, 800);

        // Scoring already done in Firebase hooks — host just advances to scoreboard
        const isPlayerHost = room.hostId === player?.uid;
        if (isPlayerHost) {
            setTimeout(async () => {
                await updatePhase(roomCode, 'scoreboard');
            }, 5500);
        }
    }, [room?.eliminated]);

    if (!room) return null;

    const isPlayerHost = room.hostId === player?.uid;
    const eliminatedUID = room.eliminated;
    const eliminatedPlayer = room.players?.[eliminatedUID];
    const imposterUIDs = Object.entries(room.roles || {})
        .filter(([, v]) => v.role === 'imposter')
        .map(([uid]) => uid);
    const isImposterCaught = imposterUIDs.includes(eliminatedUID);
    const isTie = eliminatedUID === 'tie';
    const imposterGuessedCorrectly = room.imposterGuessCorrect === true;

    // Determine outcome
    let outcomeText = '';
    let outcomeEmoji = '';
    if (isTie) {
        outcomeText = 'No one eliminated. The Imposter escapes! 😈';
        outcomeEmoji = '🤝';
    } else if (isImposterCaught && imposterGuessedCorrectly) {
        outcomeText = `🎯 IMPOSTER ESCAPES! ${eliminatedPlayer?.name} guessed the word "${room.word}"!`;
        outcomeEmoji = '🕵️';
    } else if (isImposterCaught) {
        outcomeText = `✅ PLAYERS WIN! ${room.imposterGuess ? `Imposter guessed "${room.imposterGuess}" — WRONG!` : 'Imposter caught!'}`;
        outcomeEmoji = '🎉';
    } else {
        outcomeText = `❌ Imposter WINS! The real imposter was ${room.players?.[imposterUIDs[0]]?.name}.`;
        outcomeEmoji = '😈';
    }

    const tally = room.tally || room.finalVotes
        ? (() => {
            const t = {};
            Object.values(room.finalVotes || {}).forEach(v => { t[v] = (t[v] || 0) + 1; });
            return t;
        })()
        : {};

    const sortedTally = Object.entries(tally).sort(([, a], [, b]) => b - a);
    const maxVotes = Math.max(...Object.values(tally), 1);

    return (
        <LinearGradient
            colors={isDark
                ? (isImposterCaught && !imposterGuessedCorrectly ? ['#0D0D0D', '#002200'] : ['#1A0800', '#0D0D0D'])
                : (isImposterCaught && !imposterGuessedCorrectly ? ['#E5FFE5', '#F5F5F5'] : ['#FFE5E5', '#F5F5F5'])
            }
            style={styles.container}
        >
            {showConfetti && (
                <Confetti visible={!isTie && isImposterCaught && !imposterGuessedCorrectly} />
            )}

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <Text style={[styles.label, { color: theme.textSub }]}>
                    {isTie ? "IT'S A TIE!" : 'THE VOTE IS IN...'}
                </Text>

                {/* ── Eliminated player card ── */}
                {!isTie && eliminatedPlayer && (
                    <Animated.View style={[styles.playerBox, {
                        transform: [{ scale }, { translateX: shake }],
                        opacity: fadeIn,
                        backgroundColor: theme.card,
                        borderColor: isImposterCaught ? theme.primary : theme.success,
                    }]}>
                        <Text style={styles.bigEmoji}>{eliminatedPlayer.avatar || '🕵️'}</Text>
                        <Text style={[styles.playerName, { color: theme.text }]}>
                            {eliminatedPlayer.name}
                        </Text>
                        {showStamp && (
                            <AnimatedStamp
                                text={isImposterCaught ? 'IMPOSTER!' : 'INNOCENT!'}
                                color={isImposterCaught ? theme.primary : theme.success}
                            />
                        )}
                    </Animated.View>
                )}

                {isTie && showStamp && (
                    <AnimatedStamp text="TIE!" color={theme.warning} />
                )}

                {/* ── Outcome text ── */}
                <Text style={[styles.outcome, { color: theme.text }]}>{outcomeText}</Text>

                {/* ── Vote bar chart ── */}
                {sortedTally.length > 0 && (
                    <View style={[styles.votesSection, { backgroundColor: theme.card }]}>
                        <Text style={[styles.votesTitle, { color: theme.textSub }]}>VOTE BREAKDOWN</Text>
                        {sortedTally.map(([uid, count]) => {
                            const p = room.players?.[uid];
                            const isImp = imposterUIDs.includes(uid);
                            const barPct = (barWidths[uid] || 0) * 100;
                            return (
                                <View key={uid} style={styles.voteRow}>
                                    <Text style={styles.voteAvatar}>{p?.avatar || '🦊'}</Text>
                                    <View style={styles.voteBarContainer}>
                                        <Text style={[styles.voteName, { color: theme.text }]}>
                                            {p?.name} {isImp ? '🕵️' : ''}
                                        </Text>
                                        <View style={[styles.voteTrack, { backgroundColor: theme.border }]}>
                                            <Animated.View style={[styles.voteBar, {
                                                width: `${barPct}%`,
                                                backgroundColor: isImp ? theme.primary : theme.success,
                                            }]} />
                                        </View>
                                    </View>
                                    <Text style={[styles.voteCount, { color: theme.text }]}>{count}</Text>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* ── Secret word reveal ── */}
                {room.word && (
                    <View style={[styles.wordReveal, { backgroundColor: theme.card }]}>
                        <Text style={[styles.wordRevealLabel, { color: theme.textSub }]}>THE SECRET WORD WAS</Text>
                        <Text style={[styles.wordRevealText, { color: theme.primary }]}>{room.word}</Text>
                    </View>
                )}

                <Text style={[styles.goingTo, { color: theme.textSub }]}>
                    Heading to scoreboard in 5s...
                </Text>
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 24, alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
    label: { fontSize: 14, letterSpacing: 4, fontWeight: '600', marginBottom: 24 },
    playerBox: {
        width: '85%', padding: 32, borderRadius: 24,
        borderWidth: 3, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4, shadowRadius: 20, elevation: 20,
        marginBottom: 24,
    },
    bigEmoji: { fontSize: 72, marginBottom: 12 },
    playerName: { fontSize: 30, fontWeight: '900', marginBottom: 8 },
    outcome: { fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 26, marginBottom: 24 },
    votesSection: { width: '100%', borderRadius: 16, padding: 16, marginBottom: 16 },
    votesTitle: { fontSize: 11, letterSpacing: 3, fontWeight: '600', marginBottom: 12 },
    voteRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    voteAvatar: { fontSize: 22, width: 32 },
    voteBarContainer: { flex: 1, marginHorizontal: 8 },
    voteName: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
    voteTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
    voteBar: { height: 10, borderRadius: 5 },
    voteCount: { fontSize: 16, fontWeight: '900', width: 24, textAlign: 'right' },
    wordReveal: { width: '100%', borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center' },
    wordRevealLabel: { fontSize: 11, letterSpacing: 3, fontWeight: '600', marginBottom: 8 },
    wordRevealText: { fontSize: 32, fontWeight: '900' },
    goingTo: { fontSize: 12, marginTop: 8, letterSpacing: 1 },
});