# Material UI → shadcn/ui Migration Plan

## 📋 Project Overview

HR 관리 시스템을 Material UI에서 shadcn/ui로 마이그레이션하는 종합 계획서입니다.

**현재 상태:**
- Material UI v7.2.0
- React v19.1.0  
- TypeScript 프로젝트
- 28개 파일에서 MUI 사용
- 370+ 개의 sx prop 사용

## 🎯 Migration Goals

1. **Modern Design System**: Material UI → shadcn/ui + Tailwind CSS
2. **Better Performance**: CSS-in-JS → Utility-first CSS
3. **Improved DX**: 더 나은 개발자 경험과 커스터마이징
4. **Bundle Size**: 번들 크기 최적화

## 📊 Current MUI Usage Analysis

### MUI Dependencies to Remove
```json
{
  "@mui/material": "^7.2.0",           // → shadcn/ui components
  "@mui/icons-material": "^7.2.0",     // → lucide-react
  "@mui/x-date-pickers": "^8.7.0",     // → react-day-picker + shadcn
  "@emotion/react": "^11.14.0",        // → Tailwind CSS
  "@emotion/styled": "^11.14.1"        // → Tailwind CSS
}
```

### High-Priority Migration Files
1. **Layout.tsx** (200+ lines) - 네비게이션 구조
2. **LeaveManagement.tsx** (804 lines) - 복잡한 폼과 테이블
3. **PayrollGrid.tsx** (357 lines) - AG Grid + MUI 조합
4. **UserManagement.tsx** - 사용자 관리 인터페이스

## 🚀 Migration Phases

### Phase 1: Setup & Infrastructure
**Duration: 1-2 days**

#### 1.1 Install Dependencies
```bash
# Tailwind CSS setup
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui setup  
npx shadcn@latest init

# Additional dependencies
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install react-day-picker date-fns
```

#### 1.2 Configure Tailwind CSS
```typescript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1976d2",
        secondary: "#dc004e",
      }
    }
  }
}
```

#### 1.3 Setup shadcn/ui Components
```bash
# Install base components
npx shadcn@latest add button
npx shadcn@latest add input  
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add table
npx shadcn@latest add sheet
npx shadcn@latest add tabs
npx shadcn@latest add form
npx shadcn@latest add calendar
npx shadcn@latest add popover
npx shadcn@latest add toast
npx shadcn@latest add alert
npx shadcn@latest add badge
npx shadcn@latest add avatar
npx shadcn@latest add progress
npx shadcn@latest add tooltip
npx shadcn@latest add dropdown-menu
```

### Phase 2: Component Mapping & Utilities
**Duration: 1 day**

#### 2.1 Create Component Mapping Document
```typescript
// src/components/migration/ComponentMapping.ts
export const MUI_TO_SHADCN_MAPPING = {
  // Layout
  'Box': 'div + Tailwind classes',
  'Container': 'div + container classes',
  'Grid': 'div + grid classes',
  'Stack': 'div + flex classes',
  
  // Navigation  
  'AppBar': 'Custom Header component',
  'Drawer': 'Sheet component',
  'Tabs': 'Tabs component',
  'Menu': 'DropdownMenu component',
  
  // Forms
  'TextField': 'Input component',
  'Button': 'Button component', 
  'Select': 'Select component',
  'Checkbox': 'Checkbox component',
  
  // Data Display
  'Card': 'Card component',
  'Table': 'Table component',
  'Avatar': 'Avatar component',
  'Chip': 'Badge component',
  
  // Feedback
  'Dialog': 'Dialog component',
  'Alert': 'Alert component',
  'Snackbar': 'Toast component',
  'Progress': 'Progress component',
  'Tooltip': 'Tooltip component',
  
  // Icons
  '@mui/icons-material': 'lucide-react'
}
```

#### 2.2 Create Utility Functions
```typescript
// src/utils/cn.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// src/utils/theme.ts
export const theme = {
  colors: {
    primary: "#1976d2",
    secondary: "#dc004e", 
    background: "#f5f5f5"
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem", 
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem"
  }
}
```

### Phase 3: Basic Components Migration
**Duration: 2-3 days**

#### 3.1 Typography & Layout
- `Typography` → Tailwind typography classes
- `Box` → `div` with Tailwind classes
- `Stack` → `div` with flex classes
- `Container` → `div` with container classes
- `Divider` → `Separator` component

#### 3.2 Simple Components
```typescript
// Before (MUI)
<Typography variant="h4" sx={{ mb: 2 }}>
  제목
</Typography>

// After (shadcn/ui)
<h4 className="text-2xl font-semibold mb-4">
  제목  
</h4>
```

### Phase 4: Form Components Migration
**Duration: 3-4 days**

#### 4.1 Input Components
```typescript
// Before (MUI)
<TextField
  label="이름"
  value={name}
  onChange={(e) => setName(e.target.value)}
  fullWidth
  margin="normal"
/>

// After (shadcn/ui)
<div className="space-y-2">
  <Label htmlFor="name">이름</Label>
  <Input
    id="name"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="w-full"
  />
</div>
```

