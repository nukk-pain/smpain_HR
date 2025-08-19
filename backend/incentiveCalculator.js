/**
 * 안전한 인센티브 계산 엔진
 * eval() 사용 없이 수식을 파싱하고 계산하는 안전한 시스템
 */

class IncentiveCalculator {
  constructor() {
    // 허용된 연산자들
    this.allowedOperators = ['+', '-', '*', '/', '(', ')', '>', '<', '>=', '<=', '==', '!=', '?', ':'];
    
    // 허용된 변수들 - both old and new names supported
    this.allowedVariables = [
      'sales', 'baseSalary', 'years', 'performance',
      'personalSales', 'totalSales', 'teamSales' // New variable names
    ];
    
    // 허용된 함수들
    this.allowedFunctions = ['Math.max', 'Math.min', 'Math.round', 'Math.floor', 'Math.ceil'];
  }

  /**
   * 수식의 유효성을 검증
   * @param {string} formula - 검증할 수식
   * @returns {object} - {isValid: boolean, error: string}
   */
  validateFormula(formula) {
    try {
      if (!formula || typeof formula !== 'string') {
        return { isValid: false, error: 'Formula must be a non-empty string' };
      }

      // 위험한 키워드 검사
      const dangerousKeywords = [
        'eval', 'Function', 'setTimeout', 'setInterval', 'require', 'import',
        'process', 'global', 'console', 'Buffer', 'child_process', 'fs',
        'exec', 'spawn', 'fork', 'while', 'for', 'do'
      ];

      for (const keyword of dangerousKeywords) {
        if (formula.includes(keyword)) {
          return { isValid: false, error: `Dangerous keyword '${keyword}' is not allowed` };
        }
      }

      // 허용된 문자만 포함하는지 검사
      const allowedPattern = /^[a-zA-Z0-9\s\+\-\*\/\(\)\>\<\=\!\?\:\.\,_]+$/;
      if (!allowedPattern.test(formula)) {
        return { isValid: false, error: 'Formula contains invalid characters' };
      }

      // 변수 검증
      const variablePattern = /[a-zA-Z_][a-zA-Z0-9_]*/g;
      const variables = formula.match(variablePattern) || [];
      
      for (const variable of variables) {
        if (!this.allowedVariables.includes(variable) && 
            !variable.startsWith('Math.') && 
            !Number.isNaN(Number(variable))) {
          return { isValid: false, error: `Variable '${variable}' is not allowed` };
        }
      }

      // 기본 구문 검증 (괄호 매칭)
      const openParens = (formula.match(/\(/g) || []).length;
      const closeParens = (formula.match(/\)/g) || []).length;
      
      if (openParens !== closeParens) {
        return { isValid: false, error: 'Mismatched parentheses' };
      }

      return { isValid: true, error: null };
    } catch (error) {
      return { isValid: false, error: `Validation error: ${error.message}` };
    }
  }

  /**
   * 토큰화 - 수식을 토큰으로 분리
   * @param {string} formula - 토큰화할 수식
   * @returns {Array} - 토큰 배열
   */
  tokenize(formula) {
    const tokens = [];
    // 먼저 복합 연산자를 처리한 다음 단일 문자 처리
    const tokenPattern = /(>=|<=|==|!=|\d+\.?\d*|[a-zA-Z_][a-zA-Z0-9_]*|[+\-*/()><!?:])/g;
    let match;

    while ((match = tokenPattern.exec(formula)) !== null) {
      tokens.push(match[0]);
    }

    return tokens;
  }

  /**
   * 중위 표기법을 후위 표기법으로 변환 (Shunting Yard Algorithm)
   * @param {Array} tokens - 토큰 배열
   * @returns {Array} - 후위 표기법 토큰 배열
   */
  infixToPostfix(tokens) {
    const output = [];
    const operators = [];
    
    const precedence = {
      '?': 1, ':': 1,
      '||': 2, '&&': 2,
      '==': 3, '!=': 3, '<': 3, '>': 3, '<=': 3, '>=': 3,
      '+': 4, '-': 4,
      '*': 5, '/': 5
    };

    const isOperator = (token) => precedence.hasOwnProperty(token);
    const isNumber = (token) => !isNaN(parseFloat(token));
    const isVariable = (token) => this.allowedVariables.includes(token);

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (isNumber(token) || isVariable(token)) {
        output.push(token);
      } else if (token === '(') {
        operators.push(token);
      } else if (token === ')') {
        while (operators.length > 0 && operators[operators.length - 1] !== '(') {
          output.push(operators.pop());
        }
        operators.pop(); // Remove '('
      } else if (isOperator(token)) {
        while (operators.length > 0 && 
               operators[operators.length - 1] !== '(' &&
               precedence[operators[operators.length - 1]] >= precedence[token]) {
          output.push(operators.pop());
        }
        operators.push(token);
      }
    }

    while (operators.length > 0) {
      output.push(operators.pop());
    }

    return output;
  }

  /**
   * 후위 표기법 수식을 계산
   * @param {Array} postfix - 후위 표기법 토큰 배열
   * @param {Object} variables - 변수 값들
   * @returns {number} - 계산 결과
   */
  evaluatePostfix(postfix, variables) {
    const stack = [];

    for (const token of postfix) {
      if (!isNaN(parseFloat(token))) {
        stack.push(parseFloat(token));
      } else if (this.allowedVariables.includes(token)) {
        stack.push(variables[token] || 0);
      } else {
        const b = stack.pop();
        const a = stack.pop();

        switch (token) {
          case '+': stack.push(a + b); break;
          case '-': stack.push(a - b); break;
          case '*': stack.push(a * b); break;
          case '/': stack.push(b !== 0 ? a / b : 0); break;
          case '>': stack.push(a > b ? 1 : 0); break;
          case '<': stack.push(a < b ? 1 : 0); break;
          case '>=': stack.push(a >= b ? 1 : 0); break;
          case '<=': stack.push(a <= b ? 1 : 0); break;
          case '==': stack.push(a === b ? 1 : 0); break;
          case '!=': stack.push(a !== b ? 1 : 0); break;
          default:
            throw new Error(`Unknown operator: ${token}`);
        }
      }
    }

    return stack[0] || 0;
  }

  /**
   * 삼항 연산자 처리
   * @param {string} formula - 수식
   * @param {Object} variables - 변수 값들
   * @returns {number} - 계산 결과
   */
  evaluateTernary(formula, variables) {
    // 삼항 연산자 패턴 매칭
    const ternaryPattern = /^(.+?)\s*\?\s*(.+?)\s*:\s*(.+)$/;
    const match = formula.match(ternaryPattern);

    if (match) {
      const [, condition, trueValue, falseValue] = match;
      
      // 조건 평가
      const conditionResult = this.calculate(condition, variables);
      
      // 결과에 따라 값 선택
      return conditionResult ? this.calculate(trueValue, variables) : this.calculate(falseValue, variables);
    }

    return 0;
  }

  /**
   * 메인 계산 함수
   * @param {string} formula - 계산할 수식
   * @param {Object} variables - 변수 값들
   * @returns {number} - 계산 결과
   */
  calculate(formula, variables = {}) {
    try {
      // 수식 검증
      const validation = this.validateFormula(formula);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // 삼항 연산자 처리
      if (formula.includes('?') && formula.includes(':')) {
        return this.evaluateTernary(formula, variables);
      }

      // 토큰화
      const tokens = this.tokenize(formula);
      
      // 후위 표기법으로 변환
      const postfix = this.infixToPostfix(tokens);
      
      // 계산 실행
      const result = this.evaluatePostfix(postfix, variables);
      
      // 결과 검증 및 반올림
      return Math.max(0, Math.round(result));
      
    } catch (error) {
      console.error('Formula calculation error:', error);
      return 0;
    }
  }

  /**
   * 수식 시뮬레이션 - 여러 매출 값으로 테스트
   * @param {string} formula - 테스트할 수식
   * @param {Array} salesValues - 테스트할 매출 값들
   * @returns {Array} - 시뮬레이션 결과
   */
  simulateIncentive(formula, salesValues) {
    const results = [];
    
    for (const sales of salesValues) {
      try {
        const incentive = this.calculate(formula, { sales });
        results.push({
          sales: sales,
          incentive: incentive,
          percentage: sales > 0 ? (incentive / sales * 100).toFixed(2) : 0
        });
      } catch (error) {
        results.push({
          sales: sales,
          incentive: 0,
          percentage: 0,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * 수식 최적화 제안
   * @param {string} formula - 분석할 수식
   * @returns {Object} - 최적화 제안
   */
  analyzeFormula(formula) {
    const suggestions = [];
    
    // 성능 분석
    if (formula.includes('sales > 0 ? sales * 0.15 : 0')) {
      suggestions.push({
        type: 'optimization',
        message: 'Can be simplified to: sales * 0.15',
        reason: 'Multiplication by 0 is handled automatically'
      });
    }
    
    // 복잡도 분석
    const complexity = (formula.match(/[?:]/g) || []).length;
    if (complexity > 3) {
      suggestions.push({
        type: 'warning',
        message: 'Formula is complex with multiple conditions',
        reason: 'Consider breaking into multiple tiers'
      });
    }
    
    return {
      complexity: complexity,
      suggestions: suggestions,
      isValid: this.validateFormula(formula).isValid
    };
  }
}

module.exports = IncentiveCalculator;