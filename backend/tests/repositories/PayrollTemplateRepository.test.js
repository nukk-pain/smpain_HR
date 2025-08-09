// AI-HEADER
// Intent: Test-driven development of PayrollTemplateRepository for payroll calculation templates
// Domain Meaning: Template-based payroll calculation rules and configurations
// Misleading Names: template vs rule - both define calculation patterns but templates are reusable
// Data Contracts: Must include name, description, calculation rules for allowances and deductions
// PII: May contain salary range information
// Invariants: Template must be valid JSON, rules must be executable, isActive must be boolean
// RAG Keywords: payroll template test, calculation rules, template repository, salary template

const { ObjectId } = require('mongodb');
const { getDatabase } = require('../../utils/database');
const PayrollTemplateRepository = require('../../repositories/PayrollTemplateRepository');

describe('PayrollTemplateRepository', () => {
  let db;
  let payrollTemplateRepository;

  beforeAll(async () => {
    // Use real database connection for testing
    db = await getDatabase();
    payrollTemplateRepository = new PayrollTemplateRepository();
  });

  afterAll(async () => {
    // Clean up test data
    await db.collection('payroll_templates').deleteMany({ _testData: true });
  });

  beforeEach(async () => {
    // Clear test template records before each test
    await db.collection('payroll_templates').deleteMany({ _testData: true });
  });

  describe('PayrollTemplate Schema and Operations', () => {
    it('should create payroll template with complete calculation rules', async () => {
      const templateData = {
        name: 'Standard Employee Template',
        description: 'Default template for regular employees',
        baseSalaryRules: {
          formula: 'fixed',
          amount: 5000000,
          currency: 'KRW'
        },
        allowanceRules: {
          overtime: {
            formula: 'hourly_rate * hours * 1.5',
            baseRate: 25000,
            maxHours: 40
          },
          position: {
            formula: 'percentage',
            percentage: 0.1,
            basedOn: 'baseSalary'
          },
          meal: {
            formula: 'fixed',
            amount: 200000
          },
          transportation: {
            formula: 'fixed', 
            amount: 150000
          }
        },
        deductionRules: {
          nationalPension: {
            formula: 'percentage',
            percentage: 0.045,
            basedOn: 'baseSalary',
            maxAmount: 243000
          },
          healthInsurance: {
            formula: 'percentage', 
            percentage: 0.035,
            basedOn: 'baseSalary'
          },
          employmentInsurance: {
            formula: 'percentage',
            percentage: 0.009, 
            basedOn: 'baseSalary'
          },
          incomeTax: {
            formula: 'tax_table',
            brackets: [
              { min: 0, max: 12000000, rate: 0.06 },
              { min: 12000001, max: 46000000, rate: 0.15 },
              { min: 46000001, max: 88000000, rate: 0.24 }
            ]
          }
        },
        isActive: true,
        _testData: true
      };

      const result = await payrollTemplateRepository.createTemplate(templateData);

      expect(result).toBeDefined();
      expect(result.name).toBe('Standard Employee Template');
      expect(result.description).toBe('Default template for regular employees');
      expect(result.isActive).toBe(true);
      
      // Check base salary rules
      expect(result.baseSalaryRules).toBeDefined();
      expect(result.baseSalaryRules.formula).toBe('fixed');
      expect(result.baseSalaryRules.amount).toBe(5000000);
      
      // Check allowance rules structure
      expect(result.allowanceRules).toBeDefined();
      expect(result.allowanceRules.overtime).toBeDefined();
      expect(result.allowanceRules.overtime.formula).toBe('hourly_rate * hours * 1.5');
      expect(result.allowanceRules.position.percentage).toBe(0.1);
      
      // Check deduction rules structure  
      expect(result.deductionRules).toBeDefined();
      expect(result.deductionRules.nationalPension.percentage).toBe(0.045);
      expect(result.deductionRules.incomeTax.formula).toBe('tax_table');
      expect(result.deductionRules.incomeTax.brackets).toHaveLength(3);
      
      // Check metadata
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should find active templates only', async () => {
      // Create active template
      await payrollTemplateRepository.createTemplate({
        name: 'Active Template',
        description: 'This template is active',
        baseSalaryRules: { formula: 'fixed', amount: 4000000 },
        allowanceRules: {},
        deductionRules: {},
        isActive: true,
        _testData: true
      });

      // Create inactive template
      await payrollTemplateRepository.createTemplate({
        name: 'Inactive Template', 
        description: 'This template is inactive',
        baseSalaryRules: { formula: 'fixed', amount: 3000000 },
        allowanceRules: {},
        deductionRules: {},
        isActive: false,
        _testData: true
      });

      const activeTemplates = await payrollTemplateRepository.findActiveTemplates();

      expect(activeTemplates).toHaveLength(1);
      expect(activeTemplates[0].name).toBe('Active Template');
      expect(activeTemplates[0].isActive).toBe(true);
    });

    it('should apply template to calculate payroll', async () => {
      const template = await payrollTemplateRepository.createTemplate({
        name: 'Test Calculation Template',
        description: 'Template for testing calculations',
        baseSalaryRules: {
          formula: 'fixed',
          amount: 6000000
        },
        allowanceRules: {
          overtime: {
            formula: 'fixed',
            amount: 500000
          },
          position: {
            formula: 'percentage',
            percentage: 0.15,
            basedOn: 'baseSalary'
          },
          meal: {
            formula: 'fixed',
            amount: 200000
          }
        },
        deductionRules: {
          nationalPension: {
            formula: 'percentage',
            percentage: 0.045,
            basedOn: 'baseSalary'
          },
          healthInsurance: {
            formula: 'percentage',
            percentage: 0.035,
            basedOn: 'baseSalary'
          }
        },
        isActive: true,
        _testData: true
      });

      const calculationParams = {
        overtimeHours: 10,
        specialAllowances: {},
        additionalDeductions: {}
      };

      const calculatedPayroll = await payrollTemplateRepository.applyTemplate(template._id, calculationParams);

      expect(calculatedPayroll).toBeDefined();
      expect(calculatedPayroll.baseSalary).toBe(6000000);
      expect(calculatedPayroll.allowances.overtime).toBe(500000);
      expect(calculatedPayroll.allowances.position).toBe(900000); // 15% of 6000000
      expect(calculatedPayroll.allowances.meal).toBe(200000);
      expect(calculatedPayroll.deductions.nationalPension).toBe(270000); // 4.5% of 6000000
      expect(calculatedPayroll.deductions.healthInsurance).toBe(210000); // 3.5% of 6000000
      
      expect(calculatedPayroll.totalAllowances).toBe(1600000); // 500000 + 900000 + 200000
      expect(calculatedPayroll.totalDeductions).toBe(480000); // 270000 + 210000
      expect(calculatedPayroll.netSalary).toBe(7120000); // 6000000 + 1600000 - 480000
    });

    it('should update template and maintain version history', async () => {
      const originalTemplate = await payrollTemplateRepository.createTemplate({
        name: 'Version Test Template',
        description: 'Testing version updates',
        baseSalaryRules: { formula: 'fixed', amount: 5000000 },
        allowanceRules: {},
        deductionRules: {},
        isActive: true,
        _testData: true
      });

      const updatedData = {
        description: 'Updated description',
        baseSalaryRules: { formula: 'fixed', amount: 5500000 },
        allowanceRules: {
          newAllowance: { formula: 'fixed', amount: 100000 }
        }
      };

      const updated = await payrollTemplateRepository.updateTemplate(originalTemplate._id, updatedData);

      expect(updated.description).toBe('Updated description');
      expect(updated.baseSalaryRules.amount).toBe(5500000);
      expect(updated.allowanceRules.newAllowance).toBeDefined();
      expect(updated.version).toBe(2);
      expect(updated.updatedAt).toBeInstanceOf(Date);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalTemplate.createdAt.getTime());
    });

    it('should deactivate template instead of deleting', async () => {
      const template = await payrollTemplateRepository.createTemplate({
        name: 'Template to Deactivate',
        description: 'This will be deactivated',
        baseSalaryRules: { formula: 'fixed', amount: 4000000 },
        allowanceRules: {},
        deductionRules: {},
        isActive: true,
        _testData: true
      });

      const deactivated = await payrollTemplateRepository.deactivateTemplate(template._id);

      expect(deactivated.isActive).toBe(false);
      expect(deactivated.deactivatedAt).toBeInstanceOf(Date);
      
      // Verify it doesn't appear in active templates
      const activeTemplates = await payrollTemplateRepository.findActiveTemplates();
      const foundTemplate = activeTemplates.find(t => t._id.toString() === template._id.toString());
      expect(foundTemplate).toBeUndefined();
    });

    it('should prevent duplicate template names', async () => {
      const templateData = {
        name: 'Duplicate Name Template',
        description: 'First template',
        baseSalaryRules: { formula: 'fixed', amount: 5000000 },
        allowanceRules: {},
        deductionRules: {},
        isActive: true,
        _testData: true
      };

      await payrollTemplateRepository.createTemplate(templateData);
      
      // Try to create another template with same name
      const duplicateData = {
        ...templateData,
        description: 'Second template with same name'
      };

      await expect(payrollTemplateRepository.createTemplate(duplicateData))
        .rejects.toThrow('Template with this name already exists');
    });
  });
});