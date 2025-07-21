# Material UI → shadcn/ui Migration Plan with TDD

## 📋 Project Overview

This document outlines a comprehensive plan to migrate the HR management system from Material UI to shadcn/ui, incorporating a Test-Driven Development (TDD) methodology throughout the process.

**Current State:**
* **UI Library**: Material UI v7.2.0
* **Framework**: React v19.1.0
* **Project Type**: TypeScript
* **Usage**: 28 files use MUI components, with over 370 instances of the `sx` prop.

---

## 🎯 Migration Goals

1.  **Modern Design System**: Transition to a modern stack using shadcn/ui and Tailwind CSS.
2.  **Better Performance**: Replace the runtime overhead of CSS-in-JS with the build-time efficiency of utility-first CSS.
3.  **Improved DX**: Enhance the developer experience with superior customization and tooling.
4.  **Bundle Size**: Significantly optimize the application's final bundle size.

---

## 📊 Current MUI Usage Analysis

### MUI Dependencies to Remove
```json
{
  "@mui/material": "^7.2.0",
  "@mui/icons-material": "^7.2.0",
  "@mui/x-date-pickers": "^8.7.0",
  "@emotion/react": "^11.14.0",
  "@emotion/styled": "^11.14.1"
}
````

### High-Priority Migration Files

1.  **Layout.tsx** (High Complexity) - Core navigation and structure.
2.  **LeaveManagement.tsx** (High Complexity) - Contains complex forms and date pickers.
3.  **PayrollGrid.tsx** (Medium Complexity) - Integrates AG Grid with MUI components.
4.  ✅ **UserManagement.tsx** (Medium Complexity) - Standard user interface with tables and dialogs.

-----

## 🚀 Migration Phases

### Phase 1: Setup & Infrastructure ✅

#### Tasks

1.  ✅ **Install Dependencies**: Add Tailwind CSS, shadcn/ui, and other required libraries.
    ```bash
    # Tailwind CSS setup
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p

    # Additional dependencies
    npm install lucide-react class-variance-authority clsx tailwind-merge
    npm install react-day-picker date-fns
    ```
2.  ✅ **Initialize shadcn/ui**: Set up the configuration for shadcn/ui.
    ```bash
    npx shadcn-ui@latest init
    ```
3.  ✅ **Install Base Components**: Batch install the most commonly used shadcn/ui components.
    ```bash
    npx shadcn-ui@latest add button card sheet tabs input label form dialog table dropdown-menu popover calendar toast alert badge avatar tooltip
    ```

#### 🧪 Testing (TDD Approach) ✅

  * ✅ **Test: `should render a shadcn/ui Button`**
    1.  **Failing Test**: Write a test that fails when importing `Button` from `@/components/ui/button` as it doesn't exist yet.
    2.  **Code**: Run the `npx shadcn-ui@latest add button` command.
    3.  **Pass Test**: The component is now available, and the import test passes.

### Phase 2: Component Mapping & Utilities

#### Tasks

1.  **Create Utility Functions**: Develop helper functions for styling and theme management.

    **Class Name Merging (`cn.ts`)**

    ```typescript
    // src/lib/utils.ts
    import { type ClassValue, clsx } from "clsx"
    import { twMerge } from "tailwind-merge"

    export function cn(...inputs: ClassValue[]) {
      return twMerge(clsx(inputs))
    }
    ```

    **Design Tokens (`theme.ts`)**

    ```typescript
    // src/lib/theme.ts
    export const theme = {
      colors: {
        primary: "hsl(var(--primary))",
        secondary: "hsl(var(--secondary))",
      }
    }
    ```

#### 🧪 Testing (TDD Approach)

  * **Test: `cn utility should correctly merge conflicting classes`**
    1.  **Failing Test**: Write a test `expect(cn('p-2', 'p-4')).toBe('p-4')`. It will fail by returning `'p-2 p-4'`.
    2.  **Code**: Implement the `cn` function using `clsx` and `tailwind-merge`.
    3.  **Pass Test**: The test passes as `tailwind-merge` correctly resolves conflicts.

### Phase 3: Basic Components Migration

#### Before/After Code Example

  * **Typography**
    ```tsx
    // Before (MUI)
    <Typography variant="h4" sx={{ mb: 2 }}>Title</Typography>

    // After (shadcn/ui)
    <h4 className="text-2xl font-semibold tracking-tight mb-4">Title</h4>
    ```

#### 🧪 Testing (TDD Approach)

  * ✅ **Test: `should replace Typography with heading classes`**
    1.  **Failing Test**: Assert a `<h4>` element is rendered with the class `"text-2xl"`. This will fail.
    2.  **Code**: Replace `<Typography>` with the semantic `<h4>` tag and Tailwind classes.
    3.  **Pass Test**: The test now finds the correctly styled element.

### Phase 4: Form Components Migration

#### Before/After Code Example

  * **TextField & Button**
    ```tsx
    // Before (MUI)
    <TextField label="Name" fullWidth margin="normal" />
    <Button variant="contained">Save</Button>

    // After (shadcn/ui)
    <div className="grid w-full items-center gap-1.5">
      <Label htmlFor="name">Name</Label>
      <Input id="name" />
    </div>
    <Button>Save</Button>
    ```

#### 🧪 Testing (TDD Approach)

  * ✅ **Test: `should migrate to an accessible Input and Label pair`**
    1.  **Failing Test**: Write a test `screen.getByLabelText('Name')`. This will likely fail with MUI's `TextField`.
    2.  **Code**: Replace `TextField` with shadcn/ui `Input` and `Label`, linking them with `htmlFor` and `id`.
    3.  **Pass Test**: The input is now accessible, and the test passes.

### Phase 5: Layout Components Migration

#### Before/After Code Example

  * **Grid & Card**
    ```tsx
    // Before (MUI)
    <Grid container spacing={2}><Grid item xs={12} md={6}><Card sx={{ p: 2 }}>Content</Card></Grid></Grid>

    // After (shadcn/ui)
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Card><CardContent className="p-4">Content</CardContent></Card></div>
    ```

#### 🧪 Testing (TDD Approach)

  * ✅ **Test: `should replace Grid with Tailwind CSS grid classes`**
    1.  **Failing Test**: Assert that a `div` element has the class `"grid"`. This fails initially.
    2.  **Code**: Refactor the component, replacing `<Grid>` with a `<div>` and Tailwind's grid classes.
    3.  **Pass Test**: The test now finds the correctly styled `div`.

### Phase 6: Navigation Migration

#### Before/After Code Example

  * **Drawer → Sheet**
    ```tsx
    // Before (MUI)
    <Drawer open={isOpen} onClose={handleClose}><List>...</List></Drawer>

    // After (shadcn/ui)
    <Sheet open={isOpen} onOpenChange={setIsOpen}><SheetContent>...</SheetContent></Sheet>
    ```

#### 🧪 Testing (TDD Approach)

  * ✅ **Test: `should open Sheet on button click`**
    1.  **Failing Test**: Simulate a menu button click and assert an element with `role="dialog"` appears. This fails with `Drawer`.
    2.  **Code**: Replace the `Drawer` with the `Sheet` and `SheetTrigger` components.
    3.  **Pass Test**: The `SheetContent` renders on click, and the test passes.

### Phase 7: Data Display Migration

#### Before/After Code Example

  * **Table**
    ```tsx
    // Before (MUI)
    <Table><TableHead><TableRow><TableCell>Name</TableCell></TableRow></TableHead>...</Table>

    // After (shadcn/ui)
    <Table><TableHeader><TableRow><TableHead>Name</TableHead></TableRow></TableHeader>...</Table>
    ```

#### 🧪 Testing (TDD Approach)

  * ✅ **Test: `should migrate MUI Table to shadcn/ui Table`**
    1.  **Failing Test**: Create a snapshot test for a table component. It will fail due to different markup.
    2.  **Code**: Replace MUI `Table` components with their shadcn/ui equivalents.
    3.  **Pass Test**: Update the snapshot, which now reflects the new, cleaner markup.

### Phase 8: Feedback Components Migration

#### Before/After Code Example

  * **Dialog & Snackbar/Alert → Toast**
    ```tsx
    // Before (MUI)
    <Dialog open={isOpen} onClose={handleClose}><DialogTitle>Confirm</DialogTitle></Dialog>
    <Snackbar open={true} message="Success!" />

    // After (shadcn/ui)
    <Dialog open={isOpen} onOpenChange={setIsOpen}><DialogContent><DialogHeader>Confirm</DialogHeader></DialogContent></Dialog>
    toast({ title: "Success!" })
    ```

#### 🧪 Testing (TDD Approach)

  * ✅ **Test: `should replace Snackbar with the hook-based Toast`**
    1.  **Failing Test**: Click a save button and assert `screen.findByText('Success!')`. This fails initially.
    2.  **Code**: Use the `useToast` hook in the handler and add the `<Toaster />` to the layout.
    3.  **Pass Test**: The toast appears, and the test finds the text.

### Phase 9: Date Components Migration

#### Before/After Code Example

  * **DatePicker**
    ```tsx
    // Before (MUI)
    <DatePicker label="Pick a date" value={date} onChange={setDate} />

    // After (shadcn/ui)
    <Popover>
      <PopoverTrigger asChild><Button variant="outline">Pick a date</Button></PopoverTrigger>
      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} /></PopoverContent>
    </Popover>
    ```

#### 🧪 Testing (TDD Approach)

  * ✅ **Test: `should open a Calendar in a Popover`**
    1.  **Failing Test**: Click a date trigger button and assert an element with `role="grid"` (the calendar) is visible. Fails with MUI.
    2.  **Code**: Implement the `Popover` with `Calendar` inside.
    3.  **Pass Test**: The calendar appears on click, and the test passes.

### Phase 10: Icons Migration

#### Tasks

Swap all `@mui/icons-material` icons with `lucide-react`.

#### 🧪 Testing (TDD Approach)

  * ✅ **Test: `should replace EditIcon with Lucide's Edit icon`**
    1.  **Failing Test**: A snapshot test for a component with an icon will fail after the swap.
    2.  **Code**: Replace `<EditIcon />` with `<Edit className="h-4 w-4" />`.
    3.  **Pass Test**: Update the snapshot to reflect the new icon.

