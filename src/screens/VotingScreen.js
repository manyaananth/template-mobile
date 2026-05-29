import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity,
    StyleSheet, FlatList, Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGame } from '../context/GameContext';
import { useFirebaseRoom, castVote, checkAndTallyVotes } from '../hooks/useFirebaseRoom';
import ThemeToggle from '../components/ThemeToggle';

export default function VotingScreen({ navigation, route }) {
    const { roomCode } = route.params;
    const { theme, player } = useGame();
    const [room, setRoom] = useState(null);
    const [myVote, setMyVote] = useState(null);
    const [voting, setVoting] = useState(false);

    useFirebaseRoom(roomCode, (data) => {
        if (!data) return;
        setRoom(data);
        if (data.phase === 'imposterGuess') {
            navigation.navigate('ImposterGuess', { roomCode });
        }
        if (data.phase === 'reveal') {
            navigation.navigate('Reveal', { roomCode });
        }
    });

    const players = room?.players ? Object.entries(room.players) : [];
    const votes = room?.votes || {};
    const votedCount = Object.keys(votes).length;

    const handleVote = async (targetUID) => {
        if (myVote || voting) return;
        if (targetUID === player?.uid) return Alert.alert("You can't vote for yourself!");
        setMyVote(targetUID);
        setVoting(true);
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await castVote(roomCode, player.uid, targetUID);
            await checkAndTallyVotes(roomCode);
        } catch (e) {
            console.error('Vote error', e);
        } finally {
            setVoting(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            <ThemeToggle />
            <Text style={[styles.title, { color: theme.text }]}>🗳️ Vote!</Text>
            <Text style={[styles.sub, { color: theme.textSub }]}>
                Tap the player you suspect is the Imposter
            </Text>

            <View style={[styles.progress, { backgroundColor: theme.card }]}>
                <Text style={[styles.progressText, { color: theme.textSub }]}>
                    {votedCount}/{players.length} votes cast
                </Text>
                <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                    <View style={[styles.progressFill, {
                        width: players.length > 0 ? `${(votedCount / players.length) * 100}%` : '0%',
                        backgroundColor: theme.primary,
                    }]} />
                </View>
            </View>

            {myVote && (
                <Text style={[styles.waitText, { color: theme.textSub }]}>
                    ✓ Vote cast! Waiting for others...
                </Text>
            )}

            <FlatList
                data={players}
                keyExtractor={([uid]) => uid}
                numColumns={2}
                renderItem={({ item: [uid, p] }) => {
                    const isMe = uid === player?.uid;
                    const iVotedThis = myVote === uid;
                    const hasVoted = !!votes[uid];
                    return (
                        <TouchableOpacity
                            onPress={() => handleVote(uid)}
                            disabled={!!myVote || isMe || voting}
                            style={[
                                styles.voteCard,
                                {
                                    backgroundColor: iVotedThis ? theme.primary : theme.card,
                                    borderColor: iVotedThis ? theme.primary : theme.border,
                                    opacity: isMe ? 0.4 : 1,
                                },
                            ]}
                        >
                            <Text style={styles.avatar}>{p.avatar || '🦊'}</Text>
                            <Text style={[styles.name, { color: iVotedThis ? '#fff' : theme.text }]}>
                                {p.name}
                            </Text>
                            {isMe && (
                                <Text style={[styles.youBadge, { color: iVotedThis ? '#fff' : theme.textSub }]}>
                                    (You)
                                </Text>
                            )}
                            {hasVoted && !isMe && !iVotedThis && (
                                <View style={[styles.votedDot, { backgroundColor: theme.success }]} />
                            )}
                            {iVotedThis && <Text style={styles.votedCheck}>✓</Text>}
                        </TouchableOpacity>
                    );
                }}
                style={styles.listContainer}
                contentContainerStyle={styles.grid}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, paddingTop: 52 },
    title: { fontSize: 32, fontWeight: '900' },
    sub: { fontSize: 13, marginBottom: 16 },
    progress: { padding: 16, borderRadius: 12, marginBottom: 8 },
    progressText: { fontSize: 13, marginBottom: 8 },
    progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: 6, borderRadius: 3 },
    waitText: { fontSize: 14, marginBottom: 12, textAlign: 'center' },
    listContainer: { flex: 1 },
    grid: { paddingBottom: 20 },
    voteCard: {
        width: '45%', margin: '2.5%', padding: 20,
        borderRadius: 16, borderWidth: 2, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
    },
    avatar: { fontSize: 36, marginBottom: 8 },
    name: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    youBadge: { fontSize: 11, marginTop: 2 },
    votedDot: { position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: 5 },
    votedCheck: { position: 'absolute', top: 6, right: 8, fontSize: 16, color: '#fff', fontWeight: '900' },
});