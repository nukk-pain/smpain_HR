// Test script to analyze NoSQL injection vulnerability
const { MongoClient } = require('mongodb');

async function testMongoDBInjection() {
    const client = new MongoClient('mongodb://localhost:27017');
    
    try {
        await client.connect();
        const db = client.db('test_db');
        const collection = db.collection('test_users');
        
        // Insert a test user
        await collection.deleteMany({});
        await collection.insertOne({
            username: 'testuser',
            password: 'hashedpassword',
            role: 'user'
        });
        
        console.log('=== Testing NoSQL Injection Scenarios ===\n');
        
        // Test 1: Normal string input (safe)
        console.log('Test 1: Normal string input');
        const username1 = 'testuser';
        const result1 = await collection.findOne({ username: username1 });
        console.log('Input:', JSON.stringify(username1));
        console.log('Result:', result1 ? 'Found user' : 'No user found');
        console.log('');
        
        // Test 2: Object injection attempt (potential vulnerability)
        console.log('Test 2: Object injection attempt');
        const username2 = { $ne: null };
        const result2 = await collection.findOne({ username: username2 });
        console.log('Input:', JSON.stringify(username2));
        console.log('Result:', result2 ? 'Found user (VULNERABLE!)' : 'No user found');
        console.log('');
        
        // Test 3: Regex injection attempt
        console.log('Test 3: Regex injection attempt');
        const username3 = { $regex: '.*' };
        const result3 = await collection.findOne({ username: username3 });
        console.log('Input:', JSON.stringify(username3));
        console.log('Result:', result3 ? 'Found user (VULNERABLE!)' : 'No user found');
        console.log('');
        
        // Test 4: What Express.json() parses from request body
        console.log('Test 4: Simulating Express.json() parsing');
        
        // Simulate what would be sent as JSON in request body
        const jsonPayloads = [
            '{"username": "testuser", "password": "test"}',
            '{"username": {"$ne": null}, "password": "test"}',
            '{"username": {"$regex": ".*"}, "password": "test"}'
        ];
        
        for (let i = 0; i < jsonPayloads.length; i++) {
            const parsed = JSON.parse(jsonPayloads[i]);
            const result = await collection.findOne({ username: parsed.username });
            console.log(`Payload ${i + 1}:`, jsonPayloads[i]);
            console.log('Parsed username:', JSON.stringify(parsed.username));
            console.log('Result:', result ? 'Found user' + (typeof parsed.username === 'object' ? ' (VULNERABLE!)' : '') : 'No user found');
            console.log('');
        }
        
        // Test 5: Type checking
        console.log('Test 5: Type checking');
        const inputs = ['testuser', 123, true, null, { $ne: null }, ['test']];
        
        for (const input of inputs) {
            try {
                const result = await collection.findOne({ username: input });
                console.log(`Input: ${JSON.stringify(input)} (${typeof input})`);
                console.log(`Result: ${result ? 'Found user' : 'No user found'}`);
                if (typeof input === 'object' && input !== null && result) {
                    console.log('  ⚠️ POTENTIAL VULNERABILITY');
                }
            } catch (error) {
                console.log(`Input: ${JSON.stringify(input)} - Error: ${error.message}`);
            }
            console.log('');
        }
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await client.close();
    }
}

// Run the test
testMongoDBInjection().catch(console.error);