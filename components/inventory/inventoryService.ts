

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
    const productsCol = collection(db, 'products');
    const movementsCol = collection(db, 'stock_movements');
    
    const [productSnapshot, movementSnapshot] = await Promise.all([
        getDocs(productsCol),
        getDocs(movementsCol)
    ]);
    
    const products = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    const movements = movementSnapshot.docs.map(processMovementDoc);

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

    return inventoryItems.sort((a,b) => a.productName.localeCompare(b.productName));
};

export const getStockMovementsForProduct = async (productId: string): Promise<StockMovement[]> => {
    const q = query(collection(db, 'stock_movements'), where("productId", "==", productId), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(processMovementDoc);
};

export const addStockMovement = async (movementData: Omit<StockMovement, 'id' | 'date'>): Promise<StockMovement> => {
    const newMovement = {
        ...movementData,
        date: Timestamp.now()
    };
    const docRef = await addDoc(collection(db, 'stock_movements'), newMovement);
    const savedDoc = await getDoc(docRef);
    return processMovementDoc(savedDoc);
};