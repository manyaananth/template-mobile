import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, Share, ActivityIndicator,
    useWindowDimensions
} from 'react-native';
import { useGame } from '../context/GameContext';
import { useFirebaseRoom, startGame } from '../hooks/useFirebaseRoom';
import { assignRoles } from '../utils/gameLogic';
import PlayerCard from '../components/PlayerCard';
import ThemeToggle from '../components/ThemeToggle';

const MIN_PLAYERS = 4;

export default function LobbyScreen({ navigation, route }) {
    const { roomCode } = route.params;
    const { theme, player } = useGame();
    const { height } = useWindowDimensions();
    const [room, setRoom] = useState(null);
    const [starting, setStarting] = useState(false);

    useFirebaseRoom(roomCode, (data) => {
        setRoom(data);
        if (data?.phase === 'roleReveal') navigation.navigate('RoleReveal', { roomCode });
        if (data?.phase === 'clueGiving') navigation.navigate('ClueGiving', { roomCode });
        if (data?.phase === 'discussion') navigation.navigate('Discussion', { roomCode });
    });

    const players = room?.players ? Object.entries(room.players) : [];
    const isPlayerHost = room?.hostId != null && player?.uid != null && room.hostId === player.uid;
    const canStart = isPlayerHost && players.length >= MIN_PLAYERS;
    const needMore = MIN_PLAYERS - players.length;

    const handleStart = async () => {
        if (!canStart || starting) return;
        setStarting(true);
        try {
            const playerMap = room.players;
            const imposterCount = room.settings?.imposterCount ?? 1;
            const { roles, word } = assignRoles(playerMap, room.category, imposterCount);
            await startGame(roomCode, roles, word, room.settings || {});
        } catch (e) {
            console.error('Start game error', e);
        } finally {
            setStarting(false);
        }
    };

    const handleShare = () => {
        Share.share({ message: `Join my Imposter Game! Room Code: ${roomCode}` });
    };

    if (!room) return (
        <View style={[styles.loading, { backgroundColor: theme.bg }]}>
            <ActivityIndicator color={theme.primary} size="large" />
            <Text style={[styles.loadingText, { color: theme.textSub }]}>Connecting...</Text>
        </View>
    );

    // Arrange players into rows of 2
    const rows = [];
    for (let i = 0; i < players.length; i += 2) {
        rows.push(players.slice(i, i + 2));
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.bg, height }]}>
            <ThemeToggle />

            {/* ── Compact room code banner ── */}
            <View style={[styles.codeBanner, { backgroundColor: theme.card, borderColor: theme.primary }]}>
                <View style={styles.codeRow}>
                    <View>
                        <Text style={[styles.codeLabel, { color: theme.textSub }]}>ROOM CODE</Text>
                        <Text style={[styles.codeText, { color: theme.primary }]}>{roomCode}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.shareBtn, { backgroundColor: theme.primary }]}
                        onPress={handleShare}
                    >
                        <Text style={styles.shareBtnText}>Share 🔗</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Title row ── */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: theme.text }]}>Waiting Room</Text>
                <Text style={[styles.sub, { color: theme.textSub }]}>
                    {players.length}/{8} players • {room?.category}
                </Text>
            </View>

            {/* ── Scrollable player grid ── */}
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {rows.map((row, rowIdx) => (
                    <View key={rowIdx} style={styles.row}>
                        {row.map(([uid, p], colIdx) => (
                            <View key={uid} style={styles.cardWrapper}>
                                <PlayerCard
                                    player={p}
                                    index={rowIdx * 2 + colIdx}
                                    isYou={uid === player?.uid}
                                />
                            </View>
                        ))}
                        {/* Fill empty slot if odd number of players */}
                        {row.length === 1 && <View style={styles.cardWrapper} />}
                    </View>
                ))}
            </ScrollView>

            {/* ── Pinned footer ── */}
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
                {isPlayerHost ? (
                    <TouchableOpacity
                        style={[
                            styles.startBtn,
                            { backgroundColor: canStart ? theme.primary : theme.border }
                        ]}
                        onPress={handleStart}
                        disabled={!canStart || starting}
                        activeOpacity={0.85}
                    >
                        {starting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.startBtnText}>
                                {canStart
                                    ? '🚀 START GAME'
                                    : `Need ${needMore} more player${needMore !== 1 ? 's' : ''}`}
                            </Text>
                        )}
                    </TouchableOpacity>
                ) : (
                    <View style={[styles.waitBox, { backgroundColor: theme.card }]}>
                        <Text style={[styles.waitText, { color: theme.textSub }]}>
                            ⏳ Waiting for host to start the game...
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flexDirection: 'column', overflow: 'hidden', paddingTop: 48 },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 16, marginTop: 8 },

    codeBanner: {
        marginHorizontal: 16, marginBottom: 12,
        borderRadius: 16, borderWidth: 2, padding: 14,
    },
    codeRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
    },
    codeLabel: { fontSize: 11, letterSpacing: 3, fontWeight: '600' },
    codeText: { fontSize: 32, fontWeight: '900', letterSpacing: 6 },
    shareBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    header: { paddingHorizontal: 16, marginBottom: 12 },
    title: { fontSize: 26, fontWeight: '900' },
    sub: { fontSize: 13, marginTop: 2 },

    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 8, paddingBottom: 8 },

    row: { flexDirection: 'row' },
    cardWrapper: { flex: 1, padding: 8 },

    footer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    startBtn: {
        padding: 18, borderRadius: 16, alignItems: 'center',
        shadowColor: '#E8232A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    startBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
    waitBox: {
        padding: 18, borderRadius: 16, alignItems: 'center',
    },
    waitText: { fontSize: 15, fontWeight: '600' },
});