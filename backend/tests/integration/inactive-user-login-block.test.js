const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');

describe('Inactive User Login Blocking', () => {
    let adminToken;
    let testUserId;
    let testUserPassword = 'test123';
    let testUsername = 'test_login_user';

    beforeAll(async () => {
        // Wait for server to be fully ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Use correct JWT secret
        const secret = 'hr-development-secret-2025';
        
        // Generate admin token for user management operations
        const adminId = '68941a36f348ccab6ce13319'; // Actual admin ID from database
        adminToken = jwt.sign(
            { 
                id: adminId,
                username: 'test_api_admin',
                role: 'Admin'
            },
            secret,
            { 
                expiresIn: '24h',
                issuer: 'hr-system',
                audience: 'hr-frontend'
            }
        );
    });

    afterAll((done) => {
        // Close server to prevent hanging
        if (app && app.server) {
            app.server.close(done);
        } else {
            done();
        }
    });

    it('should block login attempts from deactivated users', async () => {
        // Step 1: Create a test user with known credentials for this test
        const bcrypt = require('bcryptjs');
        const hashedPassword = bcrypt.hashSync(testUserPassword, 10);
        
        // Create test user directly in database
        const { MongoClient, ObjectId } = require('mongodb');
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('SM_nomu');
        
        const testUserDoc = {
            username: 'test_login_block_user_' + Date.now(),
            password: hashedPassword,
            name: 'Test Login Block User',
            role: 'user',
            isActive: true,
            permissions: ['leave:view'],
            department: 'IT',
            employeeId: 'TEST_LOGIN_001',
            hireDate: new Date().toISOString().split('T')[0],
            leaveBalance: 15
        };
        
        const insertResult = await db.collection('users').insertOne(testUserDoc);
        testUserId = insertResult.insertedId.toString();
        testUsername = testUserDoc.username;
        
        await client.close();

        // Step 2: Deactivate the newly created user
        await request(app)
            .put(`/api/users/${testUserId}/deactivate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                reason: 'Test - Login blocking verification'
            })
            .expect(200);

        // Step 3: Attempt to login with the deactivated user using correct password
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                username: testUsername,
                password: testUserPassword
            })
            .expect(401);

        // Step 4: Verify appropriate error message
        expect(loginResponse.body).toHaveProperty('error');
        expect(loginResponse.body.error.toLowerCase()).toContain('deactivated');

        // Step 5: Verify no token is returned
        expect(loginResponse.body).not.toHaveProperty('token');
        expect(loginResponse.body).not.toHaveProperty('user');

        // Step 6: Clean up - delete the test user
        const client2 = new MongoClient('mongodb://localhost:27017');
        await client2.connect();
        const db2 = client2.db('SM_nomu');
        await db2.collection('users').deleteOne({ _id: new ObjectId(testUserId) });
        await client2.close();
    });

    it('should allow login after user reactivation', async () => {
        // Step 1: Create a test user for reactivation testing
        const bcrypt = require('bcryptjs');
        const hashedPassword = bcrypt.hashSync(testUserPassword, 10);
        
        const { MongoClient, ObjectId } = require('mongodb');
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('SM_nomu');
        
        const testUserDoc = {
            username: 'test_reactivation_user_' + Date.now(),
            password: hashedPassword,
            name: 'Test Reactivation User',
            role: 'user',
            isActive: true,
            permissions: ['leave:view'],
            department: 'IT',
            employeeId: 'TEST_REACT_001',
            hireDate: new Date().toISOString().split('T')[0],
            leaveBalance: 15
        };
        
        const insertResult = await db.collection('users').insertOne(testUserDoc);
        testUserId = insertResult.insertedId.toString();
        testUsername = testUserDoc.username;
        
        await client.close();

        // Step 3: Deactivate the user
        await request(app)
            .put(`/api/users/${testUserId}/deactivate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                reason: 'Test - Reactivation verification'
            })
            .expect(200);

        // Step 4: Verify login is blocked while deactivated
        const blockedLoginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                username: testUsername,
                password: testUserPassword
            })
            .expect(401);

        expect(blockedLoginResponse.body.error.toLowerCase()).toContain('deactivated');

        // Step 5: Reactivate the user
        await request(app)
            .put(`/api/users/${testUserId}/reactivate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        // Step 6: Verify login works after reactivation with correct password
        const reactivatedLoginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                username: testUsername,
                password: testUserPassword
            })
            .expect(200);

        // Should get successful login with token
        expect(reactivatedLoginResponse.body).toHaveProperty('token');
        expect(reactivatedLoginResponse.body).toHaveProperty('user');

        // Step 7: Clean up - delete the test user
        const client3 = new MongoClient('mongodb://localhost:27017');
        await client3.connect();
        const db3 = client3.db('SM_nomu');
        await db3.collection('users').deleteOne({ _id: new ObjectId(testUserId) });
        await client3.close();
    });
});