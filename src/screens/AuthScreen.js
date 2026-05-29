import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView,
    useWindowDimensions
} from 'react-native';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword, updateProfile
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { useGame } from '../context/GameContext';
import { generateUID } from '../utils/roomHelpers';
import ThemeToggle from '../components/ThemeToggle';

const AVATARS = ['🦊', '🐼', '🦁', '🐸', '🦋', '🐯', '🦄', '🐙', '🦈', '🦉', '🐺', '🦝'];

export default function AuthScreen({ navigation, route }) {
    const { theme, savePlayer } = useGame();
    const { height } = useWindowDimensions();
    const { next } = route.params || {};
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState('guest');
    const [selectedAvatar, setSelectedAvatar] = useState('🦊');

    const playAsGuest = async () => {
        if (!name.trim()) return Alert.alert('Enter your nickname!');
        const uid = generateUID();
        await savePlayer({ uid, name: name.trim(), avatar: selectedAvatar, isGuest: true });
        navigate();
    };

    const loginWithEmail = async () => {
        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            await savePlayer({
                uid: cred.user.uid,
                name: cred.user.displayName || email,
                avatar: selectedAvatar,
                isGuest: false,
            });
            navigate();
        } catch (e) { Alert.alert('Login failed', e.message); }
    };

    const registerWithEmail = async () => {
        if (!name.trim()) return Alert.alert('Enter your name!');
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, { displayName: name.trim() });
            await savePlayer({ uid: cred.user.uid, name: name.trim(), avatar: selectedAvatar, isGuest: false });
            navigate();
        } catch (e) { Alert.alert('Registration failed', e.message); }
    };

    const navigate = () => {
        if (next) navigation.navigate(next);
        else navigation.navigate('Home');
    };

    return (
        <KeyboardAvoidingView
            style={[styles.wrapper, { backgroundColor: theme.bg, height }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <ThemeToggle />
                <Text style={[styles.title, { color: theme.text }]}>
                    {mode === 'guest' ? '👤 Quick Play' : mode === 'login' ? '🔑 Sign In' : '✨ Register'}
                </Text>

                {/* ── Mode Tabs ── */}
                <View style={[styles.tabs, { backgroundColor: theme.card }]}>
                    {['guest', 'login', 'register'].map(m => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.tab, mode === m && { backgroundColor: theme.primary }]}
                            onPress={() => setMode(m)}
                        >
                            <Text style={[styles.tabText, { color: mode === m ? '#fff' : theme.textSub }]}>
                                {m === 'guest' ? 'Guest' : m === 'login' ? 'Login' : 'Register'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Avatar Picker ── */}
                <Text style={[styles.sectionLabel, { color: theme.textSub }]}>CHOOSE YOUR AVATAR</Text>
                <View style={styles.avatarGrid}>
                    {AVATARS.map(av => (
                        <TouchableOpacity
                            key={av}
                            style={[styles.avatarBtn, {
                                backgroundColor: selectedAvatar === av ? theme.primary : theme.card,
                                borderColor: selectedAvatar === av ? theme.primary : theme.border,
                                transform: [{ scale: selectedAvatar === av ? 1.15 : 1 }],
                            }]}
                            onPress={() => setSelectedAvatar(av)}
                        >
                            <Text style={styles.avatarEmoji}>{av}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Form Fields ── */}
                <View style={styles.form}>
                    {(mode === 'guest' || mode === 'register') && (
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                            placeholder="Nickname" placeholderTextColor={theme.textSub}
                            value={name} onChangeText={setName}
                            maxLength={20}
                        />
                    )}
                    {(mode === 'login' || mode === 'register') && (
                        <>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                                placeholder="Email" placeholderTextColor={theme.textSub}
                                value={email} onChangeText={setEmail}
                                keyboardType="email-address" autoCapitalize="none"
                            />
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                                placeholder="Password" placeholderTextColor={theme.textSub}
                                value={password} onChangeText={setPassword}
                                secureTextEntry
                            />
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.btn, { backgroundColor: theme.primary }]}
                        onPress={mode === 'guest' ? playAsGuest : mode === 'login' ? loginWithEmail : registerWithEmail}
                    >
                        <Text style={styles.btnText}>
                            {mode === 'guest' ? `${selectedAvatar} PLAY NOW →` : mode === 'login' ? 'SIGN IN →' : 'CREATE ACCOUNT →'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    wrapper: { flexDirection: 'column', overflow: 'hidden' },
    container: { padding: 24, paddingTop: 60, paddingBottom: 40 },
    title: { fontSize: 32, fontWeight: '900', marginBottom: 24, textAlign: 'center' },
    tabs: {
        flexDirection: 'row', borderRadius: 12,
        padding: 4, marginBottom: 24,
    },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    tabText: { fontWeight: '700', fontSize: 14 },
    sectionLabel: { fontSize: 11, letterSpacing: 3, fontWeight: '700', marginBottom: 10 },
    avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24, justifyContent: 'center' },
    avatarBtn: {
        width: 56, height: 56, borderRadius: 28,
        borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    },
    avatarEmoji: { fontSize: 26 },
    form: { gap: 12 },
    input: { padding: 16, borderRadius: 12, borderWidth: 1, fontSize: 16 },
    btn: { padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 8 },
    btnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});