# SmartBooks UI Component Library

A comprehensive collection of reusable UI components built with React, TypeScript, Tailwind CSS, and Headless UI for the SmartBooks accounting application.

## Components

### Button
A versatile button component with multiple variants, sizes, and states.

**Features:**
- 5 variants: primary, secondary, outline, ghost, danger
- 3 sizes: sm, md, lg
- Loading state with spinner
- Icon support
- Full accessibility support

**Usage:**
```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md" icon={<PlusIcon />}>
  Add Item
</Button>
```

### Card
A flexible card component for organizing content with optional title, subtitle, and actions.

**Features:**
- Optional title and subtitle
- Action slot for buttons or other elements
- Configurable padding
- Clean, modern design

**Usage:**
```tsx
import { Card } from '@/components/ui';

<Card 
  title="Customer Details" 
  subtitle="Manage customer information"
  actions={<Button>Edit</Button>}
>
  <p>Card content goes here</p>
</Card>
```

### Input
A comprehensive input component with validation, icons, and various states.

**Features:**
- Label and helper text support
- Error state with validation messages
- Icon support (left or right positioned)
- Required field indication
- Disabled state

**Usage:**
```tsx
import { Input } from '@/components/ui';

<Input
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  icon={<EnvelopeIcon />}
  error={errors.email}
  required
/>
```

### Select
A powerful select component with search functionality and option management.

**Features:**
- Searchable options
- Custom option rendering
- Error states
- Disabled options
- Built with Headless UI for accessibility

**Usage:**
```tsx
import { Select } from '@/components/ui';

const options = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' }
];

<Select
  label="Category"
  options={options}
  searchable
  placeholder="Select a category"
/>
```

### Table
A feature-rich table component built with TanStack Table.

**Features:**
- Sorting on all columns
- Global search and filtering
- Pagination with controls
- Row selection
- Loading states
- Responsive design
- Custom cell rendering

**Usage:**
```tsx
import { Table } from '@/components/ui';
import { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<DataType>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  // ... more columns
];

<Table
  data={data}
  columns={columns}
  pagination={true}
  sorting={true}
  filtering={true}
/>
```

### Modal
A responsive modal component with multiple sizes and accessibility features.

**Features:**
- 5 sizes: sm, md, lg, xl, full
- Overlay click handling
- Escape key support
- Focus management
- Smooth animations
- Built with Headless UI

**Usage:**
```tsx
import { Modal } from '@/components/ui';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  description="Modal description"
  size="lg"
>
  <p>Modal content</p>
</Modal>
```

### Toast
A comprehensive toast notification system with context provider.

**Features:**
- 4 types: success, error, warning, info
- Auto-dismiss with configurable duration
- Action buttons
- Multiple positioning options
- Stacking and queue management
- Smooth animations

**Usage:**
```tsx
import { ToastProvider, useSuccessToast } from '@/components/ui';

// Wrap your app with ToastProvider
<ToastProvider position="top-right">
  <App />
</ToastProvider>

// Use in components
const showSuccess = useSuccessToast();
showSuccess('Success!', 'Operation completed successfully.');
```

## Design System

### Colors
The components use a consistent color palette based on Tailwind CSS:
- **Primary**: Blue (blue-600, blue-700, etc.)
- **Secondary**: Slate (slate-100, slate-600, etc.)
- **Success**: Green (green-600, green-100, etc.)
- **Error**: Red (red-600, red-100, etc.)
- **Warning**: Yellow (yellow-600, yellow-100, etc.)

### Typography
- Font family: System font stack (-apple-system, BlinkMacSystemFont, 'Segoe UI', etc.)
- Font sizes: xs (0.75rem) to 4xl (2.25rem)
- Font weights: normal (400) to bold (700)

### Spacing
Consistent spacing scale using Tailwind's spacing system:
- xs: 0.25rem
- sm: 0.5rem
- md: 1rem
- lg: 1.5rem
- xl: 2rem
- 2xl: 3rem

### Border Radius
- sm: 0.25rem
- md: 0.375rem (default)
- lg: 0.5rem
- xl: 0.75rem

## Accessibility

All components are built with accessibility in mind:
- Semantic HTML elements
- ARIA attributes where appropriate
- Keyboard navigation support
- Focus management
- Screen reader compatibility
- Color contrast compliance

## Dependencies

- **React**: ^19.1.0
- **TypeScript**: ^5
- **Tailwind CSS**: ^4
- **Headless UI**: ^2.2.9
- **Heroicons**: ^2.2.0
- **TanStack Table**: ^8.21.3
- **clsx**: ^2.1.1
- **tailwind-merge**: ^3.3.1

## Usage in SmartBooks

These components are used throughout the SmartBooks application:
- Customer management forms and lists
- Invoice creation and editing
- Dashboard widgets and cards
- Settings and configuration pages

## Best Practices

1. **Consistent Styling**: Use the provided variants and sizes rather than custom classes
2. **Accessibility**: Always provide labels for form inputs and meaningful button text
3. **Error Handling**: Use error states and validation messages appropriately
4. **Loading States**: Show loading indicators for async operations
5. **Responsive Design**: Test components on different screen sizes
6. **Type Safety**: Use TypeScript interfaces for better development experience

## Contributing

When adding new components:
1. Follow the existing patterns and conventions
2. Include TypeScript interfaces
3. Add accessibility features
4. Create examples and documentation
5. Test on different screen sizes
6. Ensure consistent styling with the design system