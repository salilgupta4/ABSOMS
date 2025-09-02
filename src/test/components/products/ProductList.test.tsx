import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render, createMockProduct, mockApiResponses, boundaryValueTestData, userEvent } from '../../utils';
import ProductList, { getProducts, getProduct, saveProduct, deleteProduct } from '../../../../components/products/ProductList';

// Mock the Firebase functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

// Mock the actual service functions
const mockGetProducts = vi.fn();
const mockGetProduct = vi.fn();
const mockSaveProduct = vi.fn();
const mockDeleteProduct = vi.fn();

vi.mock('../../../../components/products/ProductList', async () => {
  const actual = await vi.importActual('../../../../components/products/ProductList');
  return {
    ...actual,
    getProducts: mockGetProducts,
    getProduct: mockGetProduct,
    saveProduct: mockSaveProduct,
    deleteProduct: mockDeleteProduct,
  };
});

describe('ProductList Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProducts.mockResolvedValue(mockApiResponses.getProducts.success);
  });

  describe('Component Rendering', () => {
    it('should render the product list title', async () => {
      render(<ProductList />);
      expect(screen.getByText('Products')).toBeInTheDocument();
    });

    it('should render "New Product" button for non-viewer users', async () => {
      render(<ProductList />);
      expect(screen.getByText('New Product')).toBeInTheDocument();
    });

    it('should show loading state initially', async () => {
      mockGetProducts.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<ProductList />);
      expect(screen.getByText('Loading products...')).toBeInTheDocument();
    });

    it('should render search input with placeholder', async () => {
      render(<ProductList />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search products/)).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading', () => {
    it('should load and display products successfully', async () => {
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.getByText('Product 2')).toBeInTheDocument();
        expect(screen.getByText('Product 3')).toBeInTheDocument();
      });
      
      expect(mockGetProducts).toHaveBeenCalledTimes(1);
    });

    it('should handle empty product list', async () => {
      mockGetProducts.mockResolvedValue([]);
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText('No products found.')).toBeInTheDocument();
        expect(screen.getByText('Add the first one!')).toBeInTheDocument();
      });
    });

    it('should handle API error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      mockGetProducts.mockRejectedValue(mockApiResponses.getProducts.error);
      render(<ProductList />);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to fetch products.');
      });
      
      consoleSpy.mockRestore();
      alertSpy.mockRestore();
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      mockGetProducts.mockResolvedValue([
        createMockProduct({ id: '1', name: 'Apple', hsnCode: '12345' }),
        createMockProduct({ id: '2', name: 'Banana', hsnCode: '67890' }),
        createMockProduct({ id: '3', name: 'Cherry', hsnCode: '11111' }),
      ]);
    });

    it('should filter products by name', async () => {
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search products/);
      await user.type(searchInput, 'Apple');

      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
        expect(screen.queryByText('Banana')).not.toBeInTheDocument();
        expect(screen.queryByText('Cherry')).not.toBeInTheDocument();
      });
    });

    it('should be case insensitive', async () => {
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search products/);
      await user.type(searchInput, 'apple');

      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });
    });

    it('should handle empty search results', async () => {
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search products/);
      await user.type(searchInput, 'NonexistentProduct');

      await waitFor(() => {
        expect(screen.getByText('No products found.')).toBeInTheDocument();
      });
    });
  });

  describe('Sorting Functionality', () => {
    beforeEach(() => {
      mockGetProducts.mockResolvedValue([
        createMockProduct({ id: '1', name: 'Zebra', rate: 300, unit: 'pcs', hsnCode: '33333' }),
        createMockProduct({ id: '2', name: 'Apple', rate: 100, unit: 'kg', hsnCode: '11111' }),
        createMockProduct({ id: '3', name: 'Banana', rate: 200, unit: 'ltr', hsnCode: '22222' }),
      ]);
    });

    it('should sort products by name ascending by default', async () => {
      render(<ProductList />);
      
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // First row is header, so data starts from index 1
        expect(rows[1]).toHaveTextContent('Apple');
        expect(rows[2]).toHaveTextContent('Banana'); 
        expect(rows[3]).toHaveTextContent('Zebra');
      });
    });

    it('should sort products by name descending when clicked twice', async () => {
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });

      const nameHeader = screen.getByText('Product Name');
      await user.click(nameHeader); // Already ascending, so this should make it descending
      
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('Zebra');
        expect(rows[2]).toHaveTextContent('Banana');
        expect(rows[3]).toHaveTextContent('Apple');
      });
    });

    it('should sort by rate when rate header is clicked', async () => {
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText('Apple')).toBeInTheDocument();
      });

      const rateHeader = screen.getByText('Rate');
      await user.click(rateHeader);
      
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('Apple'); // Rate: 100
        expect(rows[2]).toHaveTextContent('Banana'); // Rate: 200
        expect(rows[3]).toHaveTextContent('Zebra'); // Rate: 300
      });
    });
  });

  describe('Product Actions', () => {
    beforeEach(() => {
      mockGetProducts.mockResolvedValue([
        createMockProduct({ id: '1', name: 'Test Product' }),
      ]);
    });

    it('should show edit and delete buttons for each product', async () => {
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Product')).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute('href', '/products/1/edit');
        expect(screen.getByRole('button')).toBeInTheDocument(); // Delete button
      });
    });

    it('should confirm before deleting a product', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockDeleteProduct.mockResolvedValue(mockApiResponses.deleteProduct.success);
      
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Product')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button');
      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete product "Test Product"?');
      expect(mockDeleteProduct).toHaveBeenCalledWith('1');
      
      confirmSpy.mockRestore();
    });

    it('should not delete if user cancels confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText('Test Product')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button');
      await user.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalled();
      expect(mockDeleteProduct).not.toHaveBeenCalled();
      
      confirmSpy.mockRestore();
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle products with minimum valid values', async () => {
      mockGetProducts.mockResolvedValue([boundaryValueTestData.validProducts[0]]);
      
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('₹0.01')).toBeInTheDocument();
      });
    });

    it('should handle products with maximum valid values', async () => {
      mockGetProducts.mockResolvedValue([boundaryValueTestData.validProducts[1]]);
      
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText('Z'.repeat(100))).toBeInTheDocument();
        expect(screen.getByText('₹999999.99')).toBeInTheDocument();
      });
    });

    it('should handle special characters in product names', async () => {
      const productWithSpecialChars = createMockProduct({
        name: boundaryValueTestData.edgeCaseInputs.specialCharacters
      });
      mockGetProducts.mockResolvedValue([productWithSpecialChars]);
      
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText(boundaryValueTestData.edgeCaseInputs.specialCharacters)).toBeInTheDocument();
      });
    });

    it('should handle unicode characters in product names', async () => {
      const productWithUnicode = createMockProduct({
        name: boundaryValueTestData.edgeCaseInputs.unicodeCharacters
      });
      mockGetProducts.mockResolvedValue([productWithUnicode]);
      
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText(boundaryValueTestData.edgeCaseInputs.unicodeCharacters)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getAllByRole('columnheader')).toHaveLength(5); // 4 data columns + 1 actions column
        expect(screen.getByRole('button', { name: /new product/i })).toBeInTheDocument();
      });
    });

    it('should be keyboard navigable', async () => {
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText('Products')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search products/);
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);
      
      // Test Tab navigation
      await user.tab();
      expect(document.activeElement).toBe(screen.getByText('New Product'));
    });
  });

  describe('Performance', () => {
    it('should render large lists efficiently', async () => {
      const largeProductList = Array.from({ length: 1000 }, (_, i) => 
        createMockProduct({ id: `prod-${i}`, name: `Product ${i}` })
      );
      mockGetProducts.mockResolvedValue(largeProductList);
      
      const startTime = performance.now();
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText('Product 0')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000);
    });

    it('should handle rapid search input changes', async () => {
      render(<ProductList />);
      
      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search products/);
      
      // Rapidly type multiple characters
      const searchText = 'Product';
      for (const char of searchText) {
        await user.type(searchInput, char);
      }
      
      // Should still work correctly
      await waitFor(() => {
        expect(searchInput).toHaveValue(searchText);
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should handle malformed product data gracefully', async () => {
      const malformedProduct = {
        id: '1',
        name: null, // Invalid data
        rate: 'invalid', // Invalid data
        // Missing required fields
      } as any;
      
      mockGetProducts.mockResolvedValue([malformedProduct]);
      
      // Should not crash
      expect(() => render(<ProductList />)).not.toThrow();
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      mockGetProducts.mockRejectedValue(timeoutError);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<ProductList />);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to fetch products.');
      });
      
      consoleSpy.mockRestore();
      alertSpy.mockRestore();
    });
  });
});