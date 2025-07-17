import * as React from 'react'
import { cn } from '@/utils/cn'

export const Table: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <table className="w-full border-collapse text-sm">{children}</table>
)

export const TableHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <thead className="bg-gray-100">{children}</thead>
)

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => <tbody>{children}</tbody>

export const TableRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tr className="border-b last:border-0">{children}</tr>
)

export const TableHead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="px-2 py-1 text-left font-medium">{children}</th>
)

export const TableCell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="px-2 py-1">{children}</td>
)
