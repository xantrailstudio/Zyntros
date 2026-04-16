import { Message } from '@/src/types';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { User, Bot } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      "flex gap-4 p-6 transition-colors",
      isUser ? "bg-background" : "bg-muted/50"
    )}>
      <Avatar className={cn("h-8 w-8", isUser ? "bg-primary" : "bg-secondary")}>
        <AvatarFallback>
          {isUser ? <User className="h-4 w-4 text-primary-foreground" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-2 overflow-hidden">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {isUser ? 'You' : 'Pollinations AI'}
        </p>
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