### Phase 11: Complex Pages Migration

#### Tasks

Refactor high-priority pages (`Layout.tsx`, `LeaveManagement.tsx`, etc.) by composing the newly migrated components.

**Completed Components:**
- ✅ **BonusManagement.tsx** - Successfully migrated from MUI to shadcn/ui with comprehensive TDD tests
- ✅ **PositionManagement.tsx** - Migrated with list/dialog functionality and proper loading state handling
- ✅ **UserProfile.tsx** - Complex form migration completed with proper form validation and loading states
- ✅ **LeaveAdjustmentDialog.tsx** - Full dialog migration with complex table, form, and alert components
- ✅ **UserManagement.tsx** - Comprehensive user management interface with dialogs, permissions, and data grid integration
- ✅ **DepartmentManagement.tsx** - Complex department and position management with tabs, organization chart, and detailed dialogs
- ✅ **IncentiveCalculator.tsx** - Complex formula editor with accordion, tables, and help dialog migration
- ✅ **PayrollManagement.tsx** - Complete payroll management interface with tabs, statistics cards, and month navigation migrated from MUI to shadcn/ui

#### 🧪 Testing (TDD Approach)

  * ✅ **Test: `should successfully submit a new leave request form`**
    1.  **Failing Test**: Write a full E2E test for the leave request flow. It will fail at multiple steps.
    2.  **Code**: Migrate the page's components piece by piece (dialog, date picker, form), making parts of the test pass incrementally.
    3.  **Pass Test**: Once all components are migrated, the entire test flow passes.

