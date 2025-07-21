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

## 🚀 Migration Phases

### Phase 1: Setup & Infrastructure

#### Tasks
Install Tailwind CSS, initialize shadcn/ui, and add necessary dependencies.

```bash
# Tailwind CSS setup
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui setup
npx shadcn@latest init

# Additional dependencies
npm install lucide-react class-variance-authority clsx tailwind-merge
````

#### 🧪 Testing (TDD Approach)

  * **Test: `should apply TailwindCSS utility classes`**
    1.  **Write Failing Test**: Create a test for a simple component asserting that a `div` with `className="w-full"` has a computed style of `width: 100%`. This will fail before Tailwind is configured in the test environment.
    2.  **Write Code**: Complete the `tailwind.config.js` and `postcss.config.js` setup.
    3.  **Pass Test**: The test now passes as styles are correctly applied.
  * **Test: `should render a shadcn/ui Button`**
    1.  **Write Failing Test**: Write a test that fails when attempting to import and render the `Button` component from `@/components/ui/button` because the file does not exist.
    2.  **Write Code**: Run `npx shadcn@latest add button`.
    3.  **Pass Test**: The component is now available, and the test passes.

### Phase 2: Component Mapping & Utilities

#### Tasks

Create a mapping document for MUI to shadcn/ui components and develop utility functions like `cn`.

#### 🧪 Testing (TDD Approach)

  * **Test: `cn utility should merge and handle conflicting classes`**
    1.  **Write Failing Test**: In `cn.test.ts`, write a test expecting `cn('p-2', 'p-4')` to be `'p-4'`. This will fail, initially returning `'p-2 p-4'`.
    2.  **Write Code**: Implement the `cn` function using `clsx` and `tailwind-merge`.
    3.  **Pass Test**: The test passes as `tailwind-merge` correctly resolves the conflicting classes.

### Phase 3: Basic Components Migration

#### Tasks

Replace basic MUI components like `Typography`, `Box`, and `Stack` with appropriate HTML elements and Tailwind CSS classes.

#### 🧪 Testing (TDD Approach)

  * **Test: `Typography should be replaced with appropriate heading classes`**
    1.  **Write Failing Test**: For a component using `<Typography variant="h4">`, write a test that asserts a `<h4>` element is rendered with the classes `"text-2xl font-semibold"`. This will fail.
    2.  **Write Code**: Replace `<Typography variant="h4">` with `<h4 className="text-2xl font-semibold mb-4">`.
    3.  **Pass Test**: The test now finds the correctly styled element and passes.

### Phase 4: Form Components Migration

#### Tasks

Transition MUI `TextField` and `Button` to their shadcn/ui equivalents.

#### 🧪 Testing (TDD Approach)

  * **Test: `TextField should be migrated to an accessible Input and Label pair`**
    1.  **Write Failing Test**: Using Testing Library, write a test `screen.getByLabelText('이름')` for a form with `<TextField label="이름" />`. The test will fail if the `for` and `id` attributes are not correctly linked.
    2.  **Write Code**: Replace `TextField` with shadcn/ui's `Input` and `Label`, ensuring the `Label`'s `htmlFor` matches the `Input`'s `id`.
    3.  **Pass Test**: The input is now accessible via its label, and the test passes.

### Phase 5: Layout Components Migration

#### Tasks

Replace MUI's `Grid` system and `Card` components with Tailwind's native grid and shadcn/ui's `Card`.

#### 🧪 Testing (TDD Approach)

  * **Test: `Grid component should be replaced with Tailwind CSS grid classes`**
    1.  **Write Failing Test**: For a component using `<Grid container>`, write a test that fails to find a `div` with the class `"grid"`.
    2.  **Write Code**: Refactor the component, replacing `<Grid>` with `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">`.
    3.  **Pass Test**: The test now finds the `div` with the correct classes.

### Phase 6: Navigation Migration

#### Tasks

Rebuild the `AppBar` and `Drawer` using a custom header and the shadcn/ui `Sheet` component.

#### 🧪 Testing (TDD Approach)

  * **Test: `Drawer should be migrated to Sheet and open on button click`**
    1.  **Write Failing Test**: Write a test that simulates a click on a menu toggle and asserts that an element with `role="dialog"` appears. This will fail with the original `Drawer` component.
    2.  **Write Code**: Replace the MUI `Drawer` with the `Sheet`, `SheetTrigger`, and `SheetContent` components.
    3.  **Pass Test**: After the click simulation, the `SheetContent` renders, and the test passes.

### Phase 7: Data Display Migration

#### Tasks

Update data display components like `Table`, `Avatar`, and `Chip` (to `Badge`).

#### 🧪 Testing (TDD Approach)

  * **Test: `MUI Table should be migrated to shadcn/ui Table`**
    1.  **Write Failing Test**: Create a snapshot test for a component rendering a data table. The test will fail as the MUI table's markup will not match the new snapshot.
    2.  **Write Code**: Replace MUI `Table` components with their shadcn/ui equivalents.
    3.  **Pass Test**: Run the test again to create a new snapshot with the cleaner shadcn/ui markup.

### Phase 8: Feedback Components Migration

#### Tasks

