/**
 * Integration Test: Pending Requests Visibility
 * 
 * Test Description:
 * Given: Supervisor logs in
 * When: Leave approval page is accessed
 * Then: All pending requests are listed
 * And: Request details are viewable
 */

const request = require('supertest');
const app = require('../../server');
const { connectToDatabase } = require('../../utils/database');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

describe('Leave Pending Requests Visibility Integration Tests', () => {
    let supervisorToken;
    let adminToken;
    let testSupervisor;
    let testAdmin;
    let testUser;
    let testLeaveRequest;

    beforeAll(async () => {
        const { db } = await connectToDatabase();
        
        // Create test supervisor
        const hashedPassword = await bcrypt.hash('password123', 10);
        const currentYear = new Date().getFullYear();
        
        const supervisorData = {
            name: 'Test Supervisor',
            email: 'supervisor.pending@example.com',
            username: 'supervisor_pending',
            password: hashedPassword,
            role: 'Supervisor',
            department: 'IT',
            employeeId: `${currentYear}7777`,
            startDate: new Date(),
            leaveBalance: 15.0,
            isActive: true,
            permissions: ['leave:view', 'leave:manage'],
            visibleTeams: [{ departmentName: 'IT' }], // Can see IT department requests
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const supervisorResult = await db.collection('users').insertOne(supervisorData);
        testSupervisor = { ...supervisorData, _id: supervisorResult.insertedId };

        // Create test admin
        const adminData = {
            name: 'Test Admin',
            email: 'admin.pending@example.com',
            username: 'admin_pending',
            password: hashedPassword,
            role: 'Admin',
            department: 'IT',
            employeeId: `${currentYear}6666`,
            startDate: new Date(),
            leaveBalance: 20.0,
            isActive: true,
            permissions: ['leave:view', 'leave:manage', 'users:view', 'users:manage'],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const adminResult = await db.collection('users').insertOne(adminData);
        testAdmin = { ...adminData, _id: adminResult.insertedId };

        // Create test regular user
        const userData = {
            name: 'Test User Regular',
            email: 'user.pending@example.com',
            username: 'user_pending',
            password: hashedPassword,
            role: 'User',
            department: 'IT',
            employeeId: `${currentYear}5555`,
            startDate: new Date(),
            leaveBalance: 10.0,
            isActive: true,
            permissions: ['leave:view', 'leave:create'],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const userResult = await db.collection('users').insertOne(userData);
        testUser = { ...userData, _id: userResult.insertedId };

        // Generate tokens
        supervisorToken = jwt.sign(
            { 
                id: testSupervisor._id.toString(),
                username: testSupervisor.username,
                name: testSupervisor.name,
                role: testSupervisor.role,
                department: testSupervisor.department,
                permissions: testSupervisor.permissions,
                visibleTeams: testSupervisor.visibleTeams
            },
            process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-jwt-secret',
            { 
                expiresIn: '24h',
                issuer: 'hr-system',
                audience: 'hr-frontend'
            }
        );

        adminToken = jwt.sign(
            { 
                id: testAdmin._id.toString(),
                username: testAdmin.username,
                name: testAdmin.name,
                role: testAdmin.role,
                permissions: testAdmin.permissions
            },
            process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-jwt-secret',
            { 
                expiresIn: '24h',
                issuer: 'hr-system',
                audience: 'hr-frontend'
            }
        );

        // Create a test leave request with pending status
        const leaveRequestData = {
            userId: testUser._id,
            userName: testUser.name,
            userDepartment: testUser.department,
            leaveType: 'annual',
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
            endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 9 days from now
            daysCount: 3,
            reason: 'Test pending leave request',
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const leaveResult = await db.collection('leaveRequests').insertOne(leaveRequestData);
        testLeaveRequest = { ...leaveRequestData, _id: leaveResult.insertedId };
    });

    afterAll(async () => {
        // Clean up test data
        try {
            const { db } = await connectToDatabase();
            await db.collection('users').deleteMany({ 
                _id: { $in: [testSupervisor._id, testAdmin._id, testUser._id] }
            });
            await db.collection('leaveRequests').deleteOne({ _id: testLeaveRequest._id });
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('GET /api/leave/pending', () => {
        test('Should allow supervisor to view pending requests in their department', async () => {
            const response = await request(app)
                .get('/api/leave/pending')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
            
            // Should include the test leave request from IT department
            const foundRequest = response.body.data.find(req => 
                req._id.toString() === testLeaveRequest._id.toString()
            );
            expect(foundRequest).toBeTruthy();
            expect(foundRequest.status).toBe('pending');
            expect(foundRequest.userDepartment).toBe('IT');
        });

        test('Should allow admin to view all pending requests', async () => {
            const response = await request(app)
                .get('/api/leave/pending')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
            
            // Admin should see all pending requests, including our test request
            const foundRequest = response.body.data.find(req => 
                req._id.toString() === testLeaveRequest._id.toString()
            );
            expect(foundRequest).toBeTruthy();
        });

        test('Should return request details with all necessary information', async () => {
            const response = await request(app)
                .get('/api/leave/pending')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);

            const foundRequest = response.body.data.find(req => 
                req._id.toString() === testLeaveRequest._id.toString()
            );

            if (foundRequest) {
                // Verify all required fields are present
                expect(foundRequest).toHaveProperty('userName');
                expect(foundRequest).toHaveProperty('userDepartment');
                expect(foundRequest).toHaveProperty('leaveType', 'annual');
                expect(foundRequest).toHaveProperty('startDate');
                expect(foundRequest).toHaveProperty('endDate');
                expect(foundRequest).toHaveProperty('daysCount', 3);
                expect(foundRequest).toHaveProperty('reason');
                expect(foundRequest).toHaveProperty('status', 'pending');
                expect(foundRequest).toHaveProperty('createdAt');
            }
        });

        test('Should reject unauthorized access', async () => {
            const response = await request(app)
                .get('/api/leave/pending')
                .expect(401);

            expect(response.body).toHaveProperty('error');
        });

        test('Should reject access from regular users without leave:manage permission', async () => {
            // Create token for regular user (without leave:manage permission)
            const regularUserToken = jwt.sign(
                { 
                    id: testUser._id.toString(),
                    username: testUser.username,
                    name: testUser.name,
                    role: testUser.role,
                    permissions: testUser.permissions // Only has leave:view and leave:create
                },
                process.env.JWT_SECRET || process.env.SESSION_SECRET || 'fallback-jwt-secret',
                { 
                    expiresIn: '24h',
                    issuer: 'hr-system',
                    audience: 'hr-frontend'
                }
            );

            const response = await request(app)
                .get('/api/leave/pending')
                .set('Authorization', `Bearer ${regularUserToken}`)
                .expect(403); // Should be forbidden

            expect(response.body).toHaveProperty('error');
        });

        test('Should sort pending requests by creation date (newest first)', async () => {
            const response = await request(app)
                .get('/api/leave/pending')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            const requests = response.body.data;
            if (requests.length > 1) {
                // Verify sorting: first request should be newer than second
                const firstDate = new Date(requests[0].createdAt);
                const secondDate = new Date(requests[1].createdAt);
                expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
            }
        });
    });
});