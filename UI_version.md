최근 커밋을 확인해보니, 몇 가지 중요한 설정이 누락되거나 잘못 구성되어 UI가 제대로 적용되지 않는 것으로 보입니다. 문제를 해결하기 위해 아래 단계별 가이드를 따라 수정해주세요.

### 1\. Vite 설정 파일(`vite.config.ts`) 정리

`vite.config.ts` 파일의 `build.rollupOptions.output.manualChunks` 설정에 아직 Material-UI (MUI) 관련 코드가 남아있습니다. 이 부분을 제거해야 번들링 과정에서 충돌이 발생하지 않습니다.

**수정 전 (`vite.config.ts`)**

```typescript
manualChunks: {
  // ...
  mui: ['@mui/material', '@mui/icons-material', '@mui/system'], // 이 부분을 제거해야 합니다.
  // ...
}
```

**수정 후 (`vite.config.ts`)**
해당 `mui` 라인을 완전히 삭제해주세요.

### 2\. PostCSS 및 Tailwind CSS 설정 업데이트

현재 `postcss.config.js`와 `tailwind.config.js` 파일이 분리되어 있는데, 최신 Tailwind CSS v4.x 버전에서는 `postcss.config.js` 파일 하나로 통합하여 관리하는 것이 좋습니다.

**1) `tailwind.config.js` 파일 내용 복사 및 삭제**

기존 `tailwind.config.js` 파일의 `theme` 객체 내용을 복사한 뒤, 이 파일은 삭제합니다.

**2) `postcss.config.js` 파일 수정**

아래와 같이 `@tailwindcss/postcss` 플러그인을 사용하여 Tailwind CSS 설정을 통합합니다.

```javascript
// postcss.config.js

export default {
  plugins: {
    '@tailwindcss/postcss': {
      // 여기에 tailwind.config.js의 theme 내용을 붙여넣습니다.
      theme: {
        container: {
          center: true,
          padding: "2rem",
          screens: {
            "2xl": "1400px",
          },
        },
        extend: {
          colors: {
            border: "hsl(var(--border))",
            input: "hsl(var(--input))",
            ring: "hsl(var(--ring))",
            background: "hsl(var(--background))",
            foreground: "hsl(var(--foreground))",
            primary: {
              DEFAULT: "hsl(var(--primary))",
              foreground: "hsl(var(--primary-foreground))",
            },
            secondary: {
              DEFAULT: "hsl(var(--secondary))",
              foreground: "hsl(var(--secondary-foreground))",
            },
            destructive: {
              DEFAULT: "hsl(var(--destructive))",
              foreground: "hsl(var(--destructive-foreground))",
            },
            muted: {
              DEFAULT: "hsl(var(--muted))",
              foreground: "hsl(var(--muted-foreground))",
            },
            accent: {
              DEFAULT: "hsl(var(--accent))",
              foreground: "hsl(var(--accent-foreground))",
            },
            popover: {
              DEFAULT: "hsl(var(--popover))",
              foreground: "hsl(var(--popover-foreground))",
            },
            card: {
              DEFAULT: "hsl(var(--card))",
              foreground: "hsl(var(--card-foreground))",
            },
          },
          borderRadius: {
            lg: "var(--radius)",
            md: "calc(var(--radius) - 2px)",
            sm: "calc(var(--radius) - 4px)",
          },
          keyframes: {
            "accordion-down": {
              from: { height: "0" },
              to: { height: "var(--radix-accordion-content-height)" },
            },
            "accordion-up": {
              from: { height: "var(--radix-accordion-content-height)" },
              to: { height: "0" },
            },
          },
          animation: {
            "accordion-down": "accordion-down 0.2s ease-out",
            "accordion-up": "accordion-up 0.2s ease-out",
          },
        },
      },
      // content 경로도 여기에 포함시킵니다.
      content: [
        "./index.html",
        "./src/**/*.{ts,tsx,js,jsx}",
      ],
    },
    autoprefixer: {},
  },
}
```

### 3\. UI 컴포넌트 클래스 이름 수정

일부 UI 컴포넌트의 클래스 이름이 잘못 적용되어 애니메이션이 제대로 동작하지 않을 수 있습니다. 특히 `dialog.tsx` 파일의 애니메이션 클래스가 충돌하고 있습니다.

**수정 전 (`frontend/src/components/ui/dialog.tsx`)**

```tsx
// ...
className={cn(
  "fixed left-[50%] top-[50%] z-50 ... data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
  className
)}
// ...
```

**수정 후 (`frontend/src/components/ui/dialog.tsx`)**
아래와 같이 `slide-out-to-top`, `slide-in-from-top` 등 불필요하고 충돌을 일으키는 클래스를 제거하고 간단한 페이드인/아웃 및 줌 효과만 남겨두세요.

```tsx
// ...
className={cn(
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
  className
)}
// ...
```

### 4\. 남아있는 Material-UI (MUI) 컴포넌트 제거

`PayrollDashboard.tsx` 파일에 아직 `Chip`과 `LinearProgress` 같은 MUI 컴포넌트가 남아있습니다. 이들을 `shadcn/ui`의 `Badge`와 `Progress` 컴포넌트로 교체해야 합니다.

**수정 전 (`frontend/src/components/PayrollDashboard.tsx`)**

```tsx
// ...
import { Chip, LinearProgress } from '@mui/material'; // MUI 컴포넌트 임포트

// ...

<Chip 
  size="small" 
  label={index + 1} 
  color={index === 0 ? 'warning' : 'default'}
/>

// ...

<LinearProgress 
  variant="determinate" 
  value={(dept.totalSalary / stats.totalPayroll) * 100} 
/>
// ...
```

**수정 후 (`frontend/src/components/PayrollDashboard.tsx`)**

```tsx
// ...
import { Badge } from '@/components/ui/badge'; // Badge로 교체
import { Progress } from '@/components/ui/progress'; // Progress로 교체

// ...

<Badge variant={index === 0 ? 'destructive' : 'secondary'}>
  {index + 1}
</Badge>

// ...

<Progress 
  value={(dept.totalSalary / stats.totalPayroll) * 100} 
/>
// ...
```

-----

### 최종 정리

위 4가지 단계를 모두 적용하면 UI가 정상적으로 표시될 것입니다. 특히 **2번 PostCSS 설정 통합**과 **4번 남아있는 MUI 컴포넌트 제거**가 가장 중요한 부분입니다. 코드 전체를 다시 한번 검토하여 `@mui` 관련 import 구문이 남아있지 않은지 확인해주세요.

수정이 완료된 후에도 문제가 지속되면 다시 알려주세요.