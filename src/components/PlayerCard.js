import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGame } from '../context/GameContext';

const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🦋', '🐯', '🦄', '🐙'];

export default function PlayerCard({ player, index, voted = false, isYou = false, onPress }) {
    const { theme } = useGame();
    return (
        <View style={[
            styles.card,
            {
                backgroundColor: theme.card,
                borderColor: isYou ? theme.primary : voted ? theme.success : theme.border,
                shadowColor: theme.shadow,
            }
        ]}>
            <Text style={styles.avatar}>{AVATARS[index % AVATARS.length]}</Text>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                {player.name}
            </Text>
            <Text style={[styles.score, { color: theme.textSub }]}>{player.score ?? 0} pts</Text>
            {voted && <View style={[styles.votedBadge, { backgroundColor: theme.success }]}>
                <Text style={styles.votedText}>✓</Text>
            </View>}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '45%', margin: '2.5%', padding: 16,
        borderRadius: 16, borderWidth: 2,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15, shadowRadius: 8,
        elevation: 5,
    },
    avatar: { fontSize: 36, marginBottom: 6 },
    name: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
    score: { fontSize: 12, marginTop: 2 },
    votedBadge: {
        position: 'absolute', top: 8, right: 8,
        width: 22, height: 22, borderRadius: 11,
        alignItems: 'center', justifyContent: 'center',
    },
    votedText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});