
import { create } from 'zustand';
import { Quote, SalesOrder, DeliveryOrder, DocumentStatus } from '@/types';
import { getQuotes, saveQuote, deleteQuote, updateQuoteStatus } from '@/components/sales/QuoteList';
import { getSalesOrders, createSalesOrderFromQuote, deleteSalesOrder } from '@/components/sales/SalesOrderList';
import { getDeliveryOrders, createDeliveryOrder, deleteDeliveryOrder } from '@/components/sales/DeliveryOrderList';

interface SalesState {
  quotes: Quote[];
  salesOrders: SalesOrder[];
  deliveryOrders: DeliveryOrder[];
  loading: boolean;
  error: string | null;
  fetchQuotes: () => Promise<void>;
  fetchSalesOrders: () => Promise<void>;
  fetchDeliveryOrders: () => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  updateQuoteStatus: (id: string, status: DocumentStatus) => Promise<void>;
  deleteSalesOrder: (id: string) => Promise<void>;
  createSalesOrderFromQuote: (quote: Quote, clientPoNumber: string) => Promise<void>;
  deleteDeliveryOrder: (id: string) => Promise<void>;
  createDeliveryOrder: (salesOrderId: string, deliveryItems: any[], shippingAddress: any, contactId: string, contactName: string, contactPhone: string, contactEmail: string, vehicleNumber?: string, additionalDescription?: string) => Promise<void>;
  saveQuote: (quote: Omit<Quote, 'status' | 'quoteNumber'> & { id?: string }) => Promise<void>;
}

export const useSalesStore = create<SalesState>((set) => ({
  quotes: [],
  salesOrders: [],
  deliveryOrders: [],
  loading: false,
  error: null,

  fetchQuotes: async () => {
    set({ loading: true, error: null });
    try {
      const quotes = await getQuotes();
      set({ quotes, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch quotes', loading: false });
    }
  },

  fetchSalesOrders: async () => {
    set({ loading: true, error: null });
    try {
      const salesOrders = await getSalesOrders();
      set({ salesOrders, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch sales orders', loading: false });
    }
  },

  fetchDeliveryOrders: async () => {
    set({ loading: true, error: null });
    try {
      const deliveryOrders = await getDeliveryOrders();
      set({ deliveryOrders, loading: false });
    } catch (error) {
      set({ error: 'Failed to fetch delivery orders', loading: false });
    }
  },

  deleteQuote: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await deleteQuote(id);
      set((state) => ({ quotes: state.quotes.filter((q) => q.id !== id), loading: false }));
    } catch (error) {
      set({ error: 'Failed to delete quote', loading: false });
    }
  },

  updateQuoteStatus: async (id: string, status: DocumentStatus) => {
    set({ loading: true, error: null });
    try {
      await updateQuoteStatus(id, status);
      set((state) => ({
        quotes: state.quotes.map((q) => (q.id === id ? { ...q, status } : q)),
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to update quote status', loading: false });
    }
  },

  deleteSalesOrder: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await deleteSalesOrder(id);
      set((state) => ({ salesOrders: state.salesOrders.filter((o) => o.id !== id), loading: false }));
    } catch (error) {
      set({ error: 'Failed to delete sales order', loading: false });
    }
  },

  createSalesOrderFromQuote: async (quote: Quote, clientPoNumber: string) => {
    set({ loading: true, error: null });
    try {
      const newSalesOrder = await createSalesOrderFromQuote(quote, clientPoNumber);
      set((state) => ({ salesOrders: [...state.salesOrders, newSalesOrder], loading: false }));
    } catch (error) {
      set({ error: 'Failed to create sales order', loading: false });
    }
  },

  deleteDeliveryOrder: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await deleteDeliveryOrder(id);
      set((state) => ({ deliveryOrders: state.deliveryOrders.filter((o) => o.id !== id), loading: false }));
    } catch (error) {
      set({ error: 'Failed to delete delivery order', loading: false });
    }
  },

  createDeliveryOrder: async (salesOrderId, deliveryItems, shippingAddress, contactId, contactName, contactPhone, contactEmail, vehicleNumber, additionalDescription) => {
    set({ loading: true, error: null });
    try {
      const newDeliveryOrder = await createDeliveryOrder(salesOrderId, deliveryItems, shippingAddress, contactId, contactName, contactPhone, contactEmail, vehicleNumber, additionalDescription);
      set((state) => ({ deliveryOrders: [...state.deliveryOrders, newDeliveryOrder], loading: false }));
    } catch (error) {
      set({ error: 'Failed to create delivery order', loading: false });
    }
  },

  saveQuote: async (quote) => {
    set({ loading: true, error: null });
    try {
      const savedQuote = await saveQuote(quote);
      set((state) => ({
        quotes: state.quotes.find((q) => q.id === savedQuote.id)
          ? state.quotes.map((q) => (q.id === savedQuote.id ? savedQuote : q))
          : [...state.quotes, savedQuote],
        loading: false,
      }));
    } catch (error) {
      set({ error: 'Failed to save quote', loading: false });
    }
  },
}));
