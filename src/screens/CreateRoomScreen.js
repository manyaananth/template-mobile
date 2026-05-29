import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, Alert, ActivityIndicator,
    useWindowDimensions
} from 'react-native';
import { useGame } from '../context/GameContext';
import { generateRoomCode } from '../utils/roomHelpers';
import { createRoom } from '../hooks/useFirebaseRoom';
import { getAvailableCategories } from '../utils/gameLogic';
import RoomCodeDisplay from '../components/RoomCodeDisplay';
import ThemeToggle from '../components/ThemeToggle';

const CATEGORIES = getAvailableCategories();
const CAT_EMOJIS = {
    'General': '🌍', 'Family': '👨‍👩‍👧', 'Adult': '🔞',
    'Movies & TV': '🎬', 'Sports': '⚽', 'Food & Drinks': '🍕',
};
const TIMER_OPTIONS = [
    { label: '1 min', value: 60 },
    { label: '2 min', value: 120 },
    { label: '3 min', value: 180 },
    { label: '5 min', value: 300 },
];
const FOOTER_HEIGHT = 78;

export default function CreateRoomScreen({ navigation }) {
    const { theme, player, setRoomCode } = useGame();
    const { height } = useWindowDimensions();
    const [selectedCat, setSelectedCat] = useState('General');
    const [imposterCount, setImposterCount] = useState(1);
    const [timerDuration, setTimerDuration] = useState(180);
    const [loading, setLoading] = useState(false);
    const [code, setCode] = useState(null);

    const handleCreate = async () => {
        setLoading(true);
        try {
            const roomCode = generateRoomCode();
            await createRoom(roomCode, player, selectedCat, { timerDuration, imposterCount });
            setCode(roomCode);
            setRoomCode(roomCode);
        } catch (e) {
            Alert.alert('Error creating room', e.message);
        }
        setLoading(false);
    };

    const goToLobby = () => navigation.navigate('Lobby', { roomCode: code });

    return (
        <View style={[styles.root, { height, backgroundColor: theme.bg }]}>
            <ThemeToggle />

            {/* Scrollable area — explicitly sized to screen minus footer */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={true}
                bounces={true}
            >
                {/* Back */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
                    <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
                </TouchableOpacity>

                <Text style={[styles.title, { color: theme.text }]}>Create Room</Text>

                {/* ── Category Pack ── */}
                <Text style={[styles.label, { color: theme.textSub }]}>CATEGORY PACK</Text>
                <View style={styles.catGrid}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.catCard, {
                                backgroundColor: selectedCat === cat ? theme.primary : theme.card,
                                borderColor: selectedCat === cat ? theme.primary : theme.border,
                            }]}
                            onPress={() => setSelectedCat(cat)}
                        >
                            <Text style={styles.catEmoji}>{CAT_EMOJIS[cat] || '🎮'}</Text>
                            <Text style={[styles.catName, { color: selectedCat === cat ? '#fff' : theme.text }]}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Timer ── */}
                <Text style={[styles.label, { color: theme.textSub }]}>DISCUSSION TIMER</Text>
                <View style={styles.row}>
                    {TIMER_OPTIONS.map(opt => (
                        <TouchableOpacity
                            key={opt.value}
                            style={[styles.pill, {
                                backgroundColor: timerDuration === opt.value ? theme.primary : theme.card,
                                borderColor: timerDuration === opt.value ? theme.primary : theme.border,
                            }]}
                            onPress={() => setTimerDuration(opt.value)}
                        >
                            <Text style={[styles.pillText, { color: timerDuration === opt.value ? '#fff' : theme.text }]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Imposter Count ── */}
                <Text style={[styles.label, { color: theme.textSub }]}>NUMBER OF IMPOSTERS</Text>
                <View style={styles.row}>
                    {[1, 2].map(n => (
                        <TouchableOpacity
                            key={n}
                            style={[styles.bigPill, {
                                backgroundColor: imposterCount === n ? theme.primary : theme.card,
                                borderColor: imposterCount === n ? theme.primary : theme.border,
                            }]}
                            onPress={() => setImposterCount(n)}
                        >
                            <Text style={styles.bigPillEmoji}>{n === 1 ? '🕵️' : '🕵️🕵️'}</Text>
                            <Text style={[styles.pillText, { color: imposterCount === n ? '#fff' : theme.text }]}>
                                {n} Imposter{n > 1 ? 's' : ''}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Room code shown inline after creation */}
                {code && <RoomCodeDisplay code={code} />}

                {/* Extra bottom padding so footer doesn't cover content */}
                <View style={{ height: FOOTER_HEIGHT + 8 }} />
            </ScrollView>

            {/* ── Always-visible pinned footer button ── */}
            <View style={[styles.footer, {
                backgroundColor: theme.bg,
                borderTopColor: theme.border,
            }]}>
                {!code ? (
                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: theme.primary }]}
                        onPress={handleCreate}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={styles.btnText}>GENERATE ROOM →</Text>
                        }
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: theme.primary }]}
                        onPress={goToLobby}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.btnText}>GO TO LOBBY →</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        // explicit height from useWindowDimensions — forces web to respect bounds
        flexDirection: 'column',
        overflow: 'hidden',
    },
    content: {
        padding: 20,
        paddingTop: 56,
    },
    back: { marginBottom: 12 },
    backText: { fontSize: 16, fontWeight: '700' },
    title: { fontSize: 32, fontWeight: '900', marginBottom: 20 },
    label: { fontSize: 11, letterSpacing: 3, fontWeight: '700', marginBottom: 10, marginTop: 4 },

    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    catCard: {
        width: '47%', padding: 14, borderRadius: 16,
        borderWidth: 2, alignItems: 'center',
    },
    catEmoji: { fontSize: 28, marginBottom: 6 },
    catName: { fontSize: 13, fontWeight: '700', textAlign: 'center' },

    row: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
    pill: {
        flex: 1, padding: 12, borderRadius: 12,
        borderWidth: 2, alignItems: 'center', minWidth: 60,
    },
    pillText: { fontSize: 14, fontWeight: '700' },
    bigPill: {
        flex: 1, padding: 16, borderRadius: 16,
        borderWidth: 2, alignItems: 'center',
    },
    bigPillEmoji: { fontSize: 24, marginBottom: 4 },

    footer: {
        borderTopWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    btn: {
        padding: 18, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: '#E8232A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    btnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
});