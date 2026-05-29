import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { useGame } from '../context/GameContext';

export default function RoomCodeDisplay({ code }) {
    const { theme } = useGame();
    const share = () => Share.share({ message: `Join my Imposter Game! Code: ${code}` });
    return (
        <View style={[styles.box, { backgroundColor: theme.card, borderColor: theme.primary }]}>
            <Text style={[styles.label, { color: theme.textSub }]}>ROOM CODE</Text>
            <Text style={[styles.code, { color: theme.primary }]}>{code}</Text>
            <TouchableOpacity onPress={share} style={[styles.shareBtn, { backgroundColor: theme.primary }]}>
                <Text style={styles.shareText}>Share 🔗</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    box: {
        alignItems: 'center', padding: 20,
        borderRadius: 20, borderWidth: 2, marginBottom: 20,
    },
    label: { fontSize: 12, letterSpacing: 3, fontWeight: '600' },
    code: { fontSize: 48, fontWeight: '900', letterSpacing: 8, marginVertical: 8 },
    shareBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
    shareText: { color: '#fff', fontWeight: '700' },
});