import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Chat: React.FC<ChatProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-28 right-8 w-96 bg-card border rounded-lg shadow-lg">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            AI Assistant
            <Button variant="ghost" size="sm" onClick={onClose}>X</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 overflow-y-auto p-4 border-b">
            {/* Chat messages will go here */}
            <p>Welcome to the AI Assistant!</p>
          </div>
          <div className="p-4 flex">
            <Input placeholder="Type a message..." />
            <Button className="ml-2">Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
