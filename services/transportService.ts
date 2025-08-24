import { db } from '@/services/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  Timestamp
} from 'firebase/firestore';
import { Transporter, TransportTransaction } from '@/types';

export const transportService = {
  async getTransporters(): Promise<Transporter[]> {
    const transportersRef = collection(db, 'transporters');
    const q = query(transportersRef, orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transporter));
  },

  async getTransporter(id: string): Promise<Transporter | null> {
    const docRef = doc(db, 'transporters', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Transporter : null;
  },

  async createTransporter(transporter: Omit<Transporter, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const transportersRef = collection(db, 'transporters');
    const docRef = doc(transportersRef);
    const now = new Date().toISOString();
    
    const transporterData: Omit<Transporter, 'id'> = {
      ...transporter,
      created_at: now,
      updated_at: now
    };

    await setDoc(docRef, transporterData);
    return docRef.id;
  },

  async updateTransporter(id: string, transporter: Partial<Omit<Transporter, 'id' | 'created_at'>>): Promise<void> {
    const docRef = doc(db, 'transporters', id);
    const updateData = {
      ...transporter,
      updated_at: new Date().toISOString()
    };
    await updateDoc(docRef, updateData);
  },

  async deleteTransporter(id: string): Promise<void> {
    const docRef = doc(db, 'transporters', id);
    await deleteDoc(docRef);
  },

  async getTransporterTransactions(transporterId: string): Promise<TransportTransaction[]> {
    const transactionsRef = collection(db, `transporters/${transporterId}/transactions`);
    const q = query(transactionsRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      // Handle legacy data that might not have status field
      return {
        id: doc.id,
        ...data,
        status: data.status || 'approved', // Default to approved for legacy data
        updated_at: data.updated_at || data.created_at || new Date().toISOString()
      } as TransportTransaction;
    });
  },

  async addTransportTransaction(transporterId: string, transaction: Omit<TransportTransaction, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<string> {
    const transactionsRef = collection(db, `transporters/${transporterId}/transactions`);
    const docRef = doc(transactionsRef);
    const now = new Date().toISOString();
    
    const transactionData: Omit<TransportTransaction, 'id'> = {
      ...transaction,
      status: transaction.type === 'payment' ? 'pending' : 'approved', // Costs are auto-approved, payments need approval
      created_at: now,
      updated_at: now
    };

    await setDoc(docRef, transactionData);
    return docRef.id;
  },

  async updateTransportTransaction(transporterId: string, transactionId: string, updates: Partial<Omit<TransportTransaction, 'id' | 'created_at'>>): Promise<void> {
    const docRef = doc(db, `transporters/${transporterId}/transactions`, transactionId);
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    await updateDoc(docRef, updateData);
  },

  async deleteTransportTransaction(transporterId: string, transactionId: string): Promise<void> {
    const docRef = doc(db, `transporters/${transporterId}/transactions`, transactionId);
    await deleteDoc(docRef);
  },

  async approveTransaction(transporterId: string, transactionId: string, approvedBy: string): Promise<void> {
    const docRef = doc(db, `transporters/${transporterId}/transactions`, transactionId);
    const now = new Date().toISOString();
    await updateDoc(docRef, {
      status: 'approved',
      approved_by: approvedBy,
      approved_at: now,
      updated_at: now
    });
  },

  async rejectTransaction(transporterId: string, transactionId: string, rejectedBy: string, reason: string): Promise<void> {
    const docRef = doc(db, `transporters/${transporterId}/transactions`, transactionId);
    const now = new Date().toISOString();
    await updateDoc(docRef, {
      status: 'rejected',
      approved_by: rejectedBy,
      approved_at: now,
      rejection_reason: reason,
      updated_at: now
    });
  },

  async getPendingPayments(): Promise<Array<{ transporter: Transporter; transaction: TransportTransaction }>> {
    const transporters = await this.getTransporters();
    const pendingPayments: Array<{ transporter: Transporter; transaction: TransportTransaction }> = [];
    
    for (const transporter of transporters) {
      const transactions = await this.getTransporterTransactions(transporter.id);
      const pending = transactions.filter(t => t.type === 'payment' && t.status === 'pending');
      
      for (const transaction of pending) {
        pendingPayments.push({ transporter, transaction });
      }
    }
    
    return pendingPayments.sort((a, b) => new Date(a.transaction.created_at).getTime() - new Date(b.transaction.created_at).getTime());
  },

  async getTransporterBalance(transporterId: string): Promise<{ totalCosts: number; totalPayments: number; balance: number }> {
    const transactions = await this.getTransporterTransactions(transporterId);
    
    // Only include approved transactions in balance calculation
    const approvedTransactions = transactions.filter(t => t.status === 'approved');
    
    const totalCosts = approvedTransactions
      .filter(t => t.type === 'cost')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalPayments = approvedTransactions
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = totalCosts - totalPayments;
    
    return { totalCosts, totalPayments, balance };
  },

  async getAllTransportersWithBalances(): Promise<Array<Transporter & { balance: number }>> {
    const transporters = await this.getTransporters();
    const transportersWithBalances = [];
    
    for (const transporter of transporters) {
      const balanceInfo = await this.getTransporterBalance(transporter.id);
      transportersWithBalances.push({
        ...transporter,
        balance: balanceInfo.balance
      });
    }
    
    return transportersWithBalances;
  }
};