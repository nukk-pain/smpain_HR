export const documentTypes = {
  payslip: '급여명세서',
  certificate: '증명서',
  contract: '계약서',
  other: '기타',
} as const;

export type DocumentType = keyof typeof documentTypes;

export function getDocumentTypeLabel(type: string): string {
  return documentTypes[type as DocumentType] || type;
}

export const documentCategories = {
  payslip: ['월급여명세서', '상여금명세서', '퇴직금명세서'],
  certificate: ['재직증명서', '경력증명서', '소득증명서'],
  contract: ['근로계약서', '연봉계약서', '비밀유지계약서'],
  other: ['기타문서'],
} as const;

export function getDocumentCategoryLabel(category: string): string {
  return category;
}