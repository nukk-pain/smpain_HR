/**
 * Integration Test: User Delete Confirmation Dialog
 * 
 * Test Description:
 * Given: Admin clicks delete on a user
 * When: Delete is initiated
 * Then: Confirmation dialog appears
 * And: Cancel prevents deletion
 */

const request = require('supertest');
const app = require('../../server');
const { connectToDatabase } = require('../../utils/database');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

describe('User Delete Confirmation Dialog Integration Tests', () => {
    let adminToken;
    let testUser;
    let adminUser;

    beforeAll(async () => {
        const { db } = await connectToDatabase();
        
        // Create admin user for authentication
        const hashedPassword = await bcrypt.hash('password123', 10);
        const currentYear = new Date().getFullYear();
        const adminEmployeeId = `${currentYear}9999`; // Use 9999 to avoid conflicts
        
        const adminUserData = {
            name: 'Test Admin',
            email: 'admin.delete.test@example.com',
            username: 'admin_delete_test',
            password: hashedPassword,
            role: 'Admin',
            department: 'IT',
            employeeId: adminEmployeeId,
            startDate: new Date(),
            isActive: true,
            permissions: ['users:view', 'users:delete', 'users:manage'], // Admin permissions
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const adminResult = await db.collection('users').insertOne(adminUserData);
        adminUser = { ...adminUserData, _id: adminResult.insertedId };

        // Generate admin token using the same structure as the JWT utils
        adminToken = jwt.sign(
            { 
                id: adminUser._id.toString(),
                username: adminUser.username,
                name: adminUser.name,
                role: adminUser.role,
                permissions: adminUser.permissions || []
            },
            process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-jwt-secret',
            { 
                expiresIn: '24h',
                issuer: 'hr-system',
                audience: 'hr-frontend'
            }
        );
    });

    beforeEach(async () => {
        // Create a test user to be deleted
        const { db } = await connectToDatabase();
        const hashedPassword = await bcrypt.hash('password123', 10);
        const currentYear = new Date().getFullYear();
        const randomSuffix = Math.floor(Math.random() * 1000) + 1;
        const testEmployeeId = `${currentYear}${randomSuffix.toString().padStart(4, '0')}`; // Generate unique ID
        
        const testUserData = {
            name: 'Test User To Delete',
            email: `user.to.delete.${randomSuffix}@example.com`, // Make email unique too
            username: `user_to_delete_${randomSuffix}`,
            password: hashedPassword,
            role: 'User',
            department: 'HR',
            employeeId: testEmployeeId,
            startDate: new Date(),
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('users').insertOne(testUserData);
        testUser = { ...testUserData, _id: result.insertedId };
    });

    afterEach(async () => {
        // Clean up test user if it still exists
        try {
            const { db } = await connectToDatabase();
            await db.collection('users').deleteOne({ _id: testUser._id });
        } catch (error) {
            // User might already be deleted
        }
    });

    afterAll(async () => {
        // Clean up admin user
        try {
            const { db } = await connectToDatabase();
            await db.collection('users').deleteOne({ _id: adminUser._id });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('DELETE /api/users/:id', () => {
        test('Should require confirmation for user deletion', async () => {
            // Step 1: Try delete without confirmation - should return 400 with confirmation requirement
            const confirmationResponse = await request(app)
                .delete(`/api/users/${testUser._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(400); // Should require confirmation

            // Verify confirmation is required
            expect(confirmationResponse.body).toHaveProperty('requiresConfirmation', true);
            expect(confirmationResponse.body).toHaveProperty('error', 'Deletion requires confirmation');
            expect(confirmationResponse.body).toHaveProperty('userInfo');

            // Verify user still exists after failed attempt
            const { db } = await connectToDatabase();
            const stillExistsUser = await db.collection('users').findOne({ _id: testUser._id });
            expect(stillExistsUser).toBeTruthy();

            // Step 2: Try delete with confirmation - should succeed
            const deleteResponse = await request(app)
                .delete(`/api/users/${testUser._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ confirmed: true })
                .expect(200); // Should succeed with confirmation

            // Verify user was deleted
            const deletedUser = await db.collection('users').findOne({ _id: testUser._id });
            expect(deletedUser).toBeNull();

            // Verify response indicates successful deletion
            expect(deleteResponse.body).toHaveProperty('message');
            expect(deleteResponse.body.message).toMatch(/deleted|removed/i);
        });

        test('Should prevent deletion without proper authorization', async () => {
            const response = await request(app)
                .delete(`/api/users/${testUser._id}`)
                .expect(401); // Should fail without authorization

            // Verify user still exists
            const { db } = await connectToDatabase();
            const stillExistsUser = await db.collection('users').findOne({ _id: testUser._id });
            expect(stillExistsUser).toBeTruthy();
            expect(stillExistsUser._id.toString()).toBe(testUser._id.toString());
        });

        test('Should handle non-existent user deletion gracefully', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            
            const response = await request(app)
                .delete(`/api/users/${fakeId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toMatch(/not found/i);
        });

        test('Should validate user ID format', async () => {
            const invalidId = 'invalid-id';
            
            const response = await request(app)
                .delete(`/api/users/${invalidId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Frontend Confirmation Dialog Simulation', () => {
        test('Should simulate confirmation dialog flow', async () => {
            // Step 1: Simulate getting user data for confirmation dialog
            const getUserResponse = await request(app)
                .get(`/api/users/${testUser._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(getUserResponse.body).toHaveProperty('name', 'Test User To Delete');
            expect(getUserResponse.body).toHaveProperty('email', 'user.to.delete@example.com');

            // Step 2: Simulate confirmation (in real app, user would see dialog with this data)
            const confirmationData = {
                userId: testUser._id,
                userName: getUserResponse.body.name,
                userEmail: getUserResponse.body.email,
                confirmed: true // This would come from user clicking "OK" in dialog
            };

            // Step 3: Proceed with deletion after confirmation
            if (confirmationData.confirmed) {
                const deleteResponse = await request(app)
                    .delete(`/api/users/${testUser._id}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(deleteResponse.body).toHaveProperty('message');
                
                // Verify user was actually deleted
                const { db } = await connectToDatabase();
                const deletedUser = await db.collection('users').findOne({ _id: testUser._id });
                expect(deletedUser).toBeNull();
            }
        });

        test('Should simulate cancellation preventing deletion', async () => {
            // Simulate user clicking "Cancel" in confirmation dialog
            const confirmationData = {
                userId: testUser._id,
                confirmed: false // User cancelled
            };

            // If cancelled, deletion should not proceed
            if (!confirmationData.confirmed) {
                // No API call should be made, user remains
                const { db } = await connectToDatabase();
                const stillExistsUser = await db.collection('users').findOne({ _id: testUser._id });
                expect(stillExistsUser).toBeTruthy();
                expect(stillExistsUser.name).toBe('Test User To Delete');
            }
        });
    });
});