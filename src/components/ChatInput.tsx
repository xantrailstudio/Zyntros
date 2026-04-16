import { useState, useRef, useEffect } from 'react';
import { SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (content.trim() && !disabled) {
      onSend(content.trim());
      setContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  return (
    <div className="p-4 border-t bg-background">
      <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-muted/50 rounded-xl p-2 border focus-within:ring-1 focus-within:ring-ring transition-all">
        <textarea
          ref={textareaRef}
          rows={1}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 px-3 text-sm max-h-48 outline-none"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!content.trim() || disabled}
          className="h-9 w-9 shrink-0 rounded-lg"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-[10px] text-center text-muted-foreground mt-2">
        Powered by Pollinations.ai • Memory system active
      </p>
    </div>
  );
}
