import * as React from 'react'

export interface CalendarProps {
  mode: 'single'
  selected?: Date
  onSelect?: (date?: Date) => void
}

export const Calendar: React.FC<CalendarProps> = ({ selected, onSelect }) => (
  <input
    type="date"
    value={selected ? selected.toISOString().split('T')[0] : ''}
    onChange={e => onSelect?.(e.target.value ? new Date(e.target.value) : undefined)}
  />
)
