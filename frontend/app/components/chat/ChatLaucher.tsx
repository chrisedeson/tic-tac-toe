// frontend/app/components/ChatLauncher.tsx
import React, { useState, useEffect } from "react";
import { EVENTS } from "../../../../backend/src/socket/events";
import { useSocket } from "../../contexts/SocketContext";
import ChatIcon from "../chat/ChatIcon";
import ChatWindow from "../chat/ChatWindow";
import type { OnlineUser } from "../../types";

interface ChatLauncherProps {
  onlineUsersForChat: OnlineUser[];
  onChallengePlayer: (t: OnlineUser) => void;
}

const ChatLauncher: React.FC<ChatLauncherProps> = ({
  onlineUsersForChat,
  onChallengePlayer,
}) => {
  const { socket } = useSocket();

  // 1) YOUR STATE:
  const [showChat, setShowChat] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // 2) SUBSCRIBE to any new message:
  useEffect(() => {
    if (!socket) return;
    const onNew = () => {
      if (!showChat) setHasUnread(true);
    };
    socket.on(EVENTS.CHAT_MESSAGE_RECEIVE, onNew);
    socket.on(EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE, onNew);
    return () => {
      socket.off(EVENTS.CHAT_MESSAGE_RECEIVE, onNew);
      socket.off(EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE, onNew);
    };
  }, [socket, showChat]);

  // 3) TOGGLE & CLEAR on click:
  const handleIconClick = () => {
    setShowChat((open) => !open);
    setHasUnread(false);
  };

  return (
    <>
      <ChatIcon onClick={handleIconClick} unread={hasUnread} />
      {showChat && (
        <ChatWindow
          onClose={() => setShowChat(false)}
          onlineUsersForChat={onlineUsersForChat}
          onChallengePlayer={onChallengePlayer}
        />
      )}
    </>
  );
};

export default ChatLauncher;
