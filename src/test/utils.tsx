import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Product, ProductFormData } from '@/types';

// Custom render function with providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
};

// Mock data factories
export const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-123',
  name: 'Test Product',
  description: 'A test product description',
  unit: 'pcs',
  rate: 100.00,
  hsnCode: '12345678',
  ...overrides,
});

export const createMockProductFormData = (overrides: Partial<ProductFormData> = {}): ProductFormData => ({
  name: 'New Product',
  description: 'New product description',
  unit: 'kg',
  rate: 50.00,
  hsnCode: '87654321',
  ...overrides,
});

// Boundary value test data
export const boundaryValueTestData = {
  validProducts: [
    createMockProduct({ name: 'A', rate: 0.01 }), // Minimum valid values
    createMockProduct({ name: 'Z'.repeat(100), rate: 999999.99 }), // Maximum valid values
    createMockProduct({ name: 'Normal Product', rate: 100 }), // Normal values
  ],
  invalidProducts: [
    { name: '', rate: -1 }, // Empty name, negative rate
    { name: 'Product', rate: 0 }, // Zero rate
    { name: 'A'.repeat(256), rate: 999999999 }, // Too long name, too high rate
  ],
  edgeCaseInputs: {
    specialCharacters: 'Product!@#$%^&*()_+-=[]{}|;:,.<>?',
    unicodeCharacters: 'Продукт 产品 製品',
    numbers: '12345',
    whitespace: '   Product   ',
    emptyString: '',
    nullValue: null,
    undefinedValue: undefined,
  },
};

// Mock API responses
export const mockApiResponses = {
  getProducts: {
    success: [
      createMockProduct({ id: '1', name: 'Product 1' }),
      createMockProduct({ id: '2', name: 'Product 2' }),
      createMockProduct({ id: '3', name: 'Product 3' }),
    ],
    empty: [],
    error: new Error('Failed to fetch products'),
  },
  saveProduct: {
    success: createMockProduct(),
    error: new Error('Failed to save product'),
  },
  deleteProduct: {
    success: { success: true },
    error: new Error('Failed to delete product'),
  },
};

// Test event helpers
export const createMockEvent = (value: string, name?: string) => ({
  target: {
    value,
    name: name || 'testField',
  },
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
});

export const createMockFormEvent = () => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
});

// Async test helpers
export const waitForLoadingToFinish = async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Override the default render with our custom render
export { customRender as render };