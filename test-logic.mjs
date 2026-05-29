import fs from 'fs';
import vm from 'vm';
import assert from 'assert';

console.log('🧪 Starting tests for gameLogic...');

try {
    // Read the original game logic file and the categories JSON
    const categoriesRaw = fs.readFileSync('./src/data/categories.json', 'utf8');
    let gameLogicCode = fs.readFileSync('./src/utils/gameLogic.js', 'utf8');

    // Replace ESM import with inline JSON variable
    gameLogicCode = gameLogicCode.replace(
        "import categories from '../data/categories.json';",
        `const categories = ${categoriesRaw};`
    );

    // Replace ESM export declarations with local functions
    gameLogicCode = gameLogicCode.replace(/export function/g, 'function');

    // Run the code in a Node VM sandbox
    const sandbox = {
        console,
        Math,
        Object,
        Array,
        Date
    };
    vm.createContext(sandbox);
    vm.runInContext(gameLogicCode, sandbox);

    const { assignRoles, tallyVotes } = sandbox;

    assert(typeof assignRoles === 'function', 'assignRoles should be defined');
    assert(typeof tallyVotes === 'function', 'tallyVotes should be defined');

    // Test 1: assignRoles
    const players = {
        'p1': { name: 'Alice' },
        'p2': { name: 'Bob' },
        'p3': { name: 'Charlie' },
        'p4': { name: 'Dave' }
    };
    const category = 'General';
    const result = assignRoles(players, category);
    
    assert(result.word !== undefined, 'Should select a word');
    assert(result.roles !== undefined, 'Should generate roles mapping');
    
    const roleEntries = Object.entries(result.roles);
    assert.strictEqual(roleEntries.length, 4, 'Should assign roles to all 4 players');
    
    const imposters = roleEntries.filter(([, v]) => v.role === 'imposter');
    const innocentPlayers = roleEntries.filter(([, v]) => v.role === 'player');
    
    assert.strictEqual(imposters.length, 1, 'Should assign exactly one imposter');
    assert.strictEqual(innocentPlayers.length, 3, 'Should assign exactly 3 players');
    
    assert.strictEqual(imposters[0][1].word, null, 'Imposter should not know the word');
    assert.strictEqual(innocentPlayers[0][1].word, result.word, 'Players should know the correct word');
    
    console.log('✅ Test 1 Passed: assignRoles assigns correct roles and words.');

    // Test 2: tallyVotes (normal case)
    const votes = {
        'p1': 'p2',
        'p2': 'p3',
        'p3': 'p2',
        'p4': 'p2'
    };
    const resultVotes = tallyVotes(votes);
    assert.strictEqual(resultVotes.eliminated, 'p2', 'p2 has 3 votes and should be eliminated');
    assert.strictEqual(resultVotes.isTie, false, 'Should not be a tie');
    assert.strictEqual(resultVotes.tally['p2'], 3, 'p2 should have 3 votes');
    assert.strictEqual(resultVotes.tally['p3'], 1, 'p3 should have 1 vote');
    
    console.log('✅ Test 2 Passed: tallyVotes counts votes and eliminates the majority correctly.');

    // Test 3: tallyVotes (tie case)
    const tieVotes = {
        'p1': 'p2',
        'p2': 'p3',
        'p3': 'p2',
        'p4': 'p3'
    };
    const resultTie = tallyVotes(tieVotes);
    assert.strictEqual(resultTie.eliminated, null, 'Tie should result in no player being eliminated');
    assert.strictEqual(resultTie.isTie, true, 'Should be flagged as a tie');
    assert.strictEqual(resultTie.tally['p2'], 2, 'p2 should have 2 votes');
    assert.strictEqual(resultTie.tally['p3'], 2, 'p3 should have 2 votes');
    
    console.log('✅ Test 3 Passed: tallyVotes handles tie correctly.');

    console.log('🎉 All gameLogic tests passed successfully!');
} catch (error) {
    console.error('❌ Tests Failed:', error);
    process.exit(1);
}