#### 4.2 Button Components
```typescript
// Before (MUI)
<Button variant="contained" color="primary" onClick={handleSave}>
  저장
</Button>

// After (shadcn/ui) 
<Button onClick={handleSave}>
  저장
</Button>
```

### Phase 5: Layout Components Migration
**Duration: 2-3 days**

#### 5.1 Grid System
```typescript
// Before (MUI)
<Grid container spacing={2}>
  <Grid item xs={12} md={6}>
    <Card>콘텐츠</Card>
  </Grid>
</Grid>

// After (Tailwind)
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Card>콘텐츠</Card>
</div>
```

#### 5.2 Card Components
```typescript
// Before (MUI)
<Card sx={{ p: 2, borderRadius: 2 }}>
  <CardContent>
    콘텐츠
  </CardContent>
</Card>

// After (shadcn/ui)
<Card className="p-4">
  <CardContent>
    콘텐츠
  </CardContent>
</Card>
```

### Phase 6: Navigation Migration
**Duration: 4-5 days**

#### 6.1 AppBar → Header
```typescript
// Before (MUI)
<AppBar position="fixed">
  <Toolbar>
    <Typography variant="h6">HR System</Typography>
  </Toolbar>
</AppBar>

// After (Custom + shadcn/ui)
<header className="fixed top-0 w-full bg-white border-b z-50">
  <div className="flex items-center justify-between px-4 py-3">
    <h1 className="text-xl font-semibold">HR System</h1>
  </div>
</header>
```

#### 6.2 Drawer → Sheet
```typescript
// Before (MUI)
<Drawer open={open} onClose={handleClose}>
  <List>
    <ListItem button>
      <ListItemText primary="메뉴" />
    </ListItem>
  </List>
</Drawer>

// After (shadcn/ui)
<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent>
    <nav className="space-y-2">
      <Button variant="ghost" className="w-full justify-start">
        메뉴
      </Button>
    </nav>
  </SheetContent>
</Sheet>
```

### Phase 7: Data Display Migration  
**Duration: 3-4 days**

#### 7.1 Table Components
```typescript
// Before (MUI)
<Table>
  <TableHead>
    <TableRow>
      <TableCell>이름</TableCell>
    </TableRow>
  </TableHead>
  <TableBody>
    <TableRow>
      <TableCell>홍길동</TableCell>
    </TableRow>
  </TableBody>
</Table>

// After (shadcn/ui)
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>이름</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>홍길동</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### 7.2 Avatar & Badge
```typescript
// Before (MUI)
<Avatar sx={{ bgcolor: 'primary.main' }}>
  {user.name[0]}
</Avatar>
<Chip label="활성" color="success" />

// After (shadcn/ui)
<Avatar>
  <AvatarFallback className="bg-primary text-white">
    {user.name[0]}
  </AvatarFallback>
</Avatar>
<Badge variant="default">활성</Badge>
```

### Phase 8: Feedback Components Migration
**Duration: 2-3 days**

#### 8.1 Dialog Components
```typescript
// Before (MUI)
<Dialog open={open} onClose={handleClose}>
  <DialogTitle>제목</DialogTitle>
  <DialogContent>내용</DialogContent>
  <DialogActions>
    <Button onClick={handleClose}>취소</Button>
  </DialogActions>
</Dialog>

// After (shadcn/ui)
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>제목</DialogTitle>
    </DialogHeader>
    <div>내용</div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>취소</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### 8.2 Toast & Alert
```typescript
// Before (MUI)
<Snackbar open={open} message="성공!" />
<Alert severity="error">오류 발생</Alert>

// After (shadcn/ui)
import { useToast } from "@/components/ui/use-toast"

const { toast } = useToast()
toast({ title: "성공!" })

<Alert variant="destructive">
  <AlertDescription>오류 발생</AlertDescription>
</Alert>
```

### Phase 9: Date Components Migration
**Duration: 2-3 days**

#### 9.1 DatePicker Migration
```typescript
// Before (MUI)
import { DatePicker } from '@mui/x-date-pickers/DatePicker'

<DatePicker
  label="날짜 선택"
  value={date}
  onChange={setDate}
  renderInput={(params) => <TextField {...params} />}
/>

// After (shadcn/ui + react-day-picker)
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">
      {date ? format(date, "PPP") : "날짜 선택"}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0">
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
    />
  </PopoverContent>
</Popover>
```

### Phase 10: Icons Migration
**Duration: 1-2 days**

#### 10.1 Replace MUI Icons
```typescript
// Before (MUI)
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'

<EditIcon />
<DeleteIcon />

// After (Lucide React)
import { Edit, Trash2 } from 'lucide-react'

<Edit className="h-4 w-4" />
<Trash2 className="h-4 w-4" />
```

### Phase 11: Complex Pages Migration
**Duration: 5-7 days**

#### 11.1 Layout.tsx (Priority: HIGH)
- AppBar → Custom Header
- Drawer → Sheet component
- Menu system → DropdownMenu
- Responsive layout → Tailwind responsive classes

