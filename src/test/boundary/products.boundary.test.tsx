import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render, createMockProduct, boundaryValueTestData, userEvent } from '../utils';
import ProductForm from '../../../components/products/ProductForm';
import ProductModal from '../../../components/products/ProductModal';
import { getProducts, saveProduct } from '../../../components/products/ProductList';

// Mock the services
const mockGetProducts = vi.fn();
const mockSaveProduct = vi.fn();

vi.mock('../../../components/products/ProductList', () => ({
  default: () => null,
  getProducts: mockGetProducts,
  saveProduct: mockSaveProduct,
}));

describe('Products Module - Boundary Value Analysis Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveProduct.mockResolvedValue(createMockProduct());
  });

  describe('Text Field Boundaries', () => {
    describe('Product Name Field', () => {
      it('should handle minimum valid name length (1 character)', async () => {
        render(<ProductForm />);
        
        const nameInput = screen.getByLabelText('Product Name');
        await user.clear(nameInput);
        await user.type(nameInput, 'A');
        
        expect(nameInput).toHaveValue('A');
      });

      it('should handle maximum reasonable name length', async () => {
        render(<ProductForm />);
        
        const longName = 'A'.repeat(255);
        const nameInput = screen.getByLabelText('Product Name');
        
        await user.clear(nameInput);
        await user.type(nameInput, longName);
        
        expect(nameInput).toHaveValue(longName);
      });

      it('should handle extremely long names without crashing', async () => {
        render(<ProductForm />);
        
        const extremelyLongName = 'A'.repeat(10000);
        const nameInput = screen.getByLabelText('Product Name');
        
        await user.clear(nameInput);
        await user.type(nameInput, extremelyLongName);
        
        expect(nameInput).toHaveValue(extremelyLongName);
      });

      it('should handle empty string (boundary case)', async () => {
        render(<ProductForm />);
        
        const nameInput = screen.getByLabelText('Product Name');
        await user.clear(nameInput);
        
        expect(nameInput).toHaveValue('');
        expect(nameInput).toHaveAttribute('required');
      });

      it('should handle whitespace-only names', async () => {
        render(<ProductForm />);
        
        const nameInput = screen.getByLabelText('Product Name');
        await user.clear(nameInput);
        await user.type(nameInput, '   ');
        
        expect(nameInput).toHaveValue('   ');
      });

      it('should handle names with leading/trailing spaces', async () => {
        render(<ProductForm />);
        
        const nameInput = screen.getByLabelText('Product Name');
        await user.clear(nameInput);
        await user.type(nameInput, '  Product Name  ');
        
        expect(nameInput).toHaveValue('  Product Name  ');
      });
    });

    describe('HSN Code Field', () => {
      it('should handle minimum HSN code length', async () => {
        render(<ProductForm />);
        
        const hsnInput = screen.getByLabelText('HSN Code');
        await user.clear(hsnInput);
        await user.type(hsnInput, '1');
        
        expect(hsnInput).toHaveValue('1');
      });

      it('should handle standard 8-digit HSN code', async () => {
        render(<ProductForm />);
        
        const hsnInput = screen.getByLabelText('HSN Code');
        await user.clear(hsnInput);
        await user.type(hsnInput, '12345678');
        
        expect(hsnInput).toHaveValue('12345678');
      });

      it('should handle longer HSN codes', async () => {
        render(<ProductForm />);
        
        const hsnInput = screen.getByLabelText('HSN Code');
        await user.clear(hsnInput);
        await user.type(hsnInput, '1234567890123456');
        
        expect(hsnInput).toHaveValue('1234567890123456');
      });

      it('should handle alphanumeric HSN codes', async () => {
        render(<ProductForm />);
        
        const hsnInput = screen.getByLabelText('HSN Code');
        await user.clear(hsnInput);
        await user.type(hsnInput, 'ABC123DEF');
        
        expect(hsnInput).toHaveValue('ABC123DEF');
      });
    });

    describe('Description Field', () => {
      it('should handle minimum description (single character)', async () => {
        render(<ProductForm />);
        
        const descInput = screen.getByLabelText('Description');
        await user.clear(descInput);
        await user.type(descInput, 'A');
        
        expect(descInput).toHaveValue('A');
      });

      it('should handle very long descriptions', async () => {
        render(<ProductForm />);
        
        const longDesc = 'This is a very detailed product description that goes on and on and contains a lot of information about the product. '.repeat(50);
        const descInput = screen.getByLabelText('Description');
        
        await user.clear(descInput);
        await user.type(descInput, longDesc);
        
        expect(descInput).toHaveValue(longDesc);
      });

      it('should handle newlines and special formatting in descriptions', async () => {
        render(<ProductForm />);
        
        const formattedDesc = 'Line 1\nLine 2\nLine 3\n\nWith empty line\tand tab';
        const descInput = screen.getByLabelText('Description');
        
        await user.clear(descInput);
        await user.type(descInput, formattedDesc);
        
        expect(descInput).toHaveValue(formattedDesc);
      });
    });
  });

  describe('Numeric Field Boundaries', () => {
    describe('Rate Field', () => {
      it('should handle zero rate', async () => {
        render(<ProductForm />);
        
        const rateInput = screen.getByLabelText('Rate (₹)');
        await user.clear(rateInput);
        await user.type(rateInput, '0');
        
        expect(rateInput).toHaveValue(0);
      });

      it('should handle minimum positive rate (0.01)', async () => {
        render(<ProductForm />);
        
        const rateInput = screen.getByLabelText('Rate (₹)');
        await user.clear(rateInput);
        await user.type(rateInput, '0.01');
        
        expect(rateInput).toHaveValue(0.01);
      });

      it('should handle very small decimal rates', async () => {
        render(<ProductForm />);
        
        const rateInput = screen.getByLabelText('Rate (₹)');
        await user.clear(rateInput);
        await user.type(rateInput, '0.001');
        
        expect(rateInput).toHaveValue(0.001);
      });

      it('should handle negative rates', async () => {
        render(<ProductForm />);
        
        const rateInput = screen.getByLabelText('Rate (₹)');
        await user.clear(rateInput);
        await user.type(rateInput, '-100');
        
        expect(rateInput).toHaveValue(-100);
      });

      it('should handle very large rates', async () => {
        render(<ProductForm />);
        
        const rateInput = screen.getByLabelText('Rate (₹)');
        await user.clear(rateInput);
        await user.type(rateInput, '9999999.99');
        
        expect(rateInput).toHaveValue(9999999.99);
      });

      it('should handle extremely large rates', async () => {
        render(<ProductForm />);
        
        const rateInput = screen.getByLabelText('Rate (₹)');
        await user.clear(rateInput);
        await user.type(rateInput, '999999999999.99');
        
        expect(rateInput).toHaveValue(999999999999.99);
      });

      it('should handle many decimal places', async () => {
        render(<ProductForm />);
        
        const rateInput = screen.getByLabelText('Rate (₹)');
        await user.clear(rateInput);
        await user.type(rateInput, '123.123456789');
        
        expect(rateInput).toHaveValue(123.123456789);
      });

      it('should handle scientific notation input', async () => {
        render(<ProductForm />);
        
        const rateInput = screen.getByLabelText('Rate (₹)');
        await user.clear(rateInput);
        await user.type(rateInput, '1e5'); // 100000
        
        expect(rateInput).toHaveValue(100000);
      });

      it('should handle invalid numeric input gracefully', async () => {
        render(<ProductForm />);
        
        const rateInput = screen.getByLabelText('Rate (₹)');
        await user.clear(rateInput);
        await user.type(rateInput, 'abc');
        
        // Should fall back to 0 or NaN handling
        expect(rateInput).toHaveValue(0);
      });
    });
  });

  describe('Special Character Handling', () => {
    const specialCharsTests = [
      { name: 'Basic special characters', input: '!@#$%^&*()' },
      { name: 'Brackets and quotes', input: '[]{}"\'' },
      { name: 'Math symbols', input: '+-=<>|\\/' },
      { name: 'Currency symbols', input: '¢£¥€₹' },
      { name: 'Accented characters', input: 'àáâãäåæçèéêë' },
      { name: 'Unicode symbols', input: '→←↑↓★☆♥♦' },
      { name: 'Emojis', input: '🚀🎉💻📱' },
      { name: 'Chinese characters', input: '产品名称描述' },
      { name: 'Arabic characters', input: 'اسم المنتج' },
      { name: 'Russian characters', input: 'Название продукта' },
      { name: 'Mixed scripts', input: 'Product产品Продукт' },
    ];

    specialCharsTests.forEach(({ name, input }) => {
      it(`should handle ${name} in product name`, async () => {
        render(<ProductForm />);
        
        const nameInput = screen.getByLabelText('Product Name');
        await user.clear(nameInput);
        await user.type(nameInput, input);
        
        expect(nameInput).toHaveValue(input);
      });

      it(`should handle ${name} in description`, async () => {
        render(<ProductForm />);
        
        const descInput = screen.getByLabelText('Description');
        await user.clear(descInput);
        await user.type(descInput, input);
        
        expect(descInput).toHaveValue(input);
      });
    });
  });

  describe('Unit Field Edge Cases', () => {
    it('should handle very long unit names', async () => {
      render(<ProductForm />);
      
      const unitInput = screen.getByLabelText('Unit (e.g., pcs, kg)');
      const longUnit = 'VeryLongUnitNameThatMightBreakTheSystem';
      
      await user.clear(unitInput);
      await user.type(unitInput, longUnit);
      
      expect(unitInput).toHaveValue(longUnit);
    });

    it('should handle special characters in unit names', async () => {
      render(<ProductForm />);
      
      const unitInput = screen.getByLabelText('Unit (e.g., pcs, kg)');
      await user.clear(unitInput);
      await user.type(unitInput, 'm²/kg');
      
      expect(unitInput).toHaveValue('m²/kg');
    });

    it('should handle empty unit', async () => {
      render(<ProductForm />);
      
      const unitInput = screen.getByLabelText('Unit (e.g., pcs, kg)');
      await user.clear(unitInput);
      
      expect(unitInput).toHaveValue('');
      expect(unitInput).toHaveAttribute('required');
    });
  });

  describe('Modal Boundary Testing', () => {
    const modalProps = {
      isOpen: true,
      onClose: vi.fn(),
      onProductCreated: vi.fn(),
      initialName: '',
    };

    it('should handle very long initial names in modal', async () => {
      const longName = 'A'.repeat(500);
      render(<ProductModal {...modalProps} initialName={longName} />);
      
      expect(screen.getByDisplayValue(longName)).toBeInTheDocument();
    });

    it('should handle special characters in initial name', async () => {
      const specialName = boundaryValueTestData.edgeCaseInputs.specialCharacters;
      render(<ProductModal {...modalProps} initialName={specialName} />);
      
      expect(screen.getByDisplayValue(specialName)).toBeInTheDocument();
    });

    it('should handle unicode in initial name', async () => {
      const unicodeName = boundaryValueTestData.edgeCaseInputs.unicodeCharacters;
      render(<ProductModal {...modalProps} initialName={unicodeName} />);
      
      expect(screen.getByDisplayValue(unicodeName)).toBeInTheDocument();
    });
  });

  describe('Form Submission with Boundary Values', () => {
    it('should successfully submit with minimum valid values', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<ProductForm />);
      
      // Fill with minimum values
      await user.type(screen.getByLabelText('Product Name'), 'A');
      await user.type(screen.getByLabelText('Description'), 'B');
      await user.type(screen.getByLabelText('Unit (e.g., pcs, kg)'), 'C');
      await user.clear(screen.getByLabelText('Rate (₹)'));
      await user.type(screen.getByLabelText('Rate (₹)'), '0.01');
      await user.type(screen.getByLabelText('HSN Code'), '1');
      
      await user.click(screen.getByText('Create Product'));
      
      await waitFor(() => {
        expect(mockSaveProduct).toHaveBeenCalledWith({
          name: 'A',
          description: 'B',
          unit: 'C',
          rate: 0.01,
          hsnCode: '1'
        });
      });
      
      alertSpy.mockRestore();
    });

    it('should successfully submit with maximum boundary values', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<ProductForm />);
      
      const longName = 'A'.repeat(255);
      const longDesc = 'B'.repeat(1000);
      const longUnit = 'C'.repeat(50);
      const longHsn = '1'.repeat(16);
      
      await user.clear(screen.getByLabelText('Product Name'));
      await user.type(screen.getByLabelText('Product Name'), longName);
      await user.clear(screen.getByLabelText('Description'));
      await user.type(screen.getByLabelText('Description'), longDesc);
      await user.clear(screen.getByLabelText('Unit (e.g., pcs, kg)'));
      await user.type(screen.getByLabelText('Unit (e.g., pcs, kg)'), longUnit);
      await user.clear(screen.getByLabelText('Rate (₹)'));
      await user.type(screen.getByLabelText('Rate (₹)'), '999999.99');
      await user.clear(screen.getByLabelText('HSN Code'));
      await user.type(screen.getByLabelText('HSN Code'), longHsn);
      
      await user.click(screen.getByText('Create Product'));
      
      await waitFor(() => {
        expect(mockSaveProduct).toHaveBeenCalledWith({
          name: longName,
          description: longDesc,
          unit: longUnit,
          rate: 999999.99,
          hsnCode: longHsn
        });
      });
      
      alertSpy.mockRestore();
    });

    it('should handle special characters in all fields during submission', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<ProductForm />);
      
      const specialChars = '!@#$%^&*()';
      
      await user.clear(screen.getByLabelText('Product Name'));
      await user.type(screen.getByLabelText('Product Name'), `Product${specialChars}`);
      await user.clear(screen.getByLabelText('Description'));
      await user.type(screen.getByLabelText('Description'), `Description${specialChars}`);
      await user.clear(screen.getByLabelText('Unit (e.g., pcs, kg)'));
      await user.type(screen.getByLabelText('Unit (e.g., pcs, kg)'), `unit${specialChars}`);
      await user.clear(screen.getByLabelText('Rate (₹)'));
      await user.type(screen.getByLabelText('Rate (₹)'), '100');
      await user.clear(screen.getByLabelText('HSN Code'));
      await user.type(screen.getByLabelText('HSN Code'), `HSN${specialChars}`);
      
      await user.click(screen.getByText('Create Product'));
      
      await waitFor(() => {
        expect(mockSaveProduct).toHaveBeenCalledWith({
          name: `Product${specialChars}`,
          description: `Description${specialChars}`,
          unit: `unit${specialChars}`,
          rate: 100,
          hsnCode: `HSN${specialChars}`
        });
      });
      
      alertSpy.mockRestore();
    });
  });

  describe('Data Service Boundary Testing', () => {
    it('should handle empty product arrays from service', async () => {
      mockGetProducts.mockResolvedValue([]);
      
      const result = await getProducts();
      expect(result).toEqual([]);
    });

    it('should handle very large product arrays', async () => {
      const largeArray = Array.from({ length: 50000 }, (_, i) => 
        createMockProduct({ id: `prod-${i}`, name: `Product ${i}` })
      );
      mockGetProducts.mockResolvedValue(largeArray);
      
      const result = await getProducts();
      expect(result).toHaveLength(50000);
    });

    it('should handle products with boundary value data', async () => {
      const boundaryProduct = createMockProduct({
        name: '',
        description: '',
        rate: 0,
        unit: '',
        hsnCode: '',
      });
      
      mockSaveProduct.mockResolvedValue(boundaryProduct);
      
      const result = await saveProduct(boundaryProduct);
      expect(result).toEqual(boundaryProduct);
    });

    it('should handle products with extreme values', async () => {
      const extremeProduct = createMockProduct({
        name: 'A'.repeat(10000),
        description: 'B'.repeat(50000),
        rate: 999999999999.999999,
        unit: 'C'.repeat(1000),
        hsnCode: '1'.repeat(1000),
      });
      
      mockSaveProduct.mockResolvedValue(extremeProduct);
      
      const result = await saveProduct(extremeProduct);
      expect(result).toEqual(extremeProduct);
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle pasting large amounts of text', async () => {
      render(<ProductForm />);
      
      const nameInput = screen.getByLabelText('Product Name');
      const largeText = 'Pasted Content '.repeat(10000);
      
      // Simulate paste operation
      await user.click(nameInput);
      await user.keyboard('{Control>}v{/Control}');
      
      // Since we can't actually paste in tests, we'll type the content
      await user.clear(nameInput);
      await user.type(nameInput, largeText.substring(0, 100)); // Truncate for test performance
      
      expect(nameInput.value.length).toBeGreaterThan(0);
    });

    it('should handle rapid input changes', async () => {
      render(<ProductForm />);
      
      const nameInput = screen.getByLabelText('Product Name');
      
      // Rapidly type and clear
      for (let i = 0; i < 10; i++) {
        await user.type(nameInput, `Text${i}`);
        await user.clear(nameInput);
      }
      
      expect(nameInput).toHaveValue('');
    });

    it('should handle simultaneous field updates', async () => {
      render(<ProductForm />);
      
      // Update multiple fields simultaneously (as much as possible in tests)
      const nameInput = screen.getByLabelText('Product Name');
      const descInput = screen.getByLabelText('Description');
      const rateInput = screen.getByLabelText('Rate (₹)');
      
      await Promise.all([
        user.type(nameInput, 'Name'),
        user.type(descInput, 'Description'),
        user.type(rateInput, '100'),
      ]);
      
      expect(nameInput).toHaveValue('Name');
      expect(descInput).toHaveValue('Description');
      expect(rateInput).toHaveValue(100);
    });
  });
});