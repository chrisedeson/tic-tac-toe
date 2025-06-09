// frontend/app/components/chat/ChatIcon.tsx
import React from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "../ui/Button";

interface ChatIconProps {
  onClick: () => void;
  unread: boolean;
}

const ChatIcon: React.FC<ChatIconProps> = ({ onClick, unread }) => {
  return (
    <Button
      onClick={onClick}
      variant="default"
      size="icon"
      className="relative fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-30"
    >
      <MessageSquare className="h-6 w-6" />
      {unread && (
        <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500" />
      )}
    </Button>
  );
};
export default ChatIcon;
