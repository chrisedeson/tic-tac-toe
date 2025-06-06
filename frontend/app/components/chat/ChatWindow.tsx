// frontend/app/components/chat/ChatWindow.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Message, User } from '../../types';
import { EVENTS } from '../../../../backend/src/socket/events'; // Adjust path

interface ChatWindowProps {
  onClose: () => void;
  currentUser: User | null;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ onClose, currentUser }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { socket } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    
    const handleMessage = (message: Message) => {
        setMessages(prev => [...prev, message]);
    };

    socket.on(EVENTS.CHAT_MESSAGE_RECEIVE, handleMessage);
    // Add private message handler later
    
    return () => {
      socket.off(EVENTS.CHAT_MESSAGE_RECEIVE, handleMessage);
    };
  }, [socket]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && socket) {
      socket.emit(EVENTS.CHAT_MESSAGE_SEND, newMessage.trim());
      setNewMessage('');
    }
  };

  return (
    <div className="fixed bottom-24 right-6 w-80 h-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col z-20 border dark:border-gray-700">
      <header className="p-3 border-b dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-bold">Community Chat</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
          <X size={20} />
        </button>
      </header>
      <main className="flex-grow p-3 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser?.id ? 'items-end' : 'items-start'}`}>
            <div className={`px-3 py-2 rounded-lg max-w-[80%] ${
                msg.senderId === currentUser?.id
                ? 'bg-blue-500 text-white rounded-br-none'
                : 'bg-gray-200 dark:bg-gray-700 rounded-bl-none'
            }`}>
              <span className="text-xs font-bold block">{msg.senderUsername}</span>
              <p className="text-sm">{msg.text}</p>
            </div>
            <span className="text-xs text-gray-500 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </main>
      <footer className="p-2 border-t dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow px-3 py-2 rounded-md border-none dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button type="submit" className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            <Send size={20} />
          </button>
        </form>
      </footer>
    </div>
  );
};
export default ChatWindow;