import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ScrollView, Animated, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGame } from '../context/GameContext';

const { width } = Dimensions.get('window');

const STEPS = [
    {
        emoji: '🏠',
        title: 'Create or Join a Room',
        desc: 'The host creates a room and shares the 6-character code with friends. Everyone joins on their own device — from anywhere in the world!',
        color: '#E8232A',
    },
    {
        emoji: '🔒',
        title: 'Reveal Your Role',
        desc: 'Each player holds their screen privately and holds down to reveal their role. Most players see the SECRET WORD. One player is the IMPOSTER — they see nothing!',
        color: '#FF6B35',
    },
    {
        emoji: '💡',
        title: 'Give Clues',
        desc: 'Players take turns giving ONE clue about the secret word in 15 seconds. The imposter must bluff! Give clues vague enough that the imposter can\'t guess the word.',
        color: '#F39C12',
    },
    {
        emoji: '🗣️',
        title: 'Discuss & Debate',
        desc: 'Use the live in-app chat to debate who the imposter is. Accuse, defend, and bluff your way through. The timer ticks down — stay sharp!',
        color: '#2ECC71',
    },
    {
        emoji: '🗳️',
        title: 'Vote!',
        desc: 'Everyone votes for who they think the imposter is. The player with the most votes is eliminated. Majority rules — choose wisely!',
        color: '#3498DB',
    },
    {
        emoji: '🎯',
        title: 'Last Chance!',
        desc: 'If the imposter is caught, they get ONE last chance to guess the secret word. Guess correctly and they still win! 300 points if they escape!',
        color: '#9B59B6',
    },
    {
        emoji: '🏆',
        title: 'Score & Win',
        desc: 'Players get 100 pts for catching the imposter. The imposter gets 200 pts for escaping undetected, or 300 pts for guessing the word. Play multiple rounds!',
        color: '#E8232A',
    },
];

export default function HowToPlayScreen({ navigation }) {
    const { theme, isDark } = useGame();
    const [currentStep, setCurrentStep] = useState(0);
    const scrollRef = useRef(null);

    const goTo = (idx) => {
        setCurrentStep(idx);
        scrollRef.current?.scrollTo({ x: idx * width, animated: true });
    };

    const isLast = currentStep === STEPS.length - 1;
    const step = STEPS[currentStep];

    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>
            {/* ── Header ── */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[styles.skip, { color: theme.textSub }]}>← Back</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[styles.skip, { color: theme.primary }]}>Skip</Text>
                </TouchableOpacity>
            </View>

            {/* ── Slides ── */}
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                scrollEnabled={false}
                showsHorizontalScrollIndicator={false}
                style={styles.scrollView}
            >
                {STEPS.map((s, idx) => (
                    <View key={idx} style={[styles.slide, { width }]}>
                        <LinearGradient
                            colors={isDark
                                ? [theme.bg, `${s.color}22`]
                                : [theme.bg, `${s.color}11`]}
                            style={styles.slideGradient}
                        >
                            {/* Step number */}
                            <Text style={[styles.stepNum, { color: s.color }]}>
                                STEP {idx + 1} OF {STEPS.length}
                            </Text>

                            {/* Big emoji */}
                            <View style={[styles.emojiCircle, { backgroundColor: `${s.color}22`, borderColor: `${s.color}44` }]}>
                                <Text style={styles.bigEmoji}>{s.emoji}</Text>
                            </View>

                            <Text style={[styles.stepTitle, { color: theme.text }]}>{s.title}</Text>
                            <Text style={[styles.stepDesc, { color: theme.textSub }]}>{s.desc}</Text>
                        </LinearGradient>
                    </View>
                ))}
            </ScrollView>

            {/* ── Dot indicators ── */}
            <View style={styles.dots}>
                {STEPS.map((_, idx) => (
                    <TouchableOpacity key={idx} onPress={() => goTo(idx)}>
                        <View style={[
                            styles.dot,
                            {
                                backgroundColor: idx === currentStep ? theme.primary : theme.border,
                                width: idx === currentStep ? 24 : 8,
                            }
                        ]} />
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── Navigation buttons ── */}
            <View style={styles.btnRow}>
                {currentStep > 0 && (
                    <TouchableOpacity
                        style={[styles.prevBtn, { borderColor: theme.border }]}
                        onPress={() => goTo(currentStep - 1)}
                    >
                        <Text style={[styles.prevBtnText, { color: theme.text }]}>← Prev</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: STEPS[currentStep].color }]}
                    onPress={() => isLast ? navigation.goBack() : goTo(currentStep + 1)}
                >
                    <Text style={styles.nextBtnText}>
                        {isLast ? "LET'S PLAY! 🕵️" : 'NEXT →'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 52 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 8 },
    skip: { fontSize: 15, fontWeight: '600' },
    scrollView: { flex: 1 },
    slide: { flex: 1 },
    slideGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    stepNum: { fontSize: 12, letterSpacing: 3, fontWeight: '700', marginBottom: 24 },
    emojiCircle: {
        width: 130, height: 130, borderRadius: 65,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, marginBottom: 28,
    },
    bigEmoji: { fontSize: 64 },
    stepTitle: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
    stepDesc: { fontSize: 16, textAlign: 'center', lineHeight: 24, maxWidth: 320 },
    dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 16 },
    dot: { height: 8, borderRadius: 4 },
    btnRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 32 },
    prevBtn: {
        paddingVertical: 16, paddingHorizontal: 20,
        borderRadius: 14, borderWidth: 1.5, alignItems: 'center',
    },
    prevBtnText: { fontSize: 16, fontWeight: '700' },
    nextBtn: { flex: 1, padding: 18, borderRadius: 14, alignItems: 'center' },
    nextBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});
