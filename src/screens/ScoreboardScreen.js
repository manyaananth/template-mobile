import React, { useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, Animated, useWindowDimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useGame } from '../context/GameContext';
import { useFirebaseRoom, resetToLobby } from '../hooks/useFirebaseRoom';
import Confetti from '../components/Confetti';
import ThemeToggle from '../components/ThemeToggle';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const MEDALS = ['🥇', '🥈', '🥉'];

export default function ScoreboardScreen({ navigation, route }) {
    const { roomCode } = route.params;
    const { theme, player, isDark } = useGame();
    const { height } = useWindowDimensions();
    const [room, setRoom] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [rowAnims, setRowAnims] = useState([]);
    const [crowned] = useState(() => new Animated.Value(0.6));

    useFirebaseRoom(roomCode, (data) => {
        if (!data) return;
        setRoom(data);
        if (data.phase === 'lobby') navigation.navigate('Lobby', { roomCode });
    });

    const isPlayerHost = room?.hostId === player?.uid;
    const roundNumber = room?.roundNumber || 1;

    useEffect(() => {
        if (!room?.players) return;
        const sorted = getSortedPlayers();
        const anims = sorted.map(() => new Animated.Value(0));
        setRowAnims(anims);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);

        Animated.spring(crowned, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }).start();

        // Stagger slide in each row
        sorted.forEach((_, i) => {
            setTimeout(() => {
                if (anims[i]) {
                    Animated.spring(anims[i], { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }).start();
                }
            }, 200 + i * 120);
        });
    }, [room?.players]);

    const getSortedPlayers = () => {
        if (!room?.players) return [];
        return Object.entries(room.players)
            .sort(([, a], [, b]) => (b.score || 0) - (a.score || 0));
    };

    if (!room) return null;

    const sorted = getSortedPlayers();
    const leader = sorted[0];
    const isLeader = leader?.[0] === player?.uid;

    const handleNextRound = async () => {
        await resetToLobby(roomCode);
    };

    return (
        <LinearGradient
            colors={isDark ? ['#0D0D0D', '#1A0500'] : ['#F5F5F5', '#FFF3E0']}
            style={[styles.container, { height }]}
        >
            <Confetti visible={showConfetti} />
            <ThemeToggle />

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* ── Header ── */}
                <Text style={[styles.roundBadge, { color: theme.textSub }]}>
                    ROUND {roundNumber} COMPLETE
                </Text>
                <Text style={[styles.title, { color: theme.text }]}>Scoreboard</Text>

                {/* ── Secret word ── */}
                {room.word && (
                    <View style={[styles.wordCard, { backgroundColor: theme.card }]}>
                        <Text style={[styles.wordLabel, { color: theme.textSub }]}>THE WORD WAS</Text>
                        <Text style={[styles.wordText, { color: theme.primary }]}>{room.word}</Text>
                    </View>
                )}

                {/* ── Leader ── */}
                {leader && (
                    <Animated.View style={[styles.leaderCard, {
                        backgroundColor: theme.card,
                        borderColor: '#FFD700',
                        transform: [{ scale: crowned }],
                    }]}>
                        <Text style={styles.crown}>👑</Text>
                        <Text style={styles.leaderAvatar}>{room.players[leader[0]]?.avatar || '🦊'}</Text>
                        <Text style={[styles.leaderName, { color: theme.text }]}>
                            {room.players[leader[0]]?.name}
                            {isLeader ? ' (You)' : ''}
                        </Text>
                        <Text style={[styles.leaderScore, { color: '#FFD700' }]}>
                            {leader[1]?.score || 0} pts
                        </Text>
                    </Animated.View>
                )}

                {/* ── All players ── */}
                {sorted.map(([uid, p], idx) => {
                    const anim = rowAnims[idx] || new Animated.Value(1);
                    const isMe = uid === player?.uid;
                    return (
                        <Animated.View key={uid} style={[styles.row, {
                            backgroundColor: isMe ? `${theme.primary}22` : theme.card,
                            borderColor: isMe ? theme.primary : theme.border,
                            opacity: anim,
                            transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) }],
                        }]}>
                            <Text style={styles.medal}>{MEDALS[idx] || `${idx + 1}.`}</Text>
                            <Text style={styles.avatar}>{p.avatar || '🦊'}</Text>
                            <View style={styles.nameBox}>
                                <Text style={[styles.name, { color: theme.text }]}>
                                    {p.name} {isMe ? '(You)' : ''}
                                </Text>
                                <Text style={[styles.scoreSub, { color: theme.textSub }]}>
                                    {p.score || 0} points total
                                </Text>
                            </View>
                            {/* Score bar */}
                            <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                                <View style={[styles.barFill, {
                                    width: `${Math.min(100, ((p.score || 0) / Math.max(sorted[0]?.[1]?.score || 1, 1)) * 100)}%`,
                                    backgroundColor: MEDAL_COLORS[idx] || theme.primary,
                                }]} />
                            </View>
                        </Animated.View>
                    );
                })}

                {/* ── Buttons ── */}
                {isPlayerHost && (
                    <TouchableOpacity
                        style={[styles.nextRoundBtn, { backgroundColor: theme.primary }]}
                        onPress={handleNextRound}
                    >
                        <Text style={styles.nextRoundText}>🎮 NEXT ROUND →</Text>
                    </TouchableOpacity>
                )}
                {!isPlayerHost && (
                    <View style={[styles.waitMsg, { backgroundColor: theme.card }]}>
                        <Text style={[styles.waitText, { color: theme.textSub }]}>
                            ⏳ Waiting for host to start next round...
                        </Text>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.homeBtn, { borderColor: theme.border }]}
                    onPress={() => navigation.navigate('Home')}
                >
                    <Text style={[styles.homeBtnText, { color: theme.textSub }]}>🏠 Leave Game</Text>
                </TouchableOpacity>
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flexDirection: 'column', overflow: 'hidden' },
    scroll: { padding: 20, paddingTop: 56, paddingBottom: 40, alignItems: 'center' },
    roundBadge: { fontSize: 11, letterSpacing: 3, fontWeight: '700', marginBottom: 4 },
    title: { fontSize: 32, fontWeight: '900', marginBottom: 16 },
    wordCard: { borderRadius: 14, padding: 14, marginBottom: 16, alignItems: 'center', width: '100%' },
    wordLabel: { fontSize: 11, letterSpacing: 3, fontWeight: '600', marginBottom: 4 },
    wordText: { fontSize: 28, fontWeight: '900' },
    leaderCard: {
        borderRadius: 24, borderWidth: 2, padding: 24,
        alignItems: 'center', marginBottom: 20, width: '100%',
        shadowColor: '#FFD700', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
    },
    crown: { fontSize: 36, marginBottom: 4 },
    leaderAvatar: { fontSize: 52, marginBottom: 8 },
    leaderName: { fontSize: 24, fontWeight: '900' },
    leaderScore: { fontSize: 20, fontWeight: '900', marginTop: 4 },
    row: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 16, borderWidth: 1.5, padding: 14,
        marginBottom: 10, width: '100%', gap: 10,
    },
    medal: { fontSize: 20, width: 28, textAlign: 'center' },
    avatar: { fontSize: 28 },
    nameBox: { flex: 1 },
    name: { fontSize: 16, fontWeight: '700' },
    scoreSub: { fontSize: 12, marginTop: 2 },
    barTrack: { width: 60, height: 6, borderRadius: 3, overflow: 'hidden' },
    barFill: { height: 6, borderRadius: 3 },
    nextRoundBtn: {
        width: '100%', padding: 18, borderRadius: 16,
        alignItems: 'center', marginTop: 16,
        shadowColor: '#E8232A', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    nextRoundText: { color: '#fff', fontSize: 18, fontWeight: '900' },
    waitMsg: { padding: 16, borderRadius: 14, width: '100%', alignItems: 'center', marginTop: 16 },
    waitText: { fontSize: 14, fontWeight: '600' },
    homeBtn: { marginTop: 12, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14, borderWidth: 1.5 },
    homeBtnText: { fontSize: 15, fontWeight: '700' },
});