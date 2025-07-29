
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Users, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import * as chatService from '@/services/chatService';
import { ChatMessage, ActiveUser } from '@/types';

const ChatWidget: React.FC = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    
    useEffect(() => {
        if (isOpen) {
            // Set up real-time listener for messages
            const unsubscribe = chatService.onMessagesUpdate(setMessages);

            // Set up polling for active users (client-side)
            const activeUserInterval = setInterval(() => {
                setActiveUsers(chatService.getActiveUsers());
            }, 3000);

            // Initial fetch
            setActiveUsers(chatService.getActiveUsers());

            // Cleanup on component unmount or when chat is closed
            return () => {
                unsubscribe();
                clearInterval(activeUserInterval);
            };
        }
    }, [isOpen]);

    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !user) return;
        
        const textToSend = newMessage.trim();
        setNewMessage('');

        try {
            await chatService.addMessage(user.id, user.name, textToSend);
            // No need to refetch, onSnapshot will handle it
        } catch (error) {
            console.error("Failed to send message:", error);
            // Optionally, restore the input field on error
            setNewMessage(textToSend);
        }
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {isOpen ? (
                <div className="w-80 h-[500px] bg-white dark:bg-slate-800 rounded-lg shadow-2xl flex flex-col border border-slate-300 dark:border-slate-700">
                    <header className="p-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
                        <div className="flex items-center space-x-2">
                            <MessageSquare className="text-primary" size={20} />
                            <h3 className="font-semibold text-sm">Group Chat</h3>
                        </div>
                        <div className="flex items-center space-x-2">
                             <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                                <Users size={14} className="mr-1"/> {activeUsers.length} Online
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                                <X size={18} />
                            </button>
                        </div>
                    </header>
                    <div className="flex-1 p-3 overflow-y-auto space-y-4">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex flex-col ${msg.userId === user.id ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[80%] p-2 rounded-lg text-sm ${msg.userId === user.id ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                    <p>{msg.text}</p>
                                </div>
                                <div className="text-xs text-slate-400 mt-1 px-1">
                                    {msg.userName}, {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-200 dark:border-slate-700 flex items-center">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 w-full px-3 py-2 text-sm bg-slate-100 dark:bg-slate-700 border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <button type="submit" className="ml-2 p-2 rounded-full text-white bg-primary hover:bg-primary-hover transition-colors">
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center justify-center w-16 h-16 bg-primary rounded-full text-white shadow-lg hover:bg-primary-hover transition-transform hover:scale-110"
                >
                    <MessageSquare size={28} />
                </button>
            )}
        </div>
    );
};

export default ChatWidget;
