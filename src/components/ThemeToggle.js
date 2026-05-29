import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useGame } from '../context/GameContext';

export default function ThemeToggle() {
    const { isDark, setIsDark, theme } = useGame();

    return (
        <TouchableOpacity 
            style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]} 
            onPress={() => setIsDark(!isDark)}
            activeOpacity={0.8}
        >
            <Text style={[styles.text, { color: theme.text }]}>
                {isDark ? '☀️ Light' : '🌙 Dark'}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 16,
        right: 16,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        zIndex: 100,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 12,
        fontWeight: 'bold',
    }
});
