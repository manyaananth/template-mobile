import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/HomeScreen';
import AuthScreen from '../screens/AuthScreen';
import HowToPlayScreen from '../screens/HowToPlayScreen';
import CreateRoomScreen from '../screens/CreateRoomScreen';
import JoinRoomScreen from '../screens/JoinRoomScreen';
import LobbyScreen from '../screens/LobbyScreen';
import RoleRevealScreen from '../screens/RoleRevealScreen';
import ClueGivingScreen from '../screens/ClueGivingScreen';
import DiscussionScreen from '../screens/DiscussionScreen';
import VotingScreen from '../screens/VotingScreen';
import ImposterGuessScreen from '../screens/ImposterGuessScreen';
import RevealScreen from '../screens/RevealScreen';
import ScoreboardScreen from '../screens/ScoreboardScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: true }}>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Auth" component={AuthScreen} />
                <Stack.Screen name="HowToPlay" component={HowToPlayScreen} />
                <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
                <Stack.Screen name="JoinRoom" component={JoinRoomScreen} />
                <Stack.Screen name="Lobby" component={LobbyScreen} />
                <Stack.Screen name="RoleReveal" component={RoleRevealScreen} />
                <Stack.Screen name="ClueGiving" component={ClueGivingScreen} />
                <Stack.Screen name="Discussion" component={DiscussionScreen} />
                <Stack.Screen name="Voting" component={VotingScreen} />
                <Stack.Screen name="ImposterGuess" component={ImposterGuessScreen} />
                <Stack.Screen name="Reveal" component={RevealScreen} />
                <Stack.Screen name="Scoreboard" component={ScoreboardScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}