# Quote Request Modal Component

A reusable Angular component for requesting quotes on products. This component is designed to be easily portable to other Angular 17+ projects.

## Features

- ✅ Standalone Angular 17 component
- ✅ Reactive forms with validation
- ✅ Professional UI with Tailwind CSS
- ✅ TypeScript interfaces for type safety
- ✅ Customizable form fields (quantity, urgency, timeline, message)
- ✅ Loading states and form validation
- ✅ Accessible modal with keyboard and backdrop interaction
- ✅ Event-driven architecture for easy integration

## Usage

### 1. Import the Component

```typescript
import { QuoteRequestModalComponent, QuoteRequestData } from './path/to/quote-request-modal.component';

@Component({
  // ...
  imports: [QuoteRequestModalComponent],
  // ...
})
export class YourComponent {
  // Component properties
  showQuoteModal = false;
  productForQuote: ProductWithProvider | null = null;
  customerId: string = '';

  ngOnInit() {
    // Get customer ID from session storage (set during login)
    this.customerId = sessionStorage.getItem('userId') || '';
  }

  // Methods
  openQuoteModal(product: ProductWithProvider) {
    this.productForQuote = product;
    this.showQuoteModal = true;
  }

  closeQuoteModal() {
    this.showQuoteModal = false;
    this.productForQuote = null;
  }

  onQuoteRequest(requestData: QuoteRequestData) {
    console.log('Quote request:', requestData);
    // This is called for backward compatibility
    // The actual API call is handled automatically by the component
  }

  onQuoteCreated(response: any) {
    console.log('Quote created:', response);
    // Handle successful quote creation
    // Show success message, navigate to quotes page, etc.
  }
}
```

### 2. Add to Template

```html
<!-- Trigger Button -->
<button (click)="openQuoteModal(product)" class="btn btn-primary">
  Request Quote
</button>

<!-- Modal Component -->
<app-quote-request-modal
  *ngIf="showQuoteModal"
  [product]="productForQuote"
  [customerId]="customerId"
  [isOpen]="showQuoteModal"
  (closeModal)="closeQuoteModal()"
  (submitRequest)="onQuoteRequest($event)"
  (quoteCreated)="onQuoteCreated($event)"
></app-quote-request-modal>
```

## API

### Inputs

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `product` | `ProductWithProvider \| null` | Yes | The product object to request a quote for |
| `customerId` | `string` | Yes | The customer ID (usually from login session) |
| `isOpen` | `boolean` | No | Controls modal visibility (default: false) |

### Outputs

| Event | Type | Description |
|-------|------|-------------|
| `closeModal` | `void` | Emitted when the modal should be closed |
| `submitRequest` | `QuoteRequestData` | Emitted when the quote request form is submitted (for compatibility) |
| `quoteCreated` | `any` | Emitted when the quote is successfully created via API |

### Types

```typescript
export interface QuoteRequestData {
  customerMessage: string;
  customerId: string;
  providerId: string;
  productOfferingId: string;
}

export interface ProductWithProvider {
  id: string;
  name: string;
  providerId?: string;
  productOfferingId?: string;
  // ... other product properties
}
```

## Dependencies

### Required Angular Modules
- `CommonModule`
- `FormsModule`
- `ReactiveFormsModule`

### Required Packages
- `@angular/core` (v17+)
- `@angular/common` (v17+)
- `@angular/forms` (v17+)

### Styling
The component uses Tailwind CSS classes. Ensure Tailwind CSS is configured in your project.

## Customization

### Styling
The component uses Tailwind CSS utility classes. You can customize the appearance by:

1. Modifying the CSS classes in the template
2. Adding custom CSS in your global styles
3. Using CSS custom properties for theme colors

### Form Fields
The component includes these form fields:
- **Customer Message** (required textarea)

To modify form fields, edit the `FormBuilder` configuration in the component constructor.

### Validation
Current validation rules:
- Customer Message: Required, minimum 10 characters

## Migration to Other Projects

### Step 1: Copy Files
Copy the entire `quote-request-modal` folder to your target project's shared components directory.

### Step 2: Update Import Paths
Update the import path for `ProductWithProvider` interface to match your project structure:

```typescript
// Update this line in quote-request-modal.component.ts
import { ProductWithProvider } from '../../../features/products/services/product.service';
```

### Step 3: Install Dependencies
Ensure your target project has:
- Angular 17+
- Reactive Forms
- Tailwind CSS (or update CSS classes to match your styling framework)

### Step 4: Adapt Product Interface
If your product interface differs from `ProductWithProvider`, either:
1. Update the interface to match your product model, or
2. Create an adapter/mapper to convert your product objects

## Example Implementation

See the `ProductListComponent` in this project for a complete implementation example:

```typescript
// In your component
addToQuote(product: ProductWithProvider) {
  this.productForQuote = product;
  this.showQuoteModal = true;
}

onQuoteRequest(requestData: QuoteRequestData) {
  // Send to your API - POST /quoteManagement/createQuote
  this.quoteService.createQuote(requestData).subscribe({
    next: (response) => {
      this.notificationService.showSuccess('Quote request submitted successfully!');
      this.closeQuoteModal();
    },
    error: (error) => {
      this.notificationService.showError('Failed to submit quote request');
    }
  });
}
```

## Browser Support

This component supports all modern browsers that support Angular 17:
- Chrome 119+
- Firefox 115+
- Safari 16.4+
- Edge 119+ 