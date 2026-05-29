import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameProvider } from './src/context/GameContext';
import AppNavigator from './src/navigation/AppNavigator';

class ErrorBoundary extends React.Component {
    state = { hasError: false, error: null };
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: 20, color: 'red', backgroundColor: '#fff', fontFamily: 'monospace', height: '100vh', overflow: 'auto' }}>
                    <h2>Component Crash Detected</h2>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.stack || this.state.error?.toString()}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <GameProvider>
                <ErrorBoundary>
                    <AppNavigator />
                </ErrorBoundary>
            </GameProvider>
        </GestureHandlerRootView>
    );
}