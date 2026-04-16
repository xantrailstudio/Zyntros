import { useState } from 'react';
import { Brain, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Memory } from '@/src/types';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

interface MemoryPanelProps {
  memories: Memory[];
  onAddMemory: (content: string) => void;
  onDeleteMemory: (id: string) => void;
  onClose: () => void;
}

export function MemoryPanel({ memories, onAddMemory, onDeleteMemory, onClose }: MemoryPanelProps) {
  const [newMemory, setNewMemory] = useState('');

  const handleAdd = () => {
    if (newMemory.trim()) {
      onAddMemory(newMemory.trim());
      setNewMemory('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-l w-80">
      <div className="p-4 border-b flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2 font-semibold">
          <Brain className="w-5 h-5 text-primary" />
          <span>Memory Bank</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="p-4 border-b bg-muted/10">
        <div className="flex flex-col gap-2">
          <textarea
            placeholder="Add a manual memory..."
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
            className="w-full text-xs p-2 rounded-md border bg-background resize-none h-20 focus:ring-1 focus:ring-primary outline-none"
          />
          <Button size="sm" onClick={handleAdd} disabled={!newMemory.trim()} className="w-full text-[10px] h-8">
            Add to Memory
          </Button>
        </div>
      </div>

      <div className="p-4 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
        Stored Memories
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {memories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No memories yet.</p>
              <p className="text-[10px]">Chat with the AI to build its memory.</p>
            </div>
          ) : (
            memories.map((memory) => (
              <Card key={memory.id} className="group relative overflow-hidden border-none bg-muted/30 hover:bg-muted/50 transition-colors">
                <CardContent className="p-3">
                  <p className="text-sm leading-relaxed">{memory.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {format(memory.createdAt, 'MMM d, yyyy')}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onDeleteMemory(memory.id)}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
