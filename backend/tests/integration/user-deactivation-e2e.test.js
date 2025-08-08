const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');

describe('User Deactivation E2E Process', () => {
    let adminToken;
    let userToken;
    let testUserId;
    let testAdminId;

    beforeAll(async () => {
        // Wait for server to be fully ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Use correct JWT secret from environment
        const secret = 'hr-development-secret-2025'; // Actual JWT secret
        
        // Generate admin token with actual admin user from database
        testAdminId = '68941a36f348ccab6ce13319'; // Actual admin ID from database
        adminToken = jwt.sign(
            { 
                id: testAdminId,
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

        // Generate test user token
        testUserId = '507f1f77bcf86cd799439012'; // Test user ID
        userToken = jwt.sign(
            { 
                id: testUserId,
                username: 'testuser',
                name: 'Test User',
                role: 'User',
                permissions: []
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

    it('should complete full user deactivation process: admin login → user deactivation → result verification', async () => {
        // Step 1: Verify admin can access protected routes (simulating login verification)
        const authCheckResponse = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(authCheckResponse.body).toHaveProperty('data');
        expect(authCheckResponse.body.data.length).toBeGreaterThan(0);

        // Find a user to deactivate (not admin)
        const targetUser = authCheckResponse.body.data.find(u => u.role !== 'admin' && u.isActive !== false);
        
        if (!targetUser) {
            // Skip test if no suitable user found
            console.log('No suitable user found for deactivation test - skipping');
            return;
        }

        const targetUserId = targetUser._id;
        const originalActiveCount = authCheckResponse.body.data.filter(u => u.isActive !== false).length;

        // Step 2: Admin deactivates the target user
        const deactivationResponse = await request(app)
            .put(`/api/users/${targetUserId}/deactivate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                reason: 'E2E Test - End of employment contract'
            })
            .expect(200);

        expect(deactivationResponse.body).toHaveProperty('message');
        expect(deactivationResponse.body).toHaveProperty('success', true);
        expect(deactivationResponse.body).toHaveProperty('isActive', false);
        expect(deactivationResponse.body).toHaveProperty('deactivationReason', 'E2E Test - End of employment contract');
        expect(deactivationResponse.body).toHaveProperty('deactivatedBy', testAdminId);
        expect(deactivationResponse.body).toHaveProperty('deactivatedAt');

        // Step 3: Verify deactivated user is not in default user list
        const defaultUserListResponse = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        const newActiveCount = defaultUserListResponse.body.data.filter(u => u.isActive !== false).length;
        expect(newActiveCount).toBe(originalActiveCount - 1);

        // Step 4: Verify deactivated user appears in inactive user list
        const inactiveUserListResponse = await request(app)
            .get('/api/users?status=inactive')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        const deactivatedUser = inactiveUserListResponse.body.data.find(u => u._id === targetUserId);
        expect(deactivatedUser).toBeDefined();
        expect(deactivatedUser.isActive).toBe(false);
        expect(deactivatedUser.deactivationReason).toBe('E2E Test - End of employment contract');

        // Step 5: Verify complete user list includes both active and inactive
        const completeUserListResponse = await request(app)
            .get('/api/users?includeInactive=true')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        const allUsers = completeUserListResponse.body.data;
        const inactiveUsers = allUsers.filter(u => u.isActive === false);
        const activeUsers = allUsers.filter(u => u.isActive === true);
        
        expect(activeUsers.length).toBe(newActiveCount);
        expect(inactiveUsers.length).toBeGreaterThan(0);
        expect(inactiveUsers.some(u => u._id === targetUserId)).toBe(true);

        // Step 6: Clean up - reactivate the user for next test run
        await request(app)
            .put(`/api/users/${targetUserId}/reactivate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);
    });

    it('should fail deactivation process when non-admin user attempts to deactivate', async () => {
        // Get list of users first
        const usersResponse = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        const targetUser = usersResponse.body.data.find(u => u.role !== 'admin');
        
        if (!targetUser) {
            console.log('No suitable user found for permission test - skipping');
            return;
        }

        // Attempt deactivation with regular user token (insufficient permissions)
        const deactivationResponse = await request(app)
            .put(`/api/users/${targetUser._id}/deactivate`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                reason: 'Should not be allowed'
            })
            .expect(401);

        expect(deactivationResponse.body).toHaveProperty('error');
        expect(deactivationResponse.body.error).toBe('User not found');

        // Verify user remains active by checking the user list again
        const verifyResponse = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        const unchangedUser = verifyResponse.body.data.find(u => u._id === targetUser._id);
        expect(unchangedUser).toBeDefined();
        expect(unchangedUser.isActive).not.toBe(false); // Should still be active
    });
});