Replace MUI `Dialog` and `Snackbar` with shadcn/ui `Dialog` and `Toast`.

#### 🧪 Testing (TDD Approach)

  * **Test: `Snackbar should be replaced by the hook-based Toast`**
    1.  **Write Failing Test**: Write a test that clicks a "Save" button and asserts that the text "성공\!" appears on screen. This will fail with the old `Snackbar` logic.
    2.  **Write Code**: Remove `Snackbar` state logic and use the `useToast` hook to show a message on save.
    3.  **Pass Test**: The test now finds the success message rendered by the `Toaster`.

### Phase 9: Date Components Migration

#### Tasks

Replace `@mui/x-date-pickers` with a combination of `Calendar` and `Popover`.

#### 🧪 Testing (TDD Approach)

  * **Test: `DatePicker should open a Calendar in a Popover`**
    1.  **Write Failing Test**: Write a test that clicks a date trigger button and asserts that an element with `role="grid"` (the calendar) becomes visible. This will fail with the MUI `DatePicker`.
    2.  **Write Code**: Implement the `Popover` containing the `Calendar` component.
    3.  **Pass Test**: Clicking the trigger now opens the popover, revealing the calendar, and the test passes.

### Phase 10: Icons Migration

#### Tasks

Swap all `@mui/icons-material` icons with `lucide-react`.

#### 🧪 Testing (TDD Approach)

  * **Test: `EditIcon should be replaced with Lucide's Edit icon`**
    1.  **Write Failing Test**: Create a snapshot test for a component containing an `EditIcon`. The test will fail as the snapshot will not match after the icon is replaced.
    2.  **Write Code**: Replace `<EditIcon />` with `<Edit className="h-4 w-4" />`.
    3.  **Pass Test**: Update the snapshot to reflect the new `lucide-react` component structure.

### Phase 11: Complex Pages Migration

#### Tasks

Refactor high-priority, complex pages such as `Layout.tsx`, `LeaveManagement.tsx`, and `PayrollGrid.tsx`.

#### 🧪 Testing (TDD Approach)

  * **Test: `should successfully submit a new leave request form`**
    1.  **Write Failing Test**: Write an integration test for the entire "new leave request" user story, from clicking the button to seeing a success toast. This will fail at multiple steps.
    2.  **Write Code**: Migrate the page's components piece by piece, making parts of the test pass incrementally.
    3.  **Pass Test**: Once all components on the page are migrated, the entire end-to-end test flow passes.

### Phase 12: Testing & Cleanup

#### Tasks

Uninstall all MUI libraries and run a final battery of tests to ensure full functionality.

#### 🧪 Testing (TDD Approach)

  * **Test: `should have no remaining MUI or Emotion dependencies`**
    1.  **Write Failing Test**: Create a script that reads `package.json` and fails if it finds any `@mui/` or `@emotion/` dependencies.
    2.  **Write Code**: Run `npm uninstall` on all MUI and Emotion packages.
    3.  **Pass Test**: The script runs without error.
  * **Test: `should have no MUI imports in the codebase`**
    1.  **Write Failing Test**: Configure an ESLint rule to disallow imports from `@mui`. The linter will fail.
    2.  **Write Code**: Go through each file and remove the forbidden imports.
    3.  **Pass Test**: The linter now passes without errors.

-----

## 🔍 Component Mapping Reference

| MUI Component | shadcn/ui Alternative | Migration Notes |
|---------------|-----------------------|-----------------|
| `Box` | `div` + Tailwind | `sx` prop becomes `className`. |
| `Typography` | HTML elements + Tailwind | `variant` prop becomes Tailwind classes. |
| `Button` | `Button` | API is nearly identical. |
| `TextField` | `Input` + `Label` | Requires structural changes. |
| `Card` | `Card` | Structure is similar. |
| `Dialog` | `Dialog` | Minor API differences. |
| `Table` | `Table` | Structure is nearly identical. |
| `AppBar` | Custom Header | Requires a complete rebuild. |
| `Drawer` | `Sheet` | API has differences. |
| `DatePicker` | `Calendar` + `Popover` | Requires structural changes. |
| `Snackbar` | `Toast` | Becomes hook-based. |
| `Chip` | `Badge` | Similar functionality. |

-----

## ⚠️ Migration Challenges

  * **Date Picker Complexity**: MUI's `DatePicker` is a complete solution, whereas shadcn/ui requires combining `Calendar` and `Popover` components.
  * **AG Grid Integration**: The existing integration between AG Grid and MUI in `PayrollGrid.tsx` will require updating custom cell renderers.
  * **Form Validation**: Logic must be migrated from any MUI-specific validation to a library like `react-hook-form` + `zod`.
  * **Theming**: The MUI theme object must be translated into the Tailwind configuration and CSS variables.

-----

## 📈 Expected Benefits

  * **Bundle Size Reduction**: A potential decrease from \~300kb (MUI) to \~50kb (shadcn/ui), improving build times.
  * **Performance Improvements**: Removing CSS-in-JS will enhance runtime performance and lead to faster initial page loads.
  * **Developer Experience**: Gain better customization capabilities, Tailwind IntelliSense, and more intuitive styling.
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