### Phase 12: Testing & Cleanup

#### Tasks

Uninstall all MUI libraries and run a final battery of tests.

#### Testing Checklist

  - [ ] All pages render without errors.
  - [ ] All forms can be submitted successfully.
  - [ ] Navigation (headers, sidebars, tabs) works as expected.
  - [ ] Responsive design is verified on mobile, tablet, and desktop.
  - [ ] Dark mode (if applicable) displays correctly.
  - [ ] Core user flows are tested end-to-end.
  - [ ] Accessibility checks pass (keyboard navigation, screen reader support).

-----

## 🔍 Component Mapping Reference

| MUI Component | shadcn/ui Alternative | Migration Notes |
|---------------|-----------------------|-----------------|
| `Box`, `Stack` | `div` + Tailwind | `sx` prop becomes `className`. |
| `Grid` | `div` + `grid` classes | Use Tailwind's native grid system. |
| `Typography` | `h1-h6`, `p`, `span` | Use semantic tags and Tailwind's font utilities. |
| `Button` | `Button` | API is nearly identical. |
| `TextField` | `Input` + `Label` | Requires structural changes for accessibility. |
| `Card` | `Card`, `CardContent`, etc. | Structure is very similar. |
| `Dialog` | `Dialog`, `DialogContent`, etc. | Minor API differences, similar concepts. |
| `AppBar` | Custom `header` | Requires a complete rebuild with Tailwind. |
| `Drawer` | `Sheet` | Conceptually similar but with different APIs. |
| `Tabs` | `Tabs`, `TabsList`, `TabsTrigger` | Structure is very similar. |
| `Menu` | `DropdownMenu` | API has differences; logic may need refactoring. |
| `Snackbar` | `Toast` (via `useToast` hook) | Becomes a hook-based, imperative API. |
| `Alert` | `Alert`, `AlertDescription` | Similar purpose and structure. |
| `Chip` | `Badge` | Similar functionality. |
| `Avatar` | `Avatar`, `AvatarFallback` | Nearly identical API. |
| `DatePicker` | `Calendar` + `Popover` | Requires composing two components. |

