// AI-HEADER
// Intent: Test-driven development of enhanced PayrollRepository with comprehensive schema
// Domain Meaning: Payroll management including salary, allowances, deductions, and payment tracking
// Misleading Names: monthlyPayments vs payroll - migrating to clearer naming
// Data Contracts: Must include baseSalary, allowances object, deductions object, netSalary calculation
// PII: Contains sensitive salary information
// Invariants: netSalary = baseSalary + totalAllowances - totalDeductions; All monetary values >= 0
// RAG Keywords: payroll test, salary repository, compensation testing, deductions, allowances

const { ObjectId } = require('mongodb');
const { getDatabase } = require('../../utils/database');
const PayrollRepository = require('../../repositories/PayrollRepository');

describe('PayrollRepository - Enhanced Schema', () => {
  let db;
  let payrollRepository;

  beforeAll(async () => {
    // Use real database connection for testing
    db = await getDatabase();
    payrollRepository = new PayrollRepository();
  });

  afterAll(async () => {
    // Clean up test data
    await db.collection('payroll').deleteMany({ _testData: true });
    if (db.client) {
      await db.client.close();
    }
  });

  beforeEach(async () => {
    // Clear test payroll records before each test
    await db.collection('payroll').deleteMany({ _testData: true });
  });

  describe('Enhanced Payroll Schema', () => {
    it('should create payroll record with complete schema including allowances and deductions', async () => {
      const userId = new ObjectId();
      const payrollData = {
        userId: userId,
        year: 2025,
        month: 1,
        baseSalary: 5000000,
        allowances: {
          overtime: 500000,
          position: 300000,
          meal: 200000,
          transportation: 150000,
          other: 100000
        },
        deductions: {
          nationalPension: 225000,
          healthInsurance: 175000,
          employmentInsurance: 45000,
          incomeTax: 150000,
          localIncomeTax: 15000,
          other: 50000
        },
        paymentDate: new Date('2025-01-25'),
        paymentStatus: 'pending',
        createdBy: new ObjectId(),
        approvedBy: null,
        _testData: true
      };

      const result = await payrollRepository.createPayroll(payrollData);

      expect(result).toBeDefined();
      expect(result.userId).toEqual(userId);
      expect(result.year).toBe(2025);
      expect(result.month).toBe(1);
      expect(result.baseSalary).toBe(5000000);
      
      // Check allowances structure
      expect(result.allowances).toBeDefined();
      expect(result.allowances.overtime).toBe(500000);
      expect(result.allowances.position).toBe(300000);
      expect(result.allowances.meal).toBe(200000);
      expect(result.allowances.transportation).toBe(150000);
      expect(result.allowances.other).toBe(100000);
      
      // Check deductions structure
      expect(result.deductions).toBeDefined();
      expect(result.deductions.nationalPension).toBe(225000);
      expect(result.deductions.healthInsurance).toBe(175000);
      expect(result.deductions.employmentInsurance).toBe(45000);
      expect(result.deductions.incomeTax).toBe(150000);
      expect(result.deductions.localIncomeTax).toBe(15000);
      expect(result.deductions.other).toBe(50000);
      
      // Check calculated fields
      expect(result.totalAllowances).toBe(1250000); // Sum of all allowances
      expect(result.totalDeductions).toBe(660000); // Sum of all deductions
      expect(result.netSalary).toBe(5590000); // baseSalary + totalAllowances - totalDeductions
      
      // Check metadata
      expect(result.paymentStatus).toBe('pending');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle payroll record with zero allowances and deductions', async () => {
      const payrollData = {
        userId: new ObjectId(),
        year: 2025,
        month: 1,
        baseSalary: 3000000,
        allowances: {
          overtime: 0,
          position: 0,
          meal: 0,
          transportation: 0,
          other: 0
        },
        deductions: {
          nationalPension: 0,
          healthInsurance: 0,
          employmentInsurance: 0,
          incomeTax: 0,
          localIncomeTax: 0,
          other: 0
        },
        paymentDate: new Date('2025-01-25'),
        paymentStatus: 'pending',
        _testData: true
      };

      const result = await payrollRepository.createPayroll(payrollData);

      expect(result.totalAllowances).toBe(0);
      expect(result.totalDeductions).toBe(0);
      expect(result.netSalary).toBe(3000000); // Only base salary
    });

    it('should update payroll status from pending to approved', async () => {
      const payrollData = {
        userId: new ObjectId(),
        year: 2025,
        month: 1,
        baseSalary: 4000000,
        allowances: {
          overtime: 200000,
          position: 0,
          meal: 0,
          transportation: 0,
          other: 0
        },
        deductions: {
          nationalPension: 180000,
          healthInsurance: 140000,
          employmentInsurance: 36000,
          incomeTax: 100000,
          localIncomeTax: 10000,
          other: 0
        },
        paymentDate: new Date('2025-01-25'),
        paymentStatus: 'pending',
        _testData: true
      };

      const created = await payrollRepository.createPayroll(payrollData);
      const approverId = new ObjectId();
      
      const updated = await payrollRepository.approvePayroll(created._id, approverId);

      expect(updated.paymentStatus).toBe('approved');
      expect(updated.approvedBy).toEqual(approverId);
      expect(updated.approvedAt).toBeInstanceOf(Date);
    });

    it('should find payroll by user and period with new schema', async () => {
      const userId = new ObjectId();
      await payrollRepository.createPayroll({
        userId: userId,
        year: 2025,
        month: 1,
        baseSalary: 5000000,
        allowances: {
          overtime: 300000,
          position: 200000,
          meal: 150000,
          transportation: 100000,
          other: 50000
        },
        deductions: {
          nationalPension: 225000,
          healthInsurance: 175000,
          employmentInsurance: 45000,
          incomeTax: 150000,
          localIncomeTax: 15000,
          other: 0
        },
        paymentDate: new Date('2025-01-25'),
        paymentStatus: 'paid',
        _testData: true
      });

      const result = await payrollRepository.findByUserAndPeriod(userId, 2025, 1);

      expect(result).toBeDefined();
      expect(result.userId).toEqual(userId);
      expect(result.year).toBe(2025);
      expect(result.month).toBe(1);
      expect(result.baseSalary).toBe(5000000);
      expect(result.totalAllowances).toBe(800000);
      expect(result.totalDeductions).toBe(610000);
      expect(result.netSalary).toBe(5190000);
      expect(result.paymentStatus).toBe('paid');
    });

    it('should calculate payroll summary for a given period', async () => {
      // Create multiple payroll records
      await payrollRepository.createPayroll({
        userId: new ObjectId(),
        year: 2025,
        month: 1,
        baseSalary: 5000000,
        allowances: { overtime: 500000, position: 300000, meal: 200000, transportation: 150000, other: 0 },
        deductions: { nationalPension: 225000, healthInsurance: 175000, employmentInsurance: 45000, incomeTax: 150000, localIncomeTax: 15000, other: 0 },
        paymentDate: new Date('2025-01-25'),
        paymentStatus: 'paid',
        _testData: true
      });

      await payrollRepository.createPayroll({
        userId: new ObjectId(),
        year: 2025,
        month: 1,
        baseSalary: 4000000,
        allowances: { overtime: 200000, position: 0, meal: 150000, transportation: 100000, other: 0 },
        deductions: { nationalPension: 180000, healthInsurance: 140000, employmentInsurance: 36000, incomeTax: 100000, localIncomeTax: 10000, other: 0 },
        paymentDate: new Date('2025-01-25'),
        paymentStatus: 'paid',
        _testData: true
      });

      const summary = await payrollRepository.getPayrollSummaryByPeriod(2025, 1);

      expect(summary).toBeDefined();
      expect(summary.totalEmployees).toBe(2);
      expect(summary.totalBaseSalary).toBe(9000000);
      expect(summary.totalAllowances).toBe(1600000); // 1150000 + 450000
      expect(summary.totalDeductions).toBe(1076000); // 610000 + 466000
      expect(summary.totalNetPay).toBe(9524000); // 9000000 + 1600000 - 1076000
      expect(summary.averageBaseSalary).toBe(4500000);
      expect(summary.averageNetPay).toBe(4762000);
    });

    it('should prevent duplicate payroll for same user and period', async () => {
      const userId = new ObjectId();
      const payrollData = {
        userId: userId,
        year: 2025,
        month: 1,
        baseSalary: 5000000,
        allowances: { overtime: 0, position: 0, meal: 0, transportation: 0, other: 0 },
        deductions: { nationalPension: 0, healthInsurance: 0, employmentInsurance: 0, incomeTax: 0, localIncomeTax: 0, other: 0 },
        paymentDate: new Date('2025-01-25'),
        paymentStatus: 'pending',
        _testData: true
      };

      await payrollRepository.createPayroll(payrollData);
      
      await expect(payrollRepository.createPayroll(payrollData))
        .rejects.toThrow('Payroll record already exists for this user and period');
    });
  });
});