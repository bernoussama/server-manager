import React from 'react';
import { Button } from '../ui/button';
import { MessageSquare } from 'lucide-react';

interface ChatButtonProps {
  onClick: () => void;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ onClick }) => {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-8 right-8 rounded-full w-16 h-16 shadow-lg"
    >
      <MessageSquare className="h-8 w-8" />
    </Button>
  );
};
