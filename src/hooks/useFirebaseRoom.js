import { useEffect, useRef } from 'react';
import { ref, set, update, onValue, runTransaction, get, push } from 'firebase/database';
import { db } from '../config/firebase';
import { buildTurnOrder } from '../utils/gameLogic';

// ─── Hook: subscribe to a room's state ───────────────────────────────────────
export function useFirebaseRoom(roomCode, callback) {
    const callbackRef = useRef(callback);
    useEffect(() => { callbackRef.current = callback; });

    useEffect(() => {
        if (!roomCode) return;
        const roomRef = ref(db, `rooms/${roomCode}`);
        const unsubscribe = onValue(roomRef, (snapshot) => {
            if (callbackRef.current) {
                callbackRef.current(snapshot.exists() ? snapshot.val() : null);
            }
        });
        return () => unsubscribe();
    }, [roomCode]);
}

// ─── Hook: subscribe to chat messages ────────────────────────────────────────
export function useRoomChat(roomCode, callback) {
    const callbackRef = useRef(callback);
    useEffect(() => { callbackRef.current = callback; });

    useEffect(() => {
        if (!roomCode) return;
        const chatRef = ref(db, `rooms/${roomCode}/chat`);
        const unsubscribe = onValue(chatRef, (snapshot) => {
            if (!callbackRef.current) return;
            if (!snapshot.exists()) { callbackRef.current([]); return; }
            const raw = snapshot.val();
            const msgs = Object.entries(raw).map(([id, m]) => ({ id, ...m }));
            msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            callbackRef.current(msgs);
        });
        return () => unsubscribe();
    }, [roomCode]);
}

// ─── Create room ─────────────────────────────────────────────────────────────
export async function createRoom(roomCode, hostPlayer, category, settings = {}) {
    const roomRef = ref(db, `rooms/${roomCode}`);
    await set(roomRef, {
        category,
        phase: 'lobby',
        hostId: hostPlayer.uid,
        settings: {
            timerDuration: settings.timerDuration ?? 180,
            imposterCount: settings.imposterCount ?? 1,
        },
        players: {
            [hostPlayer.uid]: {
                name: hostPlayer.name,
                avatar: hostPlayer.avatar || '🦊',
                isHost: true,
                score: 0,
            },
        },
    });
}

// ─── Join room ───────────────────────────────────────────────────────────────
export async function joinRoom(roomCode, player) {
    const playerRef = ref(db, `rooms/${roomCode}/players/${player.uid}`);
    await set(playerRef, {
        name: player.name,
        avatar: player.avatar || '🐼',
        isHost: false,
        score: 0,
    });
}

// ─── Start game — assign roles, start clue-giving phase ──────────────────────
export async function startGame(roomCode, roles, word, settings = {}) {
    const playerIds = Object.keys(roles);

    // Imposter is NEVER first — they listen first to blend in
    const turnOrder = buildTurnOrder(playerIds, roles);

    const roomRef = ref(db, `rooms/${roomCode}`);
    await update(roomRef, {
        roles,
        word,
        phase: 'clueGiving',
        readyCount: 0,
        currentTurnIndex: 0,
        turnOrder,
        clues: {},
        votes: null,
        eliminated: null,
        imposterGuess: null,
        imposterGuessCorrect: null,
        scored: false,
        clueStartTime: Date.now(),
    });
}

// ─── Update phase ─────────────────────────────────────────────────────────────
export async function updatePhase(roomCode, phase, extraUpdates = {}) {
    const roomRef = ref(db, `rooms/${roomCode}`);
    await update(roomRef, { phase, ...extraUpdates });
}

// ─── Clue-giving: submit clue + advance turn ─────────────────────────────────
export async function submitClueAndAdvance(roomCode, playerUid, clueText, totalPlayers) {
    const snap = await get(ref(db, `rooms/${roomCode}`));
    if (!snap.exists()) return;
    const room = snap.val();
    const turnOrder = room.turnOrder || [];
    const currentIdx = room.currentTurnIndex ?? 0;
    const nextIdx = currentIdx + 1;
    const isLastTurn = nextIdx >= turnOrder.length;
    const clues = { ...(room.clues || {}), [playerUid]: clueText };
    const timerDuration = room.settings?.timerDuration ?? 180;

    if (isLastTurn) {
        await update(ref(db, `rooms/${roomCode}`), {
            clues,
            phase: 'discussion',
            timerStart: Date.now(),
            timerDuration,
            currentTurnIndex: nextIdx,
        });
    } else {
        await update(ref(db, `rooms/${roomCode}`), {
            clues,
            currentTurnIndex: nextIdx,
            clueStartTime: Date.now(),
        });
    }
}

// ─── Skip turn (time ran out) ─────────────────────────────────────────────────
export async function skipTurn(roomCode) {
    const snap = await get(ref(db, `rooms/${roomCode}`));
    if (!snap.exists()) return;
    const room = snap.val();
    const turnOrder = room.turnOrder || [];
    const nextIdx = (room.currentTurnIndex ?? 0) + 1;
    const isLastTurn = nextIdx >= turnOrder.length;
    const timerDuration = room.settings?.timerDuration ?? 180;

    if (isLastTurn) {
        await update(ref(db, `rooms/${roomCode}`), {
            phase: 'discussion',
            timerStart: Date.now(),
            timerDuration,
            currentTurnIndex: nextIdx,
        });
    } else {
        await update(ref(db, `rooms/${roomCode}`), {
            currentTurnIndex: nextIdx,
            clueStartTime: Date.now(),
        });
    }
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export async function sendChatMessage(roomCode, player, text) {
    if (!text?.trim()) return;
    const chatRef = ref(db, `rooms/${roomCode}/chat`);
    await push(chatRef, {
        uid: player.uid,
        name: player.name,
        avatar: player.avatar || '🦊',
        text: text.trim(),
        timestamp: Date.now(),
    });
}

// ─── Ready: mark ready → move to clue-giving ─────────────────────────────────
export async function markReady(roomCode, totalPlayers) {
    const readyRef = ref(db, `rooms/${roomCode}/readyCount`);
    await runTransaction(readyRef, (current) => (current || 0) + 1);
    const snap = await get(ref(db, `rooms/${roomCode}`));
    const room = snap.val();
    if ((room?.readyCount || 0) >= totalPlayers) {
        const timerDuration = room?.settings?.timerDuration ?? 180;
        await update(ref(db, `rooms/${roomCode}`), {
            phase: 'clueGiving',
            currentTurnIndex: 0,
            clueStartTime: Date.now(),
            timerDuration,
        });
    }
}

// ─── Internal: add points to a player ────────────────────────────────────────
export async function addScore(roomCode, uid, points) {
    const scoreRef = ref(db, `rooms/${roomCode}/players/${uid}/score`);
    await runTransaction(scoreRef, (current) => (current || 0) + points);
}

// ─── Internal: score the round outcome ───────────────────────────────────────
// Uses a Firebase transaction on `scored` to ensure only ONE client ever scores.
async function scoreRound(roomCode, outcome) {
    const scoredRef = ref(db, `rooms/${roomCode}/scored`);
    let alreadyScored = false;
    await runTransaction(scoredRef, (current) => {
        if (current === true) { alreadyScored = true; return current; }
        return true; // claim scoring rights
    });
    if (alreadyScored) return; // another client already scored

    const snap = await get(ref(db, `rooms/${roomCode}`));
    if (!snap.exists()) return;
    const room = snap.val();

    const imposterUIDs = Object.entries(room.roles || {})
        .filter(([, v]) => v.role === 'imposter')
        .map(([uid]) => uid);
    const nonImposterUIDs = Object.keys(room.players || {})
        .filter(uid => !imposterUIDs.includes(uid));

    if (outcome === 'players_win') {
        // Players caught imposter and imposter couldn't guess → 100 pts each non-imposter
        for (const uid of nonImposterUIDs) await addScore(roomCode, uid, 100);
    } else if (outcome === 'imposter_escaped') {
        // Imposter not caught → 200 pts each imposter
        for (const uid of imposterUIDs) await addScore(roomCode, uid, 200);
    } else if (outcome === 'imposter_guessed') {
        // Imposter caught but guessed the word → 300 pts each imposter
        for (const uid of imposterUIDs) await addScore(roomCode, uid, 300);
    }
    // 'tie' → no points
}

// ─── Vote ─────────────────────────────────────────────────────────────────────
export async function castVote(roomCode, playerUid, votedUid) {
    await set(ref(db, `rooms/${roomCode}/votes/${playerUid}`), votedUid);
}

export async function checkAndTallyVotes(roomCode) {
    const snap = await get(ref(db, `rooms/${roomCode}`));
    if (!snap.exists()) return;
    const room = snap.val();
    const players = Object.keys(room.players || {});
    const votes = room.votes || {};
    if (Object.keys(votes).length < players.length) return;

    const tally = {};
    Object.values(votes).forEach((v) => { tally[v] = (tally[v] || 0) + 1; });
    let maxVotes = 0;
    let eliminated = null;
    let isTie = false;
    Object.entries(tally).forEach(([uid, count]) => {
        if (count > maxVotes) { maxVotes = count; eliminated = uid; isTie = false; }
        else if (count === maxVotes) { isTie = true; }
    });

    const imposterUIDs = Object.entries(room.roles || {})
        .filter(([, v]) => v.role === 'imposter')
        .map(([uid]) => uid);
    const imposterCaught = !isTie && imposterUIDs.includes(eliminated);
    const imposterEscaped = !isTie && !imposterUIDs.includes(eliminated);

    if (imposterCaught) {
        // Imposter caught → give them 20s to guess the secret word
        await update(ref(db, `rooms/${roomCode}`), {
            phase: 'imposterGuess',
            eliminated,
            finalVotes: votes,
            tally,
            guessDeadline: Date.now() + 20000,
            scored: false,
        });
    } else if (imposterEscaped) {
        // ✅ Imposter escapes → score them 200 pts immediately, then reveal
        await scoreRound(roomCode, 'imposter_escaped');
        await update(ref(db, `rooms/${roomCode}`), {
            phase: 'reveal',
            eliminated,
            finalVotes: votes,
            tally,
        });
    } else {
        // Tie → no points
        await update(ref(db, `rooms/${roomCode}`), {
            phase: 'reveal',
            eliminated: 'tie',
            finalVotes: votes,
            tally,
        });
    }
}

// ─── Imposter guess ──────────────────────────────────────────────────────────
export async function submitImposterGuess(roomCode, guessText) {
    const snap = await get(ref(db, `rooms/${roomCode}`));
    if (!snap.exists()) return;
    const room = snap.val();
    const secretWord = (room.word || '').trim().toLowerCase();
    const correct = guessText.trim().toLowerCase() === secretWord;

    if (correct) {
        // Imposter guessed correctly → 300 pts (escaped after being caught!)
        await scoreRound(roomCode, 'imposter_guessed');
    } else {
        // Imposter guessed wrong → players win → 100 pts each
        await scoreRound(roomCode, 'players_win');
    }

    await update(ref(db, `rooms/${roomCode}`), {
        imposterGuess: guessText.trim(),
        imposterGuessCorrect: correct,
        phase: 'reveal',
    });
}

// ─── Imposter guess timed out (no guess submitted) ───────────────────────────
// Called by host only when the 20s window expires with no guess.
export async function resolveExpiredGuess(roomCode) {
    // Imposter was caught and couldn't guess → players win → 100 pts each
    await scoreRound(roomCode, 'players_win');
    await update(ref(db, `rooms/${roomCode}`), {
        imposterGuess: null,
        imposterGuessCorrect: false,
        phase: 'reveal',
    });
}

// ─── Reset to lobby for next round ───────────────────────────────────────────
export async function resetToLobby(roomCode) {
    const snap = await get(ref(db, `rooms/${roomCode}`));
    if (!snap.exists()) return;
    const room = snap.val();
    await set(ref(db, `rooms/${roomCode}`), {
        category: room.category,
        phase: 'lobby',
        hostId: room.hostId,
        settings: room.settings,
        players: room.players,          // ← scores are preserved here
        roundNumber: (room.roundNumber || 0) + 1,
    });
}
