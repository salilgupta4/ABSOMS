

import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, Link } = ReactRouterDOM;
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Loader, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { StockMovement, Product } from '../../types';
import { getStockMovementsForProduct } from './inventoryService';
import { getProduct } from '../products/ProductList';

const StockHistory: React.FC = () => {
    const { productId } = useParams<{ productId: string }>();
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!productId) {
            setLoading(false);
            return;
        }

        Promise.all([
            getProduct(productId),
            getStockMovementsForProduct(productId)
        ]).then(([productData, movementsData]) => {
            setProduct(productData || null);
            setMovements(movementsData);
            setLoading(false);
        }).catch(() => setLoading(false));

    }, [productId]);

    if (loading) {
        return <Card title="Loading History..." bodyClassName="text-center p-8"><Loader className="animate-spin inline-block" /></Card>;
    }

    if (!product) {
        return <Card title="Error"><p className="p-4">Product not found. <Link to="/inventory" className="text-primary">Go back to inventory</Link>.</p></Card>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-3xl font-bold text-slate-800">Stock History: {product.name}</h3>
                <div className="flex items-center space-x-2">
                    <Button to="/inventory" variant="secondary" icon={<ArrowLeft size={16}/>}>Back to Inventory</Button>
                </div>
            </div>

            <Card bodyClassName="overflow-x-auto">
                {movements.length > 0 ? (
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Type</th>
                                <th scope="col" className="px-6 py-3 text-center">Quantity</th>
                                <th scope="col" className="px-6 py-3">Notes / Reference</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.map((m) => (
                                <tr key={m.id} className="bg-white border-b hover:bg-slate-50">
                                    <td className="px-6 py-4">{new Date(m.date).toLocaleString('en-GB')}</td>
                                    <td className="px-6 py-4">
                                        {m.type === 'in' ? (
                                            <span className="flex items-center text-green-600 font-medium">
                                                <TrendingUp size={16} className="mr-2"/> Stock In
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-red-600 font-medium">
                                                <TrendingDown size={16} className="mr-2"/> Stock Out
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center font-bold">{m.quantity}</td>
                                    <td className="px-6 py-4">{m.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="p-8 text-center text-slate-500">No stock movements recorded for this product yet.</p>
                )}
            </Card>
        </div>
    );
};

export default StockHistory;