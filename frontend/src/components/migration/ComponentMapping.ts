export const MUI_TO_SHADCN_MAPPING = {
  // Layout
  Box: 'div + Tailwind classes',
  Container: 'div + container classes',
  Grid: 'div + grid classes',
  Stack: 'div + flex classes',

  // Navigation
  AppBar: 'Custom Header component',
  Drawer: 'Sheet component',
  Tabs: 'Tabs component',
  Menu: 'DropdownMenu component',

  // Forms
  TextField: 'Input component',
  Button: 'Button component',
  Select: 'Select component',
  Checkbox: 'Checkbox component',

  // Data Display
  Card: 'Card component',
  Table: 'Table component',
  Avatar: 'Avatar component',
  Chip: 'Badge component',

  // Feedback
  Dialog: 'Dialog component',
  Alert: 'Alert component',
  Snackbar: 'Toast component',
  Progress: 'Progress component',
  Tooltip: 'Tooltip component',

  // Icons
  '@mui/icons-material': 'lucide-react',
} as const
