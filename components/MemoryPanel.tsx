import { useState } from 'react';
import { Brain, Trash2, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Memory } from '@/types';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleAdd = () => {
    if (newMemory.trim()) {
      onAddMemory(newMemory.trim());
      setNewMemory('');
    }
  };

  const handleClearAll = () => {
    memories.forEach(m => onDeleteMemory(m.id));
    setShowConfirmClear(false);
  };

  const filteredMemories = memories.filter(memory => 
    memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (memory.category && memory.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

      <div className="p-4 border-b space-y-4 bg-muted/5">
        {showConfirmClear ? (
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20 space-y-3">
            <p className="text-[10px] font-medium text-destructive">Clear all memories? This cannot be undone.</p>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" className="flex-1 h-7 text-[10px]" onClick={handleClearAll}>Confirm</Button>
              <Button variant="outline" size="sm" className="flex-1 h-7 text-[10px]" onClick={() => setShowConfirmClear(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Search Memories</label>
                {memories.length > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 px-1.5 text-[9px] text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setShowConfirmClear(true)}
                  >
                    Clear All
                  </Button>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter by keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Add New</label>
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
          </>
        )}
      </div>

      <div className="p-4 text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex justify-between items-center">
        <span>Stored Memories</span>
        <span className="bg-muted px-1.5 py-0.5 rounded text-[9px]">{filteredMemories.length}</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredMemories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">{searchQuery ? 'No matches found.' : 'No memories yet.'}</p>
              <p className="text-[10px]">{searchQuery ? 'Try a different search term.' : 'Chat with the AI to build its memory.'}</p>
            </div>
          ) : (
            filteredMemories.map((memory) => (
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
