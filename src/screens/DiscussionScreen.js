import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    TextInput, FlatList, KeyboardAvoidingView,
    Platform, Animated, useWindowDimensions
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGame } from '../context/GameContext';
import { useFirebaseRoom, useRoomChat, updatePhase, sendChatMessage } from '../hooks/useFirebaseRoom';
import TimerBar from '../components/TimerBar';
import ThemeToggle from '../components/ThemeToggle';

export default function DiscussionScreen({ navigation, route }) {
    const { roomCode } = route.params;
    const { theme, player } = useGame();
    const { height } = useWindowDimensions();
    const [room, setRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatText, setChatText] = useState('');
    const [secondsLeft, setSecondsLeft] = useState(180);
    const timerRef = useRef(null);
    const chatRef = useRef(null);
    const [pulse] = useState(() => new Animated.Value(1));

    useFirebaseRoom(roomCode, (data) => {
        if (!data) return;
        setRoom(data);
        if (data.phase === 'voting') {
            clearInterval(timerRef.current);
            navigation.navigate('Voting', { roomCode });
        }
    });

    useRoomChat(roomCode, setMessages);

    const isPlayerHost = room?.hostId && player?.uid ? room.hostId === player.uid : false;
    const timerDuration = room?.settings?.timerDuration ?? 180;

    useEffect(() => {
        if (!room) return;
        const startTime = room.timerStart || Date.now();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, timerDuration - elapsed);
        setSecondsLeft(remaining);

        timerRef.current = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    if (isPlayerHost) updatePhase(roomCode, 'voting');
                    return 0;
                }
                if (prev === 6) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
                    Animated.loop(Animated.sequence([
                        Animated.timing(pulse, { toValue: 1.12, duration: 200, useNativeDriver: true }),
                        Animated.timing(pulse, { toValue: 1, duration: 200, useNativeDriver: true }),
                    ]), { iterations: 6 }).start();
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [isPlayerHost, roomCode, timerDuration, room?.timerStart]);

    const handleSend = async () => {
        if (!chatText.trim()) return;
        const text = chatText.trim();
        setChatText('');
        await sendChatMessage(roomCode, player, text);
        setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const players = room?.players || {};
    const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const secs = String(secondsLeft % 60).padStart(2, '0');

    return (
        <KeyboardAvoidingView
            style={{ height, backgroundColor: theme.bg, flexDirection: 'column', overflow: 'hidden' }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <View style={[styles.container, { backgroundColor: theme.bg }]}>
                <ThemeToggle />

                {/* ── Header ── */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.title, { color: theme.text }]}>Discussion</Text>
                        <Text style={[styles.sub, { color: theme.textSub }]}>
                            Debate and find the imposter!
                        </Text>
                    </View>
                    <Animated.Text style={[
                        styles.timer, {
                            color: secondsLeft <= 10 ? theme.danger : theme.primary,
                            transform: [{ scale: pulse }],
                        }
                    ]}>
                        {mins}:{secs}
                    </Animated.Text>
                </View>

                <TimerBar seconds={secondsLeft} total={timerDuration} />

                {/* ── Chat messages ── */}
                <FlatList
                    ref={chatRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    style={styles.chatList}
                    contentContainerStyle={styles.chatContent}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: true })}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyChat}>
                            <Text style={[styles.emptyChatText, { color: theme.textSub }]}>
                                💬 Start the discussion! Who is the imposter?
                            </Text>
                        </View>
                    )}
                    renderItem={({ item }) => {
                        const isMe = item.uid === player?.uid;
                        return (
                            <View style={[
                                styles.msgRow,
                                isMe ? styles.msgRowMe : styles.msgRowOther
                            ]}>
                                {!isMe && (
                                    <Text style={styles.msgAvatar}>{item.avatar || '🦊'}</Text>
                                )}
                                <View style={[
                                    styles.msgBubble,
                                    {
                                        backgroundColor: isMe ? theme.primary : theme.card,
                                        borderColor: isMe ? theme.primary : theme.border,
                                    }
                                ]}>
                                    {!isMe && (
                                        <Text style={[styles.msgName, { color: theme.textSub }]}>
                                            {item.name}
                                        </Text>
                                    )}
                                    <Text style={[styles.msgText, { color: isMe ? '#fff' : theme.text }]}>
                                        {item.text}
                                    </Text>
                                </View>
                                {isMe && (
                                    <Text style={styles.msgAvatar}>{item.avatar || '🦊'}</Text>
                                )}
                            </View>
                        );
                    }}
                />

                {/* ── Chat input ── */}
                <View style={[styles.inputRow, {
                    backgroundColor: theme.card, borderTopColor: theme.border
                }]}>
                    <TextInput
                        style={[styles.chatInput, { color: theme.text }]}
                        placeholder="Say something..."
                        placeholderTextColor={theme.textSub}
                        value={chatText}
                        onChangeText={setChatText}
                        returnKeyType="send"
                        onSubmitEditing={handleSend}
                        maxLength={200}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, { backgroundColor: chatText.trim() ? theme.primary : theme.border }]}
                        onPress={handleSend}
                        disabled={!chatText.trim()}
                    >
                        <Text style={styles.sendBtnText}>↑</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Host vote button ── */}
                {isPlayerHost && (
                    <TouchableOpacity
                        style={[styles.voteBtn, { backgroundColor: theme.primary }]}
                        onPress={() => {
                            clearInterval(timerRef.current);
                            updatePhase(roomCode, 'voting');
                        }}
                    >
                        <Text style={styles.voteBtnText}>START VOTING →</Text>
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flexDirection: 'column', flex: 1, paddingTop: 48 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, marginBottom: 8,
    },
    title: { fontSize: 26, fontWeight: '900' },
    sub: { fontSize: 12, marginTop: 2 },
    timer: { fontSize: 36, fontWeight: '900', letterSpacing: 2 },
    chatList: { flex: 1, paddingHorizontal: 12 },
    chatContent: { paddingVertical: 8 },
    emptyChat: { padding: 32, alignItems: 'center' },
    emptyChatText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
    msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 8, gap: 6 },
    msgRowMe: { justifyContent: 'flex-end' },
    msgRowOther: { justifyContent: 'flex-start' },
    msgAvatar: { fontSize: 22 },
    msgBubble: {
        maxWidth: '72%', padding: 10, borderRadius: 16,
        borderWidth: 1,
    },
    msgName: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
    msgText: { fontSize: 15 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 8,
        borderTopWidth: 1, gap: 8,
    },
    chatInput: { flex: 1, fontSize: 16, paddingVertical: 8 },
    sendBtn: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
    },
    sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 20 },
    voteBtn: {
        marginHorizontal: 12, marginBottom: 12, padding: 16,
        borderRadius: 14, alignItems: 'center',
    },
    voteBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});