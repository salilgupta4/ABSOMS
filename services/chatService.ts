import { ChatMessage, ActiveUser } from '../types';
import { db, serverTimestamp } from '@/services/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc } from 'firebase/firestore';

// Active User logic remains client-side as it's simpler and doesn't require DB writes on every mouse move.
const ACTIVE_USERS_KEY = 'erp_active_users';
const ACTIVITY_TIMEOUT_MS = 60 * 1000; // 1 minute

// --- Messages ---

export const onMessagesUpdate = (callback: (messages: ChatMessage[]) => void) => {
    const q = query(collection(db, "chat_messages"), orderBy("timestamp", "asc"), limit(100));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messages: ChatMessage[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            messages.push({
                id: doc.id,
                userId: data.userId,
                userName: data.userName,
                text: data.text,
                timestamp: data.timestamp?.toDate().toISOString() || new Date().toISOString()
            });
        });
        callback(messages);
    });
    
    return unsubscribe;
};


export const addMessage = async (userId: string, userName: string, text: string): Promise<void> => {
    await addDoc(collection(db, "chat_messages"), {
        userId,
        userName,
        text,
        timestamp: serverTimestamp()
    });
};


// --- Active Users ---

export const updateUserActivity = (userId: string, userName: string): void => {
    try {
        const stored = localStorage.getItem(ACTIVE_USERS_KEY);
        let activeUsers: ActiveUser[] = stored ? JSON.parse(stored) : [];
        
        const now = new Date().toISOString();
        const existingUserIndex = activeUsers.findIndex(u => u.userId === userId);

        if (existingUserIndex > -1) {
            activeUsers[existingUserIndex].lastActive = now;
            activeUsers[existingUserIndex].userName = userName; // Update username in case it changed
        } else {
            activeUsers.push({ userId, userName, lastActive: now });
        }
        
        localStorage.setItem(ACTIVE_USERS_KEY, JSON.stringify(activeUsers));

    } catch (error) {
        console.error("Failed to update user activity", error);
    }
};

export const getActiveUsers = (): ActiveUser[] => {
    try {
        const stored = localStorage.getItem(ACTIVE_USERS_KEY);
        if (!stored) return [];

        let activeUsers: ActiveUser[] = JSON.parse(stored);
        const now = Date.now();
        
        // Filter out users who haven't been active recently
        const recentUsers = activeUsers.filter(user => {
            const lastActiveTime = new Date(user.lastActive).getTime();
            return (now - lastActiveTime) < ACTIVITY_TIMEOUT_MS;
        });

        // If the list changed, update storage to prune old users
        if (recentUsers.length !== activeUsers.length) {
            localStorage.setItem(ACTIVE_USERS_KEY, JSON.stringify(recentUsers));
        }

        return recentUsers;
    } catch {
        return [];
    }
};
