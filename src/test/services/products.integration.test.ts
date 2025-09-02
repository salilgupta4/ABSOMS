import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { getProducts, getProduct, saveProduct, deleteProduct } from '../../../components/products/ProductList';
import { createMockProduct, createMockProductFormData, boundaryValueTestData } from '../utils';

// Mock Firebase Firestore
vi.mock('firebase/firestore');

const mockCollection = vi.mocked(collection);
const mockGetDocs = vi.mocked(getDocs);
const mockDoc = vi.mocked(doc);
const mockGetDoc = vi.mocked(getDoc);
const mockSetDoc = vi.mocked(setDoc);
const mockAddDoc = vi.mocked(addDoc);
const mockDeleteDoc = vi.mocked(deleteDoc);

describe('Product Services Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should fetch all products from Firestore', async () => {
      const mockProducts = [
        createMockProduct({ id: '1', name: 'Product 1' }),
        createMockProduct({ id: '2', name: 'Product 2' }),
        createMockProduct({ id: '3', name: 'Product 3' }),
      ];

      const mockDocs = mockProducts.map(product => ({
        id: product.id,
        data: () => ({ ...product, id: undefined }),
      }));

      mockGetDocs.mockResolvedValue({ docs: mockDocs } as any);
      mockCollection.mockReturnValue('products-collection' as any);

      const result = await getProducts();

      expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'products');
      expect(mockGetDocs).toHaveBeenCalledWith('products-collection');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(mockProducts[0]);
      expect(result[1]).toEqual(mockProducts[1]);
      expect(result[2]).toEqual(mockProducts[2]);
    });

    it('should handle empty product collection', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] } as any);
      
      const result = await getProducts();
      
      expect(result).toEqual([]);
    });

    it('should handle Firestore errors', async () => {
      const firestoreError = new Error('Firestore connection failed');
      mockGetDocs.mockRejectedValue(firestoreError);
      
      await expect(getProducts()).rejects.toThrow('Firestore connection failed');
    });

    it('should handle malformed document data', async () => {
      const mockDocs = [
        {
          id: '1',
          data: () => ({ name: 'Valid Product', rate: 100 }),
        },
        {
          id: '2',
          data: () => null, // Malformed data
        },
        {
          id: '3',
          data: () => ({ name: 'Another Valid Product', rate: 200 }),
        },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockDocs } as any);
      
      const result = await getProducts();
      
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Valid Product');
      expect(result[1]).toEqual({ id: '2' }); // Should handle null data
      expect(result[2].name).toBe('Another Valid Product');
    });

    it('should preserve all product fields', async () => {
      const fullProduct = createMockProduct({
        id: 'full-product',
        name: 'Full Product',
        description: 'Complete description',
        unit: 'kg',
        rate: 99.99,
        hsnCode: '12345678'
      });

      const mockDocs = [{
        id: 'full-product',
        data: () => ({ ...fullProduct, id: undefined }),
      }];

      mockGetDocs.mockResolvedValue({ docs: mockDocs } as any);
      
      const result = await getProducts();
      
      expect(result[0]).toEqual(fullProduct);
    });
  });

  describe('getProduct', () => {
    it('should fetch a single product by ID', async () => {
      const mockProduct = createMockProduct({ id: 'test-product' });
      
      mockDoc.mockReturnValue('product-doc-ref' as any);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'test-product',
        data: () => ({ ...mockProduct, id: undefined }),
      } as any);

      const result = await getProduct('test-product');

      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'products', 'test-product');
      expect(mockGetDoc).toHaveBeenCalledWith('product-doc-ref');
      expect(result).toEqual(mockProduct);
    });

    it('should return undefined for non-existent product', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      } as any);

      const result = await getProduct('non-existent');

      expect(result).toBeUndefined();
    });

    it('should handle Firestore errors during single product fetch', async () => {
      const firestoreError = new Error('Document access denied');
      mockGetDoc.mockRejectedValue(firestoreError);

      await expect(getProduct('test-id')).rejects.toThrow('Document access denied');
    });

    it('should handle empty document data', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'empty-product',
        data: () => ({}),
      } as any);

      const result = await getProduct('empty-product');

      expect(result).toEqual({ id: 'empty-product' });
    });
  });

  describe('saveProduct', () => {
    describe('Creating new product', () => {
      it('should create new product without ID', async () => {
        const productData = createMockProductFormData();
        const expectedProduct = createMockProduct({ id: 'new-doc-id' });
        
        mockAddDoc.mockResolvedValue({ id: 'new-doc-id' } as any);
        mockCollection.mockReturnValue('products-collection' as any);

        const result = await saveProduct(productData);

        expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'products');
        expect(mockAddDoc).toHaveBeenCalledWith('products-collection', productData);
        expect(result).toEqual({ id: 'new-doc-id', ...productData });
      });

      it('should handle creation errors', async () => {
        const productData = createMockProductFormData();
        const creationError = new Error('Permission denied');
        
        mockAddDoc.mockRejectedValue(creationError);

        await expect(saveProduct(productData)).rejects.toThrow('Permission denied');
      });
    });

    describe('Updating existing product', () => {
      it('should update existing product with ID', async () => {
        const productData = createMockProductFormData({ id: 'existing-id' });
        
        mockDoc.mockReturnValue('product-doc-ref' as any);
        mockSetDoc.mockResolvedValue(undefined);

        const result = await saveProduct(productData);

        expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'products', 'existing-id');
        expect(mockSetDoc).toHaveBeenCalledWith('product-doc-ref', { ...productData, id: undefined });
        expect(result).toEqual(productData);
      });

      it('should handle update errors', async () => {
        const productData = createMockProductFormData({ id: 'existing-id' });
        const updateError = new Error('Document not found');
        
        mockSetDoc.mockRejectedValue(updateError);

        await expect(saveProduct(productData)).rejects.toThrow('Document not found');
      });
    });

    describe('Data validation during save', () => {
      it('should handle boundary values correctly', async () => {
        const boundaryProduct = createMockProductFormData({
          name: 'A', // Minimum length
          rate: 0.01, // Minimum rate
          hsnCode: '1', // Minimum HSN code
        });
        
        mockAddDoc.mockResolvedValue({ id: 'boundary-id' } as any);

        const result = await saveProduct(boundaryProduct);

        expect(result.name).toBe('A');
        expect(result.rate).toBe(0.01);
        expect(result.hsnCode).toBe('1');
      });

      it('should handle maximum boundary values', async () => {
        const maxProduct = createMockProductFormData({
          name: 'Z'.repeat(255), // Long name
          rate: 999999.99, // High rate
          description: 'D'.repeat(1000), // Long description
        });
        
        mockAddDoc.mockResolvedValue({ id: 'max-id' } as any);

        const result = await saveProduct(maxProduct);

        expect(result.name).toBe('Z'.repeat(255));
        expect(result.rate).toBe(999999.99);
        expect(result.description).toBe('D'.repeat(1000));
      });

      it('should handle special characters in product data', async () => {
        const specialProduct = createMockProductFormData({
          name: boundaryValueTestData.edgeCaseInputs.specialCharacters,
          description: boundaryValueTestData.edgeCaseInputs.specialCharacters,
          hsnCode: '!@#$%^&*()',
        });
        
        mockAddDoc.mockResolvedValue({ id: 'special-id' } as any);

        const result = await saveProduct(specialProduct);

        expect(result.name).toBe(boundaryValueTestData.edgeCaseInputs.specialCharacters);
        expect(result.description).toBe(boundaryValueTestData.edgeCaseInputs.specialCharacters);
        expect(result.hsnCode).toBe('!@#$%^&*()');
      });

      it('should handle unicode characters', async () => {
        const unicodeProduct = createMockProductFormData({
          name: boundaryValueTestData.edgeCaseInputs.unicodeCharacters,
          description: boundaryValueTestData.edgeCaseInputs.unicodeCharacters,
        });
        
        mockAddDoc.mockResolvedValue({ id: 'unicode-id' } as any);

        const result = await saveProduct(unicodeProduct);

        expect(result.name).toBe(boundaryValueTestData.edgeCaseInputs.unicodeCharacters);
        expect(result.description).toBe(boundaryValueTestData.edgeCaseInputs.unicodeCharacters);
      });

      it('should handle zero and negative rates', async () => {
        const zeroRateProduct = createMockProductFormData({ rate: 0 });
        const negativeRateProduct = createMockProductFormData({ rate: -100 });
        
        mockAddDoc.mockResolvedValueOnce({ id: 'zero-id' } as any);
        mockAddDoc.mockResolvedValueOnce({ id: 'negative-id' } as any);

        const zeroResult = await saveProduct(zeroRateProduct);
        const negativeResult = await saveProduct(negativeRateProduct);

        expect(zeroResult.rate).toBe(0);
        expect(negativeResult.rate).toBe(-100);
      });
    });
  });

  describe('deleteProduct', () => {
    it('should delete product by ID', async () => {
      mockDoc.mockReturnValue('product-doc-ref' as any);
      mockDeleteDoc.mockResolvedValue(undefined);

      const result = await deleteProduct('test-id');

      expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'products', 'test-id');
      expect(mockDeleteDoc).toHaveBeenCalledWith('product-doc-ref');
      expect(result).toEqual({ success: true });
    });

    it('should handle deletion errors', async () => {
      const deletionError = new Error('Permission denied');
      mockDeleteDoc.mockRejectedValue(deletionError);

      await expect(deleteProduct('test-id')).rejects.toThrow('Permission denied');
    });

    it('should handle deletion of non-existent product', async () => {
      // Firestore doesn't throw error for deleting non-existent docs
      mockDeleteDoc.mockResolvedValue(undefined);

      const result = await deleteProduct('non-existent');

      expect(result).toEqual({ success: true });
    });
  });

  describe('Error Scenarios and Edge Cases', () => {
    it('should handle network connectivity issues', async () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';
      
      mockGetDocs.mockRejectedValue(networkError);

      await expect(getProducts()).rejects.toThrow('Network request failed');
    });

    it('should handle Firestore quota exceeded', async () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'QuotaExceededError';
      
      mockAddDoc.mockRejectedValue(quotaError);

      const productData = createMockProductFormData();
      await expect(saveProduct(productData)).rejects.toThrow('Quota exceeded');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('User not authenticated');
      authError.name = 'AuthenticationError';
      
      mockGetDoc.mockRejectedValue(authError);

      await expect(getProduct('test-id')).rejects.toThrow('User not authenticated');
    });

    it('should handle corrupted document structure', async () => {
      const mockDocs = [
        {
          id: '1',
          data: () => ({ name: 123, rate: 'invalid' }), // Wrong data types
        },
      ];

      mockGetDocs.mockResolvedValue({ docs: mockDocs } as any);
      
      const result = await getProducts();
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: '1', name: 123, rate: 'invalid' });
    });

    it('should handle very large product collections', async () => {
      const largeCollection = Array.from({ length: 10000 }, (_, i) => ({
        id: `product-${i}`,
        data: () => createMockProduct({ id: undefined, name: `Product ${i}` }),
      }));

      mockGetDocs.mockResolvedValue({ docs: largeCollection } as any);
      
      const startTime = performance.now();
      const result = await getProducts();
      const endTime = performance.now();
      
      expect(result).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data integrity during save operations', async () => {
      const originalData = createMockProductFormData({
        name: 'Original Product',
        rate: 100.50,
        hsnCode: '12345678'
      });
      
      mockAddDoc.mockResolvedValue({ id: 'consistency-test' } as any);

      const result = await saveProduct(originalData);

      // Verify all fields are preserved exactly
      expect(result.name).toBe(originalData.name);
      expect(result.rate).toBe(originalData.rate);
      expect(result.hsnCode).toBe(originalData.hsnCode);
      expect(result.description).toBe(originalData.description);
      expect(result.unit).toBe(originalData.unit);
      expect(result.id).toBe('consistency-test');
    });

    it('should not modify original object during save', async () => {
      const originalData = createMockProductFormData({ name: 'Original' });
      const originalCopy = { ...originalData };
      
      mockAddDoc.mockResolvedValue({ id: 'immutable-test' } as any);

      await saveProduct(originalData);

      // Original object should be unchanged
      expect(originalData).toEqual(originalCopy);
    });

    it('should handle concurrent save operations', async () => {
      const product1 = createMockProductFormData({ name: 'Product 1' });
      const product2 = createMockProductFormData({ name: 'Product 2' });
      
      mockAddDoc.mockResolvedValueOnce({ id: 'concurrent-1' } as any);
      mockAddDoc.mockResolvedValueOnce({ id: 'concurrent-2' } as any);

      const [result1, result2] = await Promise.all([
        saveProduct(product1),
        saveProduct(product2)
      ]);

      expect(result1.name).toBe('Product 1');
      expect(result2.name).toBe('Product 2');
      expect(result1.id).toBe('concurrent-1');
      expect(result2.id).toBe('concurrent-2');
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk operations efficiently', async () => {
      const bulkProducts = Array.from({ length: 100 }, (_, i) =>
        createMockProductFormData({ name: `Bulk Product ${i}` })
      );
      
      mockAddDoc.mockImplementation(() => Promise.resolve({ id: `bulk-${Math.random()}` }));

      const startTime = performance.now();
      const results = await Promise.all(bulkProducts.map(p => saveProduct(p)));
      const endTime = performance.now();

      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle rapid successive reads', async () => {
      const mockProduct = createMockProduct();
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'rapid-test',
        data: () => mockProduct,
      } as any);

      const startTime = performance.now();
      const results = await Promise.all(
        Array.from({ length: 50 }, () => getProduct('rapid-test'))
      );
      const endTime = performance.now();

      expect(results).toHaveLength(50);
      expect(results.every(r => r?.id === 'rapid-test')).toBe(true);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});