

import { InventoryItem, StockMovement, Product } from '../../types';
import { db, Timestamp, DocumentSnapshot } from '@/services/firebase';
import { collection, getDocs, query, where, orderBy, addDoc, getDoc } from 'firebase/firestore';

const processMovementDoc = (docSnap: DocumentSnapshot): StockMovement => {
    const data = docSnap.data() as any;
    if (data.date && data.date instanceof Timestamp) {
        data.date = data.date.toDate().toISOString();
    }
    return { id: docSnap.id, ...data } as StockMovement;
};

export const getInventory = async (): Promise<InventoryItem[]> => {
    console.log('Getting inventory data...');
    const productsCol = collection(db, 'products');
    const movementsCol = collection(db, 'stock_movements');
    
    const [productSnapshot, movementSnapshot] = await Promise.all([
        getDocs(productsCol),
        getDocs(movementsCol)
    ]);
    
    const products = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    const movements = movementSnapshot.docs.map(processMovementDoc);
    
    console.log('Found', products.length, 'products and', movements.length, 'stock movements');

    // Create inventory items from products with movements
    const inventoryItems = products.map(product => {
        const productMovements = movements.filter(m => m.productId === product.id);
        
        let currentStock = 0;
        productMovements.forEach(m => {
            currentStock += (m.type === 'in' ? 1 : -1) * m.quantity;
        });

        const lastMovement = productMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        return {
            productId: product.id,
            productName: product.name,
            currentStock: currentStock,
            unit: product.unit,
            lastUpdated: lastMovement ? lastMovement.date : new Date(0).toISOString(),
        };
    });

    // Also check for orphaned stock movements (movements for products that no longer exist)
    const productIds = new Set(products.map(p => p.id));
    const orphanedMovements = movements.filter(m => !productIds.has(m.productId));
    
    if (orphanedMovements.length > 0) {
        console.warn('Found stock movements for deleted products:', orphanedMovements.map(m => ({
            productId: m.productId,
            productName: m.productName,
            movementId: m.id
        })));
    }

    return inventoryItems.sort((a,b) => b.currentStock - a.currentStock);
};

export const getStockMovementsForProduct = async (productId: string): Promise<StockMovement[]> => {
    try {
        console.log('Querying stock movements for productId:', productId);
        
        // First try without orderBy to see if there's an index issue
        const simpleQuery = query(collection(db, 'stock_movements'), where("productId", "==", productId));
        const querySnapshot = await getDocs(simpleQuery);
        
        console.log('Stock movements query returned', querySnapshot.docs.length, 'documents');
        
        if (querySnapshot.docs.length > 0) {
            console.log('Sample movement data:', querySnapshot.docs[0].data());
            console.log('All movement documents:', querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
        }
        
        const movements = querySnapshot.docs.map(processMovementDoc);
        console.log('Processed movements:', movements);
        
        // Sort by date in JavaScript instead of Firestore
        const sortedMovements = movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return sortedMovements;
    } catch (error) {
        console.error('Error querying stock movements:', error);
        throw error;
    }
};

export const addStockMovement = async (movementData: Omit<StockMovement, 'id' | 'date'>): Promise<StockMovement> => {
    try {
        console.log('addStockMovement called with:', movementData);
        
        const newMovement = {
            ...movementData,
            date: Timestamp.now()
        };
        
        console.log('Attempting to save to Firestore:', newMovement);
        const docRef = await addDoc(collection(db, 'stock_movements'), newMovement);
        console.log('Document added with ID:', docRef.id);
        
        const savedDoc = await getDoc(docRef);
        if (!savedDoc.exists()) {
            throw new Error('Document was not saved properly');
        }
        
        const result = processMovementDoc(savedDoc);
        console.log('Stock movement processed and returned:', result);
        return result;
    } catch (error) {
        console.error('Error in addStockMovement:', error);
        throw error;
    }
};