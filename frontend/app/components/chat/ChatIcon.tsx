// frontend/app/components/chat/ChatIcon.tsx
import React from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "../ui/Button";

interface ChatIconProps {
  onClick: () => void;
  // Can add notification count badge later
}

const ChatIcon: React.FC<ChatIconProps> = ({ onClick }) => {
  return (
    <Button
      onClick={onClick}
      variant="default"
      size="icon"
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-30"
    >
      <MessageSquare className="h-6 w-6" />
    </Button>
  );
};
export default ChatIcon;
