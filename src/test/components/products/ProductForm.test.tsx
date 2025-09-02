import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { render, createMockProduct, createMockProductFormData, boundaryValueTestData, userEvent, createMockFormEvent } from '../../utils';
import ProductForm from '../../../../components/products/ProductForm';

// Mock the service functions
const mockGetProduct = vi.fn();
const mockSaveProduct = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../../../components/products/ProductList', () => ({
  getProduct: mockGetProduct,
  saveProduct: mockSaveProduct,
}));

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(() => ({ id: undefined })),
  useNavigate: () => mockNavigate,
}));

describe('ProductForm Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveProduct.mockResolvedValue(createMockProduct());
  });

  describe('Component Rendering - New Product', () => {
    it('should render new product form with correct title', () => {
      render(<ProductForm />);
      
      expect(screen.getByText('New Product')).toBeInTheDocument();
      expect(screen.getByText('Create Product')).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(<ProductForm />);
      
      expect(screen.getByLabelText('Product Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Unit (e.g., pcs, kg)')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate (₹)')).toBeInTheDocument();
      expect(screen.getByLabelText('HSN Code')).toBeInTheDocument();
    });

    it('should render form buttons', () => {
      render(<ProductForm />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Create Product')).toBeInTheDocument();
    });

    it('should have empty initial values for new product', () => {
      render(<ProductForm />);
      
      expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Name field
      expect(screen.getByDisplayValue('0')).toBeInTheDocument(); // Rate field
    });
  });

  describe('Component Rendering - Edit Product', () => {
    beforeEach(() => {
      const mockProduct = createMockProduct({
        id: 'test-123',
        name: 'Existing Product',
        description: 'Existing description',
        unit: 'kg',
        rate: 150.50,
        hsnCode: '87654321'
      });
      
      mockGetProduct.mockResolvedValue(mockProduct);
      vi.mocked(require('react-router-dom').useParams).mockReturnValue({ id: 'test-123' });
    });

    it('should render edit form with correct title', async () => {
      render(<ProductForm />);
      
      await waitFor(() => {
        expect(screen.getByText('Edit: Existing Product')).toBeInTheDocument();
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });
    });

    it('should populate form with existing product data', async () => {
      render(<ProductForm />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Existing Product')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument();
        expect(screen.getByDisplayValue('kg')).toBeInTheDocument();
        expect(screen.getByDisplayValue('150.5')).toBeInTheDocument();
        expect(screen.getByDisplayValue('87654321')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching product', () => {
      mockGetProduct.mockImplementation(() => new Promise(() => {}));
      render(<ProductForm />);
      
      expect(screen.getByText('Loading Product...')).toBeInTheDocument();
      expect(screen.getByText('Loading product data...')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should update form fields when user types', async () => {
      render(<ProductForm />);
      
      const nameInput = screen.getByLabelText('Product Name');
      const descriptionInput = screen.getByLabelText('Description');
      const unitInput = screen.getByLabelText('Unit (e.g., pcs, kg)');
      const rateInput = screen.getByLabelText('Rate (₹)');
      const hsnInput = screen.getByLabelText('HSN Code');
      
      await user.clear(nameInput);
      await user.type(nameInput, 'New Test Product');
      expect(nameInput).toHaveValue('New Test Product');
      
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Test description');
      expect(descriptionInput).toHaveValue('Test description');
      
      await user.clear(unitInput);
      await user.type(unitInput, 'pieces');
      expect(unitInput).toHaveValue('pieces');
      
      await user.clear(rateInput);
      await user.type(rateInput, '99.99');
      expect(rateInput).toHaveValue(99.99);
      
      await user.clear(hsnInput);
      await user.type(hsnInput, '12345678');
      expect(hsnInput).toHaveValue('12345678');
    });

    it('should handle numeric input correctly', async () => {
      render(<ProductForm />);
      
      const rateInput = screen.getByLabelText('Rate (₹)');
      
      await user.clear(rateInput);
      await user.type(rateInput, '123.45');
      expect(rateInput).toHaveValue(123.45);
      
      // Test decimal input
      await user.clear(rateInput);
      await user.type(rateInput, '0.01');
      expect(rateInput).toHaveValue(0.01);
    });

    it('should handle invalid numeric input', async () => {
      render(<ProductForm />);
      
      const rateInput = screen.getByLabelText('Rate (₹)');
      
      // Try to enter non-numeric value
      await user.clear(rateInput);
      await user.type(rateInput, 'abc');
      expect(rateInput).toHaveValue(0); // Should default to 0 for invalid input
    });
  });

  describe('Form Validation', () => {
    it('should require all fields for form submission', async () => {
      render(<ProductForm />);
      
      const submitButton = screen.getByText('Create Product');
      await user.click(submitButton);
      
      // HTML5 validation should prevent submission
      // Check if required attributes are present
      expect(screen.getByLabelText('Product Name')).toHaveAttribute('required');
      expect(screen.getByLabelText('Description')).toHaveAttribute('required');
      expect(screen.getByLabelText('Unit (e.g., pcs, kg)')).toHaveAttribute('required');
      expect(screen.getByLabelText('Rate (₹)')).toHaveAttribute('required');
      expect(screen.getByLabelText('HSN Code')).toHaveAttribute('required');
    });

    it('should submit form with valid data', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<ProductForm />);
      
      // Fill all required fields
      await user.type(screen.getByLabelText('Product Name'), 'Test Product');
      await user.type(screen.getByLabelText('Description'), 'Test description');
      await user.type(screen.getByLabelText('Unit (e.g., pcs, kg)'), 'pcs');
      await user.type(screen.getByLabelText('Rate (₹)'), '100');
      await user.type(screen.getByLabelText('HSN Code'), '12345678');
      
      const submitButton = screen.getByText('Create Product');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockSaveProduct).toHaveBeenCalledWith({
          name: 'Test Product',
          description: 'Test description',
          unit: 'pcs',
          rate: 100,
          hsnCode: '12345678'
        });
        expect(alertSpy).toHaveBeenCalledWith('Product created successfully!');
        expect(mockNavigate).toHaveBeenCalledWith('/products');
      });
      
      alertSpy.mockRestore();
    });

    it('should handle save errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      mockSaveProduct.mockRejectedValue(new Error('Save failed'));
      
      render(<ProductForm />);
      
      // Fill form
      await user.type(screen.getByLabelText('Product Name'), 'Test Product');
      await user.type(screen.getByLabelText('Description'), 'Test description');
      await user.type(screen.getByLabelText('Unit (e.g., pcs, kg)'), 'pcs');
      await user.type(screen.getByLabelText('Rate (₹)'), '100');
      await user.type(screen.getByLabelText('HSN Code'), '12345678');
      
      const submitButton = screen.getByText('Create Product');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to save product. Please try again.');
        expect(mockNavigate).not.toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
      alertSpy.mockRestore();
    });
  });

  describe('Loading States', () => {
    it('should disable form during submission', async () => {
      // Make save function take time to resolve
      mockSaveProduct.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<ProductForm />);
      
      // Fill form
      await user.type(screen.getByLabelText('Product Name'), 'Test Product');
      await user.type(screen.getByLabelText('Description'), 'Test description');
      await user.type(screen.getByLabelText('Unit (e.g., pcs, kg)'), 'pcs');
      await user.type(screen.getByLabelText('Rate (₹)'), '100');
      await user.type(screen.getByLabelText('HSN Code'), '12345678');
      
      const submitButton = screen.getByText('Create Product');
      await user.click(submitButton);
      
      // Should show loading state
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Wait for save to complete
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      });
    });

    it('should disable cancel button during submission', async () => {
      mockSaveProduct.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<ProductForm />);
      
      // Fill and submit form
      await user.type(screen.getByLabelText('Product Name'), 'Test Product');
      await user.type(screen.getByLabelText('Description'), 'Test description');
      await user.type(screen.getByLabelText('Unit (e.g., pcs, kg)'), 'pcs');
      await user.type(screen.getByLabelText('Rate (₹)'), '100');
      await user.type(screen.getByLabelText('HSN Code'), '12345678');
      
      await user.click(screen.getByText('Create Product'));
      
      expect(screen.getByText('Cancel')).toBeDisabled();
    });
  });

  describe('Navigation', () => {
    it('should navigate to products list on cancel', async () => {
      render(<ProductForm />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/products');
    });

    it('should navigate to products list after successful save', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<ProductForm />);
      
      // Fill and submit form
      await user.type(screen.getByLabelText('Product Name'), 'Test Product');
      await user.type(screen.getByLabelText('Description'), 'Test description');
      await user.type(screen.getByLabelText('Unit (e.g., pcs, kg)'), 'pcs');
      await user.type(screen.getByLabelText('Rate (₹)'), '100');
      await user.type(screen.getByLabelText('HSN Code'), '12345678');
      
      await user.click(screen.getByText('Create Product'));
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/products');
      });
      
      alertSpy.mockRestore();
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle minimum valid rate', async () => {
      render(<ProductForm />);
      
      const rateInput = screen.getByLabelText('Rate (₹)');
      await user.clear(rateInput);
      await user.type(rateInput, '0.01');
      
      expect(rateInput).toHaveValue(0.01);
    });

    it('should handle maximum valid rate', async () => {
      render(<ProductForm />);
      
      const rateInput = screen.getByLabelText('Rate (₹)');
      await user.clear(rateInput);
      await user.type(rateInput, '999999.99');
      
      expect(rateInput).toHaveValue(999999.99);
    });

    it('should handle very long product names', async () => {
      render(<ProductForm />);
      
      const longName = 'A'.repeat(255);
      const nameInput = screen.getByLabelText('Product Name');
      
      await user.clear(nameInput);
      await user.type(nameInput, longName);
      
      expect(nameInput).toHaveValue(longName);
    });

    it('should handle special characters in all fields', async () => {
      render(<ProductForm />);
      
      const specialChars = boundaryValueTestData.edgeCaseInputs.specialCharacters;
      
      await user.type(screen.getByLabelText('Product Name'), specialChars);
      await user.type(screen.getByLabelText('Description'), specialChars);
      await user.type(screen.getByLabelText('Unit (e.g., pcs, kg)'), specialChars);
      await user.type(screen.getByLabelText('HSN Code'), specialChars);
      
      expect(screen.getByLabelText('Product Name')).toHaveValue(specialChars);
      expect(screen.getByLabelText('Description')).toHaveValue(specialChars);
      expect(screen.getByLabelText('Unit (e.g., pcs, kg)')).toHaveValue(specialChars);
      expect(screen.getByLabelText('HSN Code')).toHaveValue(specialChars);
    });

    it('should handle unicode characters', async () => {
      render(<ProductForm />);
      
      const unicodeText = boundaryValueTestData.edgeCaseInputs.unicodeCharacters;
      const nameInput = screen.getByLabelText('Product Name');
      
      await user.clear(nameInput);
      await user.type(nameInput, unicodeText);
      
      expect(nameInput).toHaveValue(unicodeText);
    });

    it('should handle zero rate', async () => {
      render(<ProductForm />);
      
      const rateInput = screen.getByLabelText('Rate (₹)');
      await user.clear(rateInput);
      await user.type(rateInput, '0');
      
      expect(rateInput).toHaveValue(0);
    });

    it('should handle negative rate input', async () => {
      render(<ProductForm />);
      
      const rateInput = screen.getByLabelText('Rate (₹)');
      await user.clear(rateInput);
      await user.type(rateInput, '-100');
      
      // Should allow negative values (business logic might handle this differently)
      expect(rateInput).toHaveValue(-100);
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels and ARIA attributes', () => {
      render(<ProductForm />);
      
      expect(screen.getByLabelText('Product Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Unit (e.g., pcs, kg)')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate (₹)')).toBeInTheDocument();
      expect(screen.getByLabelText('HSN Code')).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      render(<ProductForm />);
      
      const nameInput = screen.getByLabelText('Product Name');
      nameInput.focus();
      expect(document.activeElement).toBe(nameInput);
      
      // Tab through all form fields
      await user.tab();
      expect(document.activeElement).toBe(screen.getByLabelText('Description'));
      
      await user.tab();
      expect(document.activeElement).toBe(screen.getByLabelText('Unit (e.g., pcs, kg)'));
      
      await user.tab();
      expect(document.activeElement).toBe(screen.getByLabelText('Rate (₹)'));
      
      await user.tab();
      expect(document.activeElement).toBe(screen.getByLabelText('HSN Code'));
      
      await user.tab();
      expect(document.activeElement).toBe(screen.getByText('Cancel'));
      
      await user.tab();
      expect(document.activeElement).toBe(screen.getByText('Create Product'));
    });

    it('should support form submission via Enter key', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<ProductForm />);
      
      // Fill form
      await user.type(screen.getByLabelText('Product Name'), 'Test Product');
      await user.type(screen.getByLabelText('Description'), 'Test description');
      await user.type(screen.getByLabelText('Unit (e.g., pcs, kg)'), 'pcs');
      await user.type(screen.getByLabelText('Rate (₹)'), '100');
      await user.type(screen.getByLabelText('HSN Code'), '12345678');
      
      // Press Enter to submit
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockSaveProduct).toHaveBeenCalled();
      });
      
      alertSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle product not found error', async () => {
      vi.mocked(require('react-router-dom').useParams).mockReturnValue({ id: 'nonexistent' });
      mockGetProduct.mockResolvedValue(undefined);
      
      render(<ProductForm />);
      
      await waitFor(() => {
        // Should not crash and should show empty form
        expect(screen.getByText('New Product')).toBeInTheDocument();
      });
    });

    it('should handle network errors when loading product', async () => {
      vi.mocked(require('react-router-dom').useParams).mockReturnValue({ id: 'test-123' });
      mockGetProduct.mockRejectedValue(new Error('Network error'));
      
      render(<ProductForm />);
      
      // Should handle error gracefully and not crash
      await waitFor(() => {
        expect(screen.getByText('New Product')).toBeInTheDocument();
      });
    });
  });

  describe('User Experience', () => {
    it('should clear loading state after successful data fetch', async () => {
      vi.mocked(require('react-router-dom').useParams).mockReturnValue({ id: 'test-123' });
      mockGetProduct.mockResolvedValue(createMockProduct({ name: 'Test Product' }));
      
      render(<ProductForm />);
      
      // Initially should show loading
      expect(screen.getByText('Loading Product...')).toBeInTheDocument();
      
      // After data loads, should show the form
      await waitFor(() => {
        expect(screen.queryByText('Loading Product...')).not.toBeInTheDocument();
        expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument();
      });
    });

    it('should provide visual feedback during form submission', async () => {
      mockSaveProduct.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<ProductForm />);
      
      // Fill form
      await user.type(screen.getByLabelText('Product Name'), 'Test Product');
      await user.type(screen.getByLabelText('Description'), 'Test description');
      await user.type(screen.getByLabelText('Unit (e.g., pcs, kg)'), 'pcs');
      await user.type(screen.getByLabelText('Rate (₹)'), '100');
      await user.type(screen.getByLabelText('HSN Code'), '12345678');
      
      const submitButton = screen.getByText('Create Product');
      await user.click(submitButton);
      
      // Should show loading spinner and text
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      // Should show loading icon (assuming Loader component renders)
      expect(submitButton.querySelector('svg')).toBeInTheDocument();
    });
  });
});