-----

## ⚠️ Migration Challenges

  * **Date Picker Complexity**: MUI's `DatePicker` is an all-in-one component, while shadcn/ui requires composing `Calendar` and `Popover`.
  * **AG Grid Integration**: Custom cell renderers in `PayrollGrid.tsx` that use MUI components will need to be rewritten.
  * **Form Validation**: State management and validation logic will need to be handled by a library like `react-hook-form` + `zod`.
  * **Theming**: The MUI theme object must be carefully translated into Tailwind's `tailwind.config.js` and CSS variables.
  * **Animation & Transitions**: Animations from MUI need to be replaced with CSS transitions or a library like Framer Motion.

-----

## 📈 Expected Benefits

  * **Bundle Size Reduction**: Improve build times and user load times.
  * **Performance Improvements**: Enhance runtime performance by removing CSS-in-JS.
  * **Developer Experience**: Gain better customization, IntelliSense, and more intuitive styling.
  * **Design System Flexibility**: Easier management of design tokens and component variations.

-----

## 🎯 Success Metrics

  - [ ] Bundle size is reduced by at least 50%.
  - [ ] Page load times are improved by 20% or more.
  - [ ] All existing application features work as expected.
  - [ ] Responsive design is maintained across all devices.
  - [ ] Accessibility standards (WCAG) are met or exceeded.
  - [ ] Overall code quality and maintainability are improved.

-----

## 🚀 Getting Started

1.  Review this document with the development team to ensure alignment.
2.  Create a new branch for the migration (`feat/shadcn-migration`).
3.  Proceed through the phases sequentially, starting with Phase 1.
4.  Commit changes after each logical step (e.g., after migrating a single component).
5.  Regularly open draft pull requests to run CI checks and facilitate early feedback.
