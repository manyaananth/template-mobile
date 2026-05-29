import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme } from '../theme';

const GameContext = createContext();

export function GameProvider({ children }) {
    const [isDark, setIsDark] = useState(true);
    const [player, setPlayer] = useState(null); // { uid, name, isGuest }
    const [roomCode, setRoomCode] = useState(null);
    const [isHost, setIsHost] = useState(false);

    const theme = isDark ? darkTheme : lightTheme;

    useEffect(() => {
        AsyncStorage.getItem('player').then(val => {
            if (val) setPlayer(JSON.parse(val));
        });
    }, []);

    const savePlayer = async (p) => {
        setPlayer(p);
        await AsyncStorage.setItem('player', JSON.stringify(p));
    };

    return (
        <GameContext.Provider value={{
            theme, isDark, setIsDark,
            player, savePlayer,
            roomCode, setRoomCode,
            isHost, setIsHost,
        }}>
            {children}
        </GameContext.Provider>
    );
}

export const useGame = () => useContext(GameContext);