import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render, createMockProduct, boundaryValueTestData, userEvent } from '../../utils';
import ProductModal from '../../../../components/products/ProductModal';

// Mock the service functions
const mockSaveProduct = vi.fn();

vi.mock('../../../../components/products/ProductList', () => ({
  saveProduct: mockSaveProduct,
}));

describe('ProductModal Component', () => {
  const user = userEvent.setup();
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onProductCreated: vi.fn(),
    initialName: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveProduct.mockResolvedValue(createMockProduct());
  });

  describe('Modal Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(<ProductModal {...defaultProps} />);
      
      expect(screen.getByText('Add New Product')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      render(<ProductModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Add New Product')).not.toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(<ProductModal {...defaultProps} />);
      
      expect(screen.getByLabelText('Product Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description *')).toBeInTheDocument();
      expect(screen.getByLabelText('Unit *')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate (₹) *')).toBeInTheDocument();
      expect(screen.getByLabelText('HSN Code *')).toBeInTheDocument();
    });

    it('should render modal actions', () => {
      render(<ProductModal {...defaultProps} />);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Add Product')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('should pre-populate name field with initialName', () => {
      render(<ProductModal {...defaultProps} initialName="Pre-filled Product" />);
      
      expect(screen.getByDisplayValue('Pre-filled Product')).toBeInTheDocument();
    });

    it('should have default values for new product', () => {
      render(<ProductModal {...defaultProps} />);
      
      expect(screen.getByDisplayValue('pcs')).toBeInTheDocument(); // Default unit
      expect(screen.getByDisplayValue('0')).toBeInTheDocument(); // Default rate
    });
  });

  describe('Form Interactions', () => {
    it('should update form fields when user types', async () => {
      render(<ProductModal {...defaultProps} />);
      
      const nameInput = screen.getByLabelText('Product Name *');
      const descriptionInput = screen.getByLabelText('Description *');
      const rateInput = screen.getByLabelText('Rate (₹) *');
      const hsnInput = screen.getByLabelText('HSN Code *');
      
      await user.clear(nameInput);
      await user.type(nameInput, 'Modal Test Product');
      expect(nameInput).toHaveValue('Modal Test Product');
      
      await user.type(descriptionInput, 'Modal test description');
      expect(descriptionInput).toHaveValue('Modal test description');
      
      await user.clear(rateInput);
      await user.type(rateInput, '199.99');
      expect(rateInput).toHaveValue(199.99);
      
      await user.type(hsnInput, '98765432');
      expect(hsnInput).toHaveValue('98765432');
    });

    it('should handle unit selection', async () => {
      render(<ProductModal {...defaultProps} />);
      
      const unitSelect = screen.getByLabelText('Unit *');
      
      await user.selectOptions(unitSelect, 'kg');
      expect(unitSelect).toHaveValue('kg');
      
      await user.selectOptions(unitSelect, 'ltr');
      expect(unitSelect).toHaveValue('ltr');
    });

    it('should handle numeric input for rate', async () => {
      render(<ProductModal {...defaultProps} />);
      
      const rateInput = screen.getByLabelText('Rate (₹) *');
      
      await user.clear(rateInput);
      await user.type(rateInput, '123.45');
      expect(rateInput).toHaveValue(123.45);
      
      // Test decimal precision
      await user.clear(rateInput);
      await user.type(rateInput, '0.01');
      expect(rateInput).toHaveValue(0.01);
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      render(<ProductModal {...defaultProps} />);
      
      // Fill all required fields
      await user.type(screen.getByLabelText('Product Name *'), 'Test Product');
      await user.type(screen.getByLabelText('Description *'), 'Test description');
      await user.selectOptions(screen.getByLabelText('Unit *'), 'kg');
      await user.clear(screen.getByLabelText('Rate (₹) *'));
      await user.type(screen.getByLabelText('Rate (₹) *'), '100');
      await user.type(screen.getByLabelText('HSN Code *'), '12345678');
      
      const submitButton = screen.getByText('Add Product');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockSaveProduct).toHaveBeenCalledWith({
          name: 'Test Product',
          description: 'Test description',
          unit: 'kg',
          rate: 100,
          hsnCode: '12345678'
        });
        expect(defaultProps.onProductCreated).toHaveBeenCalledWith(createMockProduct());
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('should prevent submission with empty required fields', async () => {
      render(<ProductModal {...defaultProps} />);
      
      const submitButton = screen.getByText('Add Product');
      await user.click(submitButton);
      
      // HTML5 validation should prevent submission
      expect(mockSaveProduct).not.toHaveBeenCalled();
      expect(defaultProps.onProductCreated).not.toHaveBeenCalled();
    });

    it('should handle save errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      mockSaveProduct.mockRejectedValue(new Error('Save failed'));
      
      render(<ProductModal {...defaultProps} />);
      
      // Fill form
      await user.type(screen.getByLabelText('Product Name *'), 'Test Product');
      await user.type(screen.getByLabelText('Description *'), 'Test description');
      await user.type(screen.getByLabelText('Rate (₹) *'), '100');
      await user.type(screen.getByLabelText('HSN Code *'), '12345678');
      
      const submitButton = screen.getByText('Add Product');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to save product. Please try again.');
        expect(defaultProps.onProductCreated).not.toHaveBeenCalled();
        expect(defaultProps.onClose).not.toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('should reset form after successful submission', async () => {
      render(<ProductModal {...defaultProps} />);
      
      // Fill and submit form
      await user.type(screen.getByLabelText('Product Name *'), 'Test Product');
      await user.type(screen.getByLabelText('Description *'), 'Test description');
      await user.type(screen.getByLabelText('Rate (₹) *'), '100');
      await user.type(screen.getByLabelText('HSN Code *'), '12345678');
      
      await user.click(screen.getByText('Add Product'));
      
      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
      
      // If we re-open the modal, it should have reset values
      const newProps = { ...defaultProps, isOpen: false };
      const { rerender } = render(<ProductModal {...newProps} />);
      rerender(<ProductModal {...defaultProps} />);
      
      expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Name should be empty
    });
  });

  describe('Modal Actions', () => {
    it('should close modal when close button is clicked', async () => {
      render(<ProductModal {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should close modal when cancel button is clicked', async () => {
      render(<ProductModal {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should not close modal when saving is in progress', async () => {
      mockSaveProduct.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<ProductModal {...defaultProps} />);
      
      // Fill and submit form to start saving
      await user.type(screen.getByLabelText('Product Name *'), 'Test Product');
      await user.type(screen.getByLabelText('Description *'), 'Test description');
      await user.type(screen.getByLabelText('Rate (₹) *'), '100');
      await user.type(screen.getByLabelText('HSN Code *'), '12345678');
      
      await user.click(screen.getByText('Add Product'));
      
      // Try to close while saving
      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeDisabled();
      
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeDisabled();
    });

    it('should reset form when modal is closed', async () => {
      const { rerender } = render(<ProductModal {...defaultProps} />);
      
      // Fill form
      await user.type(screen.getByLabelText('Product Name *'), 'Test Product');
      await user.type(screen.getByLabelText('Description *'), 'Test description');
      
      // Close modal
      await user.click(screen.getByText('Cancel'));
      
      // Re-open modal - should have reset values
      rerender(<ProductModal {...defaultProps} />);
      
      expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Name should be empty
    });
  });

  describe('Loading States', () => {
    it('should show loading state during submission', async () => {
      mockSaveProduct.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<ProductModal {...defaultProps} />);
      
      // Fill and submit form
      await user.type(screen.getByLabelText('Product Name *'), 'Test Product');
      await user.type(screen.getByLabelText('Description *'), 'Test description');
      await user.type(screen.getByLabelText('Rate (₹) *'), '100');
      await user.type(screen.getByLabelText('HSN Code *'), '12345678');
      
      const submitButton = screen.getByText('Add Product');
      await user.click(submitButton);
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      
      // Check for loading spinner
      expect(submitButton.querySelector('svg')).toBeInTheDocument();
    });

    it('should disable all form inputs during submission', async () => {
      mockSaveProduct.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<ProductModal {...defaultProps} />);
      
      // Fill and submit form
      await user.type(screen.getByLabelText('Product Name *'), 'Test Product');
      await user.type(screen.getByLabelText('Description *'), 'Test description');
      await user.type(screen.getByLabelText('Rate (₹) *'), '100');
      await user.type(screen.getByLabelText('HSN Code *'), '12345678');
      
      await user.click(screen.getByText('Add Product'));
      
      expect(screen.getByLabelText('Product Name *')).toBeDisabled();
      expect(screen.getByLabelText('Description *')).toBeDisabled();
      expect(screen.getByLabelText('Unit *')).toBeDisabled();
      expect(screen.getByLabelText('Rate (₹) *')).toBeDisabled();
      expect(screen.getByLabelText('HSN Code *')).toBeDisabled();
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle minimum valid rate', async () => {
      render(<ProductModal {...defaultProps} />);
      
      const rateInput = screen.getByLabelText('Rate (₹) *');
      await user.clear(rateInput);
      await user.type(rateInput, '0');
      
      expect(rateInput).toHaveValue(0);
    });

    it('should handle maximum valid rate', async () => {
      render(<ProductModal {...defaultProps} />);
      
      const rateInput = screen.getByLabelText('Rate (₹) *');
      await user.clear(rateInput);
      await user.type(rateInput, '999999.99');
      
      expect(rateInput).toHaveValue(999999.99);
    });

    it('should handle special characters in text fields', async () => {
      render(<ProductModal {...defaultProps} />);
      
      const specialChars = boundaryValueTestData.edgeCaseInputs.specialCharacters;
      
      await user.type(screen.getByLabelText('Product Name *'), specialChars);
      await user.type(screen.getByLabelText('Description *'), specialChars);
      await user.type(screen.getByLabelText('HSN Code *'), specialChars);
      
      expect(screen.getByLabelText('Product Name *')).toHaveValue(specialChars);
      expect(screen.getByLabelText('Description *')).toHaveValue(specialChars);
      expect(screen.getByLabelText('HSN Code *')).toHaveValue(specialChars);
    });

    it('should handle unicode characters', async () => {
      render(<ProductModal {...defaultProps} />);
      
      const unicodeText = boundaryValueTestData.edgeCaseInputs.unicodeCharacters;
      const nameInput = screen.getByLabelText('Product Name *');
      
      await user.type(nameInput, unicodeText);
      expect(nameInput).toHaveValue(unicodeText);
    });

    it('should handle very long text input', async () => {
      render(<ProductModal {...defaultProps} />);
      
      const longText = 'A'.repeat(1000);
      const descriptionInput = screen.getByLabelText('Description *');
      
      await user.type(descriptionInput, longText);
      expect(descriptionInput).toHaveValue(longText);
    });

    it('should handle negative rate values', async () => {
      render(<ProductModal {...defaultProps} />);
      
      const rateInput = screen.getByLabelText('Rate (₹) *');
      await user.clear(rateInput);
      await user.type(rateInput, '-100');
      
      expect(rateInput).toHaveValue(-100);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ProductModal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('Product Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description *')).toBeInTheDocument();
      expect(screen.getByLabelText('Unit *')).toBeInTheDocument();
      expect(screen.getByLabelText('Rate (₹) *')).toBeInTheDocument();
      expect(screen.getByLabelText('HSN Code *')).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      render(<ProductModal {...defaultProps} />);
      
      const nameInput = screen.getByLabelText('Product Name *');
      nameInput.focus();
      expect(document.activeElement).toBe(nameInput);
      
      // Tab through form fields
      await user.tab();
      expect(document.activeElement).toBe(screen.getByLabelText('Description *'));
      
      await user.tab();
      expect(document.activeElement).toBe(screen.getByLabelText('Unit *'));
      
      await user.tab();
      expect(document.activeElement).toBe(screen.getByLabelText('Rate (₹) *'));
      
      await user.tab();
      expect(document.activeElement).toBe(screen.getByLabelText('HSN Code *'));
      
      await user.tab();
      expect(document.activeElement).toBe(screen.getByText('Cancel'));
      
      await user.tab();
      expect(document.activeElement).toBe(screen.getByText('Add Product'));
    });

    it('should support form submission via Enter key', async () => {
      render(<ProductModal {...defaultProps} />);
      
      // Fill form
      await user.type(screen.getByLabelText('Product Name *'), 'Test Product');
      await user.type(screen.getByLabelText('Description *'), 'Test description');
      await user.type(screen.getByLabelText('Rate (₹) *'), '100');
      await user.type(screen.getByLabelText('HSN Code *'), '12345678');
      
      // Press Enter to submit
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(mockSaveProduct).toHaveBeenCalled();
      });
    });

    it('should support modal close via Escape key', async () => {
      render(<ProductModal {...defaultProps} />);
      
      await user.keyboard('{Escape}');
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Unit Selection Options', () => {
    it('should provide all expected unit options', () => {
      render(<ProductModal {...defaultProps} />);
      
      const unitSelect = screen.getByLabelText('Unit *');
      
      expect(screen.getByRole('option', { name: 'Pieces' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Kg' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Liters' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Meters' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Sq Ft' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Box' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Set' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Pair' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Dozen' })).toBeInTheDocument();
    });

    it('should have pieces as default selected unit', () => {
      render(<ProductModal {...defaultProps} />);
      
      const unitSelect = screen.getByLabelText('Unit *');
      expect(unitSelect).toHaveValue('pcs');
    });
  });

  describe('Form Reset Behavior', () => {
    it('should reset form to initial values when closed and reopened', async () => {
      const { rerender } = render(<ProductModal {...defaultProps} initialName="Initial Name" />);
      
      // Modify form
      await user.clear(screen.getByLabelText('Product Name *'));
      await user.type(screen.getByLabelText('Product Name *'), 'Modified Name');
      await user.type(screen.getByLabelText('Description *'), 'Some description');
      
      // Close modal
      await user.click(screen.getByText('Cancel'));
      
      // Re-open modal
      rerender(<ProductModal {...defaultProps} initialName="Initial Name" />);
      
      // Should reset to initial values
      expect(screen.getByDisplayValue('Initial Name')).toBeInTheDocument();
      expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Description should be empty
      expect(screen.getByDisplayValue('0')).toBeInTheDocument(); // Rate should be 0
    });

    it('should preserve initialName across resets', async () => {
      const { rerender } = render(<ProductModal {...defaultProps} initialName="Preserved Name" />);
      
      // Modify and close
      await user.type(screen.getByLabelText('Description *'), 'Description');
      await user.click(screen.getByText('Cancel'));
      
      // Re-open with same initialName
      rerender(<ProductModal {...defaultProps} initialName="Preserved Name" />);
      
      expect(screen.getByDisplayValue('Preserved Name')).toBeInTheDocument();
    });
  });
});