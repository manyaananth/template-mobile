import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator
} from 'react-native';
import { get, ref } from 'firebase/database';
import { db } from '../config/firebase';
import { joinRoom } from '../hooks/useFirebaseRoom';
import { useGame } from '../context/GameContext';
import * as Haptics from 'expo-haptics';
import ThemeToggle from '../components/ThemeToggle';

export default function JoinRoomScreen({ navigation }) {
    const { theme, player, setRoomCode, setIsHost } = useGame();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        const roomCode = code.trim().toUpperCase();
        if (roomCode.length < 4) return Alert.alert('Enter a valid room code!');
        setLoading(true);
        try {
            const snap = await get(ref(db, `rooms/${roomCode}`));
            if (!snap.exists()) {
                Alert.alert('Room not found', 'Check the code and try again.');
                setLoading(false); return;
            }
            const room = snap.val();
            if (room.phase !== 'lobby') {
                Alert.alert('Game in progress', 'This game has already started.');
                setLoading(false); return;
            }
            await joinRoom(roomCode, player);
            setRoomCode(roomCode);
            setIsHost(false);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.navigate('Lobby', { roomCode });
        } catch (e) {
            Alert.alert('Error', e.message);
        }
        setLoading(false);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            <ThemeToggle />
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
                <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
            </TouchableOpacity>

            <Text style={[styles.title, { color: theme.text }]}>Join Room</Text>
            <Text style={[styles.sub, { color: theme.textSub }]}>
                Enter the 6-character room code
            </Text>

            <TextInput
                style={[styles.input, {
                    backgroundColor: theme.card, color: theme.text,
                    borderColor: theme.primary,
                }]}
                placeholder="e.g. AB3X7K"
                placeholderTextColor={theme.textSub}
                value={code}
                onChangeText={t => setCode(t.toUpperCase())}
                maxLength={6}
                autoCapitalize="characters"
                autoFocus
            />

            <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.primary }]}
                onPress={handleJoin} disabled={loading}
            >
                {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.btnText}>JOIN GAME →</Text>
                }
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, paddingTop: 60 },
    back: { marginBottom: 24 },
    backText: { fontSize: 16, fontWeight: '700' },
    title: { fontSize: 36, fontWeight: '900', marginBottom: 4 },
    sub: { fontSize: 14, marginBottom: 32 },
    input: {
        fontSize: 36, fontWeight: '900', letterSpacing: 12,
        padding: 20, borderRadius: 16, borderWidth: 2,
        textAlign: 'center', marginBottom: 24,
    },
    btn: { padding: 18, borderRadius: 14, alignItems: 'center' },
    btnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});