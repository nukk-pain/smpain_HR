// AI-HEADER
// Intent: PayrollTemplateRepository for managing payroll calculation templates and rules
// Domain Meaning: Template-based payroll calculation system for standardized salary processing
// Misleading Names: template vs rule vs schema - template contains rules, rules define calculations
// Data Contracts: Must include name, description, calculation rules, isActive status
// PII: May contain salary range information in rules
// Invariants: Templates must have valid calculation rules, names must be unique when active
// RAG Keywords: payroll template, calculation rules, salary template, payroll automation

const BaseRepository = require('./BaseRepository');
const { ObjectId } = require('mongodb');

class PayrollTemplateRepository extends BaseRepository {
  constructor() {
    super('payroll_templates');
  }

  /**
   * AI-HEADER
   * DomainMeaning: Create new payroll template with calculation rules
   * MisleadingNames: createTemplate vs addTemplate - both create new templates
   * SideEffects: Inserts template into payroll_templates collection, validates uniqueness
   * Invariants: Template name must be unique among active templates
   * RAG_Keywords: template creation, payroll rules, calculation template
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(createTemplate_payroll_rules)
   */
  async createTemplate(templateData) {
    try {
      // Check for duplicate active template names
      const existing = await this.findOne({
        name: templateData.name,
        isActive: true
      });

      if (existing) {
        throw new Error('Template with this name already exists');
      }

      // Prepare full template record with defaults
      const fullRecord = {
        ...templateData,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await this.create(fullRecord);
      return result;
    } catch (error) {
      if (error.message.includes('already exists')) {
        throw error;
      }
      throw new Error(`Error creating payroll template: ${error.message}`);
    }
  }

  /**
   * AI-HEADER
   * DomainMeaning: Find all active payroll templates
   * MisleadingNames: findActiveTemplates vs getActiveTemplates - both return active templates
   * SideEffects: None - read-only operation
   * Invariants: Only returns templates where isActive = true
   * RAG_Keywords: active templates, template lookup, available templates
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(findActiveTemplates_lookup)
   */
  async findActiveTemplates() {
    try {
      return await this.findAll(
        { isActive: true },
        { sort: { name: 1 } }
      );
    } catch (error) {
      throw new Error(`Error finding active templates: ${error.message}`);
    }
  }

  /**
   * AI-HEADER
   * DomainMeaning: Apply template rules to calculate payroll amounts
   * MisleadingNames: applyTemplate vs calculatePayroll - both perform calculations
   * SideEffects: None - pure calculation, does not modify data
   * Invariants: Returns calculated amounts based on template rules and parameters
   * RAG_Keywords: payroll calculation, template application, salary computation
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(applyTemplate_calculation)
   */
  async applyTemplate(templateId, calculationParams = {}) {
    try {
      const template = await this.findById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      if (!template.isActive) {
        throw new Error('Template is not active');
      }

      // Calculate base salary
      const baseSalary = this._calculateBaseSalary(template.baseSalaryRules, calculationParams);

      // Calculate allowances
      const allowances = this._calculateAllowances(template.allowanceRules, baseSalary, calculationParams);

      // Calculate deductions  
      const deductions = this._calculateDeductions(template.deductionRules, baseSalary, calculationParams);

      // Calculate totals
      const totalAllowances = Object.values(allowances).reduce((sum, val) => sum + (val || 0), 0);
      const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + (val || 0), 0);
      const netSalary = baseSalary + totalAllowances - totalDeductions;

      return {
        baseSalary,
        allowances,
        deductions,
        totalAllowances,
        totalDeductions,
        netSalary,
        templateId: template._id,
        templateName: template.name,
        calculatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Error applying template: ${error.message}`);
    }
  }

  /**
   * AI-HEADER
   * DomainMeaning: Update existing template with new rules and increment version
   * MisleadingNames: updateTemplate vs modifyTemplate - both update templates
   * SideEffects: Updates template record, increments version number
   * Invariants: Version number increases with each update, updatedAt is current timestamp
   * RAG_Keywords: template update, version control, rule modification
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(updateTemplate_versioning)
   */
  async updateTemplate(templateId, updateData) {
    try {
      const current = await this.findById(templateId);
      if (!current) {
        throw new Error('Template not found');
      }

      const updatedData = {
        ...updateData,
        version: (current.version || 1) + 1,
        updatedAt: new Date()
      };

      const updated = await this.update(templateId, updatedData);
      return updated;
    } catch (error) {
      throw new Error(`Error updating template: ${error.message}`);
    }
  }

  /**
   * AI-HEADER
   * DomainMeaning: Soft delete template by setting isActive to false
   * MisleadingNames: deactivateTemplate vs deleteTemplate - deactivate preserves data
   * SideEffects: Sets isActive to false, adds deactivatedAt timestamp
   * Invariants: Template remains in database but isActive = false
   * RAG_Keywords: template deactivation, soft delete, template lifecycle
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(deactivateTemplate_soft_delete)
   */
  async deactivateTemplate(templateId) {
    try {
      const updateData = {
        isActive: false,
        deactivatedAt: new Date(),
        updatedAt: new Date()
      };

      const updated = await this.update(templateId, updateData);
      return updated;
    } catch (error) {
      throw new Error(`Error deactivating template: ${error.message}`);
    }
  }

  // Private calculation methods

  /**
   * AI-HEADER Helper Methods for Template Calculations
   * DomainMeaning: Internal calculation logic for different rule types
   * MisleadingNames: _calculate vs _compute - both perform calculations
   * SideEffects: None - pure calculation functions
   * Invariants: Always return numeric values, handle edge cases gracefully
   * RAG_Keywords: calculation helpers, salary computation, rule engine
   * DuplicatePolicy: canonical
   * FunctionIdentity: sha256(calculation_helpers)
   */
  _calculateBaseSalary(rules, params) {
    if (!rules || rules.formula === 'fixed') {
      return rules?.amount || 0;
    }
    
    // Add more complex base salary calculations here as needed
    return rules.amount || 0;
  }

  _calculateAllowances(rules, baseSalary, params) {
    const allowances = {};

    for (const [key, rule] of Object.entries(rules || {})) {
      allowances[key] = this._applyCalculationRule(rule, baseSalary, params);
    }

    return allowances;
  }

  _calculateDeductions(rules, baseSalary, params) {
    const deductions = {};

    for (const [key, rule] of Object.entries(rules || {})) {
      deductions[key] = this._applyCalculationRule(rule, baseSalary, params);
    }

    return deductions;
  }

  _applyCalculationRule(rule, baseSalary, params) {
    if (!rule || !rule.formula) {
      return 0;
    }

    switch (rule.formula) {
      case 'fixed':
        return rule.amount || 0;

      case 'percentage':
        const baseAmount = rule.basedOn === 'baseSalary' ? baseSalary : 0;
        const calculated = Math.round(baseAmount * (rule.percentage || 0));
        return rule.maxAmount ? Math.min(calculated, rule.maxAmount) : calculated;

      case 'hourly_rate':
        const rate = rule.baseRate || 0;
        const hours = params.overtimeHours || 0;
        const multiplier = rule.multiplier || 1;
        return Math.round(rate * hours * multiplier);

      case 'tax_table':
        return this._calculateFromTaxTable(rule.brackets || [], baseSalary);

      default:
        return 0;
    }
  }

  _calculateFromTaxTable(brackets, amount) {
    let tax = 0;
    
    for (const bracket of brackets) {
      if (amount <= bracket.min) {
        break;
      }
      
      const taxableAmount = Math.min(amount, bracket.max || amount) - bracket.min;
      if (taxableAmount > 0) {
        tax += taxableAmount * (bracket.rate || 0);
      }
    }
    
    return Math.round(tax);
  }
}

module.exports = PayrollTemplateRepository;