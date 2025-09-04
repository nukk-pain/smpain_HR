/*
 * AI-HEADER
 * Intent: Unit tests for payroll calculation logic
 * Domain Meaning: Tests payroll calculation accuracy and edge cases
 * Misleading Names: None
 * Data Contracts: Tests allowances, deductions, net salary calculations
 * PII: Uses test salary data only
 * Invariants: Net salary = base + allowances - deductions
 * RAG Keywords: payroll, calculation, unit test, allowances, deductions
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-calculation-unit-tests
 */

const PayrollRepository = require('../../repositories/PayrollRepository');

describe('Payroll Calculation Logic', () => {
  let payrollRepo;

  beforeEach(() => {
    payrollRepo = new PayrollRepository();
  });

  describe('calculatePayrollTotals', () => {
    test('should calculate totals with all allowances and deductions', () => {
      const payrollData = {
        baseSalary: 3000000,
        allowances: {
          overtime: 200000,
          position: 150000,
          meal: 100000,
          transportation: 50000,
          other: 25000
        },
        deductions: {
          nationalPension: 135000,
          healthInsurance: 120000,
          employmentInsurance: 27000,
          incomeTax: 180000,
          localIncomeTax: 18000,
          other: 10000
        }
      };

      const result = payrollRepo.calculatePayrollTotals(payrollData);

      expect(result.totalAllowances).toBe(525000); // 200k + 150k + 100k + 50k + 25k
      expect(result.totalDeductions).toBe(490000); // 135k + 120k + 27k + 180k + 18k + 10k
      expect(result.netSalary).toBe(3035000); // 3M + 525k - 490k
    });

    test('should handle zero allowances and deductions', () => {
      const payrollData = {
        baseSalary: 2500000,
        allowances: {},
        deductions: {}
      };

      const result = payrollRepo.calculatePayrollTotals(payrollData);

      expect(result.totalAllowances).toBe(0);
      expect(result.totalDeductions).toBe(0);
      expect(result.netSalary).toBe(2500000);
    });

    test('should handle missing allowances and deductions objects', () => {
      const payrollData = {
        baseSalary: 2800000
      };

      const result = payrollRepo.calculatePayrollTotals(payrollData);

      expect(result.totalAllowances).toBe(0);
      expect(result.totalDeductions).toBe(0);
      expect(result.netSalary).toBe(2800000);
    });

    test('should handle partial allowances and deductions', () => {
      const payrollData = {
        baseSalary: 3200000,
        allowances: {
          overtime: 300000,
          meal: 150000
          // position, transportation, other not provided
        },
        deductions: {
          nationalPension: 144000,
          healthInsurance: 128000
          // employmentInsurance, incomeTax, localIncomeTax, other not provided
        }
      };

      const result = payrollRepo.calculatePayrollTotals(payrollData);

      expect(result.totalAllowances).toBe(450000); // 300k + 150k
      expect(result.totalDeductions).toBe(272000); // 144k + 128k
      expect(result.netSalary).toBe(3378000); // 3.2M + 450k - 272k
    });

    test('should handle negative base salary (edge case)', () => {
      const payrollData = {
        baseSalary: -1000000, // Edge case - should not happen in real world
        allowances: {
          overtime: 200000
        },
        deductions: {
          nationalPension: 50000
        }
      };

      const result = payrollRepo.calculatePayrollTotals(payrollData);

      expect(result.totalAllowances).toBe(200000);
      expect(result.totalDeductions).toBe(50000);
      expect(result.netSalary).toBe(-850000); // -1M + 200k - 50k
    });

    test('should handle very large numbers', () => {
      const payrollData = {
        baseSalary: 100000000, // 100M - CEO level
        allowances: {
          position: 20000000,
          other: 5000000
        },
        deductions: {
          incomeTax: 30000000,
          localIncomeTax: 3000000
        }
      };

      const result = payrollRepo.calculatePayrollTotals(payrollData);

      expect(result.totalAllowances).toBe(25000000);
      expect(result.totalDeductions).toBe(33000000);
      expect(result.netSalary).toBe(92000000); // 100M + 25M - 33M
    });

    test('should handle decimal values correctly', () => {
      const payrollData = {
        baseSalary: 2500000.50,
        allowances: {
          overtime: 150000.25,
          meal: 99999.99
        },
        deductions: {
          nationalPension: 112500.33,
          incomeTax: 175000.67
        }
      };

      const result = payrollRepo.calculatePayrollTotals(payrollData);

      expect(result.totalAllowances).toBeCloseTo(250000.24, 2);
      expect(result.totalDeductions).toBeCloseTo(287501.00, 2);
      expect(result.netSalary).toBeCloseTo(2462499.74, 2); // 2500000.50 + 250000.24 - 287501.00
    });
  });

  describe('Payroll Data Validation', () => {
    test('should validate required fields', () => {
      const invalidData = {
        baseSalary: 3000000
        // missing userId, year, month
      };

      expect(() => {
        payrollRepo.validatePayrollData(invalidData, true); // strict validation
      }).toThrow();
    });

    test('should validate numeric ranges', () => {
      const invalidYear = {
        userId: '507f1f77bcf86cd799439011',
        year: 2015, // too old
        month: 6,
        baseSalary: 3000000
      };

      expect(() => {
        payrollRepo.validatePayrollData(invalidYear, true);
      }).toThrow();

      const invalidMonth = {
        userId: '507f1f77bcf86cd799439011',
        year: 2024,
        month: 13, // invalid month
        baseSalary: 3000000
      };

      expect(() => {
        payrollRepo.validatePayrollData(invalidMonth, true);
      }).toThrow();
    });

    test('should validate negative salary', () => {
      const negativeSalary = {
        userId: '507f1f77bcf86cd799439011',
        year: 2024,
        month: 8,
        baseSalary: -1000
      };

      expect(() => {
        payrollRepo.validatePayrollData(negativeSalary, true);
      }).toThrow();
    });

    test('should pass valid data', () => {
      const validData = {
        userId: '507f1f77bcf86cd799439011',
        year: 2024,
        month: 8,
        baseSalary: 3000000,
        allowances: {
          overtime: 200000,
          meal: 150000
        },
        deductions: {
          nationalPension: 135000,
          incomeTax: 180000
        }
      };

      expect(() => {
        payrollRepo.validatePayrollData(validData, true);
      }).not.toThrow();
    });
  });

  describe('Payroll Period Validation', () => {
    test('should validate duplicate payroll periods', () => {
      const mockFindExisting = jest.fn().mockResolvedValue({
        _id: 'existing-record',
        userId: '507f1f77bcf86cd799439011',
        year: 2024,
        month: 8
      });

      // Mock the findByUserAndPeriod method
      payrollRepo.findByUserAndPeriod = mockFindExisting;

      const duplicateData = {
        userId: '507f1f77bcf86cd799439011',
        year: 2024,
        month: 8,
        baseSalary: 3000000
      };

      return expect(payrollRepo.checkDuplicatePeriod(duplicateData))
        .rejects.toThrow('already exists');
    });

    test('should allow new payroll periods', async () => {
      const mockFindExisting = jest.fn().mockResolvedValue(null);

      // Mock the findByUserAndPeriod method
      payrollRepo.findByUserAndPeriod = mockFindExisting;

      const newData = {
        userId: '507f1f77bcf86cd799439011',
        year: 2024,
        month: 9,
        baseSalary: 3000000
      };

      await expect(payrollRepo.checkDuplicatePeriod(newData))
        .resolves.not.toThrow();

      expect(mockFindExisting).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        2024,
        9
      );
    });
  });

  describe('Payroll Status Management', () => {
    test('should validate status transitions', () => {
      const validTransitions = [
        { from: 'pending', to: 'approved' },
        { from: 'approved', to: 'paid' },
        { from: 'pending', to: 'cancelled' },
        { from: 'approved', to: 'cancelled' }
      ];

      validTransitions.forEach(({ from, to }) => {
        expect(() => {
          payrollRepo.validateStatusTransition(from, to);
        }).not.toThrow();
      });
    });

    test('should reject invalid status transitions', () => {
      const invalidTransitions = [
        { from: 'paid', to: 'pending' },
        { from: 'paid', to: 'approved' },
        { from: 'cancelled', to: 'approved' },
        { from: 'cancelled', to: 'paid' }
      ];

      invalidTransitions.forEach(({ from, to }) => {
        expect(() => {
          payrollRepo.validateStatusTransition(from, to);
        }).toThrow();
      });
    });
  });

  describe('Monthly Payroll Summary', () => {
    test('should calculate monthly summary correctly', () => {
      const monthlyRecords = [
        {
          baseSalary: 3000000,
          totalAllowances: 500000,
          totalDeductions: 450000,
          netSalary: 3050000,
          paymentStatus: 'paid'
        },
        {
          baseSalary: 2800000,
          totalAllowances: 400000,
          totalDeductions: 420000,
          netSalary: 2780000,
          paymentStatus: 'paid'
        },
        {
          baseSalary: 3200000,
          totalAllowances: 600000,
          totalDeductions: 480000,
          netSalary: 3320000,
          paymentStatus: 'pending'
        }
      ];

      const summary = payrollRepo.calculateMonthlySummary(monthlyRecords);

      expect(summary.totalEmployees).toBe(3);
      expect(summary.totalBaseSalary).toBe(9000000);
      expect(summary.totalAllowances).toBe(1500000);
      expect(summary.totalDeductions).toBe(1350000);
      expect(summary.totalNetSalary).toBe(9150000);
      expect(summary.paidCount).toBe(2);
      expect(summary.pendingCount).toBe(1);
      expect(summary.averageNetSalary).toBeCloseTo(3050000, 0);
    });

    test('should handle empty records', () => {
      const summary = payrollRepo.calculateMonthlySummary([]);

      expect(summary.totalEmployees).toBe(0);
      expect(summary.totalBaseSalary).toBe(0);
      expect(summary.averageNetSalary).toBe(0);
    });
  });
});