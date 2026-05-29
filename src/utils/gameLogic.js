import categories from '../data/categories.json';

// ── Fisher-Yates shuffle (unbiased) ──────────────────────────────────────────
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── Assign roles ──────────────────────────────────────────────────────────────
export function assignRoles(players, category, imposterCount = 1) {
    const wordList = categories[category] || categories['General'];

    // Pick a TRULY random word using a secure index
    const wordIndex = Math.floor(Math.random() * wordList.length);
    const word = wordList[wordIndex];

    const playerIds = Object.keys(players);

    // Use Fisher-Yates for unbiased imposter selection
    const shuffled = shuffleArray(playerIds);
    const maxImposters = Math.min(imposterCount, playerIds.length - 1);
    const imposterSet = new Set(shuffled.slice(0, maxImposters));

    const roles = {};
    playerIds.forEach((uid) => {
        roles[uid] = {
            role: imposterSet.has(uid) ? 'imposter' : 'player',
            word: imposterSet.has(uid) ? null : word,
        };
    });

    return { roles, word };
}

// ── Build turn order: imposters can NEVER go first ───────────────────────────
// Returns a shuffled turn order where index 0 is always a non-imposter player.
export function buildTurnOrder(playerIds, roles) {
    const imposters = playerIds.filter(uid => roles[uid]?.role === 'imposter');
    const nonImposters = playerIds.filter(uid => roles[uid]?.role !== 'imposter');

    if (nonImposters.length === 0) return shuffleArray(playerIds); // edge case

    // Shuffle both groups independently
    const shuffledNonImposters = shuffleArray(nonImposters);
    const shuffledImposters = shuffleArray(imposters);

    // Interleave: start with non-imposters, scatter imposters in remaining slots
    const combined = [...shuffledNonImposters, ...shuffledImposters];

    // Now do a constrained shuffle: keep index 0 fixed (non-imposter),
    // shuffle everything from index 1 onwards
    const tail = shuffleArray(combined.slice(1));
    return [combined[0], ...tail];
}

// ── Tally votes ───────────────────────────────────────────────────────────────
export function tallyVotes(votes) {
    const tally = {};
    Object.values(votes).forEach(votedFor => {
        tally[votedFor] = (tally[votedFor] || 0) + 1;
    });
    let maxVotes = 0;
    let eliminated = null;
    let isTie = false;
    Object.entries(tally).forEach(([uid, count]) => {
        if (count > maxVotes) {
            maxVotes = count;
            eliminated = uid;
            isTie = false;
        } else if (count === maxVotes) {
            isTie = true;
        }
    });
    return { eliminated: isTie ? null : eliminated, isTie, tally };
}

// ── Get category names ────────────────────────────────────────────────────────
export function getAvailableCategories() {
    return Object.keys(categories);
}