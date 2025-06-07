// frontend/app/components/chat/ChatWindow.tsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Send } from 'lucide-react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import type { Message, OnlineUser } from '../../types';
import { EVENTS } from '../../../../backend/src/socket/events'; // Adjust if necessary
import type { ChatWindowProps } from '../../types';

const ChatWindow: React.FC<ChatWindowProps> = ({
  onClose,
  onlineUsersForChat,
  onChallengePlayer,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
  const [privateChatTarget, setPrivateChatTarget] = useState<OnlineUser | null>(null);
  const { socket } = useSocket();
  const { user } = useAuth();
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
    socket.on(EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE, handleMessage);

    return () => {
      socket.off(EVENTS.CHAT_MESSAGE_RECEIVE, handleMessage);
      socket.off(EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE, handleMessage);
    };
  }, [socket]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || !socket || !user) return;

    if (activeTab === 'public') {
      socket.emit(EVENTS.CHAT_MESSAGE_SEND, trimmed);
    } else if (privateChatTarget) {
      socket.emit(EVENTS.CHAT_PRIVATE_MESSAGE_SEND, {
        toUserId: privateChatTarget.userId,
        messageText: trimmed,
      });
    }

    setNewMessage('');
  };

  const filteredMessages = messages.filter(msg => {
    if (activeTab === 'public') {
      return msg.channel === 'community';
    }
    if (activeTab === 'private' && privateChatTarget && user) {
      const isMyMessageToTarget =
        msg.senderId === user.userID && msg.recipientId === privateChatTarget.userId;
      const isTargetMessageToMe =
        msg.senderId === privateChatTarget.userId && msg.recipientId === user.userID;
      return isMyMessageToTarget || isTargetMessageToMe;
    }
    return false;
  });

  return (
    <div className="fixed bottom-24 right-6 w-80 h-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col z-20 border dark:border-gray-700">
      <header className="p-3 border-b dark:border-gray-700 flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('public')}
            className={`px-3 py-1 text-sm rounded-full ${
              activeTab === 'public' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            Public
          </button>
          <button
            onClick={() => setActiveTab('private')}
            className={`px-3 py-1 text-sm rounded-full ${
              activeTab === 'private' ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            Private
          </button>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-100">
          <X size={20} />
        </button>
      </header>

      {activeTab === 'private' && (
        <div className="p-2 border-b dark:border-gray-600">
          <select
            onChange={(e) =>
              setPrivateChatTarget(
                onlineUsersForChat.find((u) => u.userId === e.target.value) || null
              )
            }
            className="w-full p-1 rounded dark:bg-gray-700 text-sm"
          >
            <option value="">Chat with...</option>
            {onlineUsersForChat.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.username}
              </option>
            ))}
          </select>
        </div>
      )}

      <main className="flex-grow p-3 overflow-y-auto space-y-4">
        {filteredMessages.map((msg, index) => (
          <div
            key={`${msg.senderId}-${msg.recipientId || 'public'}-${index}`}
            className={`flex flex-col ${msg.senderId === user?.userID ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`px-3 py-2 rounded-lg max-w-[80%] ${
                msg.senderId === user?.userID
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-200 dark:bg-gray-700 rounded-bl-none'
              }`}
            >
              <span className="text-xs font-bold block opacity-70">{msg.senderUsername}</span>
              <p className="text-sm">{msg.text}</p>
            </div>
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
            placeholder={
              activeTab === 'private' && !privateChatTarget
                ? 'Select a user to chat'
                : 'Type a message...'
            }
            disabled={activeTab === 'private' && !privateChatTarget}
            className="flex-grow px-3 py-2 rounded-md border-none dark:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={
              !newMessage.trim() || (activeTab === 'private' && !privateChatTarget)
            }
            className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-500"
          >
            <Send size={20} />
          </button>
        </form>
      </footer>
    </div>
  );
};

export default ChatWindow;