#### 11.2 LeaveManagement.tsx (Priority: HIGH)  
- Complex forms → shadcn Form components
- Date pickers → Calendar + Popover
- Tables → shadcn Table
- Dialogs → shadcn Dialog
- Tabs → shadcn Tabs

#### 11.3 PayrollGrid.tsx (Priority: HIGH)
- MUI + AG Grid integration 유지
- MUI components만 shadcn/ui로 교체
- Custom cell renderers 업데이트

### Phase 12: Testing & Cleanup
**Duration: 2-3 days**

#### 12.1 Remove MUI Dependencies
```bash
npm uninstall @mui/material @mui/icons-material @mui/x-date-pickers @emotion/react @emotion/styled
```

#### 12.2 Update Imports
- 모든 MUI import 제거
- shadcn/ui import로 교체
- Lucide React icons import

#### 12.3 Testing Checklist
- [ ] 모든 페이지 렌더링 확인
- [ ] 폼 기능 동작 확인  
- [ ] 네비게이션 동작 확인
- [ ] 반응형 디자인 확인
- [ ] 다크모드 지원 (옵션)
- [ ] 접근성 확인
- [ ] 브라우저 호환성 확인

## 🔍 Component Mapping Reference

| MUI Component | shadcn/ui Alternative | Migration Notes |
|---------------|----------------------|-----------------|
| Box | div + Tailwind | sx prop → className |
| Typography | HTML elements + Tailwind | variant → Tailwind classes |
| Button | Button | 거의 동일한 API |
| TextField | Input + Label | 구조 변경 필요 |
| Card | Card | 유사한 구조 |
| Dialog | Dialog | 약간의 API 차이 |
| Table | Table | 거의 동일한 구조 |
| AppBar | Custom Header | 완전히 새로 구현 |
| Drawer | Sheet | API 차이 있음 |
| Tabs | Tabs | 유사한 구조 |
| Menu | DropdownMenu | API 차이 있음 |
| DatePicker | Calendar + Popover | 구조 변경 필요 |
| Snackbar | Toast | Hook 기반으로 변경 |
| Chip | Badge | 유사한 기능 |
| Avatar | Avatar | 거의 동일 |

## ⚠️ Migration Challenges

### 1. Date Picker Complexity
- MUI DatePicker는 완전한 솔루션
- shadcn/ui는 Calendar + Popover 조합 필요
- 한국어 로케일 설정 필요

### 2. Table Components  
- AG Grid와 MUI 조합 부분
- Custom cell renderer 업데이트 필요

### 3. Form Validation
- MUI 내장 validation → 별도 라이브러리 필요
- react-hook-form + zod 조합 권장

### 4. Theme System
- MUI theme → Tailwind config 변환
- CSS 변수 기반 테마 시스템

### 5. Animation & Transitions
- MUI 내장 애니메이션 → Framer Motion 또는 CSS transitions

## 📈 Expected Benefits

### 1. Bundle Size Reduction
- MUI: ~300kb → shadcn/ui: ~50kb
- Tree-shaking 개선
- 빌드 시간 단축

### 2. Performance Improvements
- CSS-in-JS 제거 → 런타임 성능 향상
- 더 나은 CSS 최적화
- 빠른 초기 로딩

### 3. Developer Experience
- 더 나은 커스터마이징
- Tailwind IntelliSense
- 더 직관적인 스타일링

### 4. Design System Flexibility
- 더 쉬운 디자인 토큰 관리
- 컴포넌트 변형 용이성
- 브랜딩 커스터마이징 개선

## 🎯 Success Metrics

- [ ] 번들 크기 50% 이상 감소
- [ ] 페이지 로드 시간 20% 이상 개선
- [ ] 모든 기존 기능 동일하게 동작
- [ ] 반응형 디자인 유지
- [ ] 접근성 기준 충족
- [ ] 코드 품질 향상

## 📅 Timeline Summary

| Phase | Duration | Effort |
|-------|----------|--------|
| 1. Setup & Infrastructure | 1-2 days | Low |
| 2. Component Mapping | 1 day | Low |
| 3. Basic Components | 2-3 days | Medium |
| 4. Form Components | 3-4 days | High |
| 5. Layout Components | 2-3 days | Medium |
| 6. Navigation | 4-5 days | High |
| 7. Data Display | 3-4 days | Medium |
| 8. Feedback Components | 2-3 days | Medium |
| 9. Date Components | 2-3 days | High |
| 10. Icons Migration | 1-2 days | Low |
| 11. Complex Pages | 5-7 days | Very High |
| 12. Testing & Cleanup | 2-3 days | Medium |

**Total Estimated Duration: 4-6 weeks**

## 🚀 Getting Started

1. 이 문서를 팀과 검토
2. Phase 1부터 순차적 진행  
3. 각 Phase 완료 후 테스트
4. 문제 발생 시 rollback 계획 준비
5. 정기적인 진행 상황 공유

---

*이 계획서는 실제 마이그레이션 과정에서 발견되는 이슈에 따라 조정될 수 있습니다.*