module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.js'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    
    // =============================================================================
    // 🚨 하드코딩 방지 규칙들
    // =============================================================================
    
    // 1. 매직 넘버 방지
    'no-magic-numbers': [
      'error',
      {
        ignore: [-1, 0, 1, 2, 100], // 일반적인 숫자는 허용
        ignoreArrayIndexes: true,
        ignoreDefaultValues: true,
        ignoreClassFieldInitialValues: true,
        detectObjects: false,
      },
    ],
    
    // 2. 하드코딩된 문자열 방지 (특정 패턴)
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/^(annual|sick|personal|family)$/]',
        message: '휴가 타입은 LEAVE_CONFIG.TYPES 상수를 사용하세요.',
      },
      {
        selector: 'Literal[value=/^(pending|approved|rejected)$/]',
        message: '휴가 상태는 LEAVE_CONFIG.STATUS 상수를 사용하세요.',
      },
      {
        selector: 'Literal[value=/^(admin|manager|user)$/]',
        message: '사용자 역할은 USER_ROLES 상수를 사용하세요.',
      },
      {
        selector: 'Literal[value=/^(success|error|warning|info)$/]',
        message: '알림 타입은 UI_CONFIG 상수를 사용하세요.',
      },
      {
        selector: 'Literal[value=/^(yyyy-MM-dd|HH:mm:ss)$/]',
        message: '날짜 형식은 DATE_CONFIG.FORMATS 상수를 사용하세요.',
      },
    ],
    
    // 3. 직접 API 경로 하드코딩 방지
    'no-restricted-patterns': [
      {
        group: ['**/api/**'],
        message: 'API 경로는 API_ENDPOINTS 상수를 사용하세요.',
      },
    ],
    
    // 4. 상대 경로 대신 절대 경로 사용 강제
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../*', './*'],
            message: '상대 경로 대신 @ 별칭을 사용하세요. 예: @/components/Example',
          },
        ],
      },
    ],
    
    // 5. 특정 함수/메서드 호출 시 설정 파일 사용 강제
    'no-restricted-properties': [
      'error',
      {
        object: 'console',
        property: 'log',
        message: '프로덕션에서는 console.log 대신 로깅 시스템을 사용하세요.',
      },
    ],
    
    // 6. 빈 catch 블록 방지
    'no-empty': ['error', { allowEmptyCatch: false }],
    
    // 7. 하드코딩된 색상 값 방지
    'no-restricted-syntax': [
      'error',
      {
        selector: 'Literal[value=/^#[0-9a-fA-F]{3,6}$/]',
        message: '색상 값은 UI_CONFIG.THEME 상수를 사용하세요.',
      },
    ],
  },
  
  // =============================================================================
  // 🎯 프로젝트별 커스텀 규칙
  // =============================================================================
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        // TypeScript 파일에서 추가 규칙
        '@typescript-eslint/no-magic-numbers': [
          'error',
          {
            ignore: [-1, 0, 1, 2, 100],
            ignoreArrayIndexes: true,
            ignoreDefaultValues: true,
            ignoreEnums: true,
            ignoreNumericLiteralTypes: true,
            ignoreReadonlyClassProperties: true,
          },
        ],
        
        // any 타입 사용 제한
        '@typescript-eslint/no-explicit-any': 'warn',
        
        // 미사용 변수 방지
        '@typescript-eslint/no-unused-vars': 'error',
      },
    },
    {
      files: ['**/config/**/*.ts'],
      rules: {
        // 설정 파일에서는 매직 넘버 허용
        'no-magic-numbers': 'off',
        '@typescript-eslint/no-magic-numbers': 'off',
      },
    },
  ],
};