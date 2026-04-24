import { Plus, MessageSquare, Trash2, Brain, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Chat } from '@/types';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onToggleMemory: () => void;
  isMemoryOpen: boolean;
}

export function ChatSidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onToggleMemory,
  isMemoryOpen,
}: ChatSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-muted/30 border-r w-64">
      <div className="p-4 border-bottom flex flex-col gap-2">
        <Button onClick={onNewChat} className="w-full justify-start gap-2" variant="default">
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
        <Button 
          onClick={onToggleMemory} 
          className={cn("w-full justify-start gap-2", isMemoryOpen && "bg-accent")} 
          variant="outline"
        >
          <Brain className="w-4 h-4" />
          Memory Bank
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                activeChatId === chat.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              )}
              onClick={() => onSelectChat(chat.id)}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate text-sm">{chat.title || 'Untitled Chat'}</span>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
