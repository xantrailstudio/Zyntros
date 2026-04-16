import { useState, useEffect, useRef } from 'react';
import { auth } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  User
} from 'firebase/auth';
import { Auth } from '@/src/components/Auth';
import { ChatSidebar } from '@/src/components/ChatSidebar';
import { ChatMessage } from '@/src/components/ChatMessage';
import { ChatInput } from '@/src/components/ChatInput';
import { MemoryPanel } from '@/src/components/MemoryPanel';
import { useChat } from '@/src/hooks/useChat';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, LogOut, Menu, User as UserIcon, Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    chats,
    activeChatId,
    setActiveChatId,
    messages,
    memories,
    loading,
    createChat,
    deleteChat,
    sendMessage,
    deleteMemory,
  } = useChat(user?.uid);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleLogin = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
    toast.success('Welcome back!');
  };

  const handleSignup = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
    toast.success('Account created!');
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    toast.success('Logged in with Google');
  };

  const handleLogout = async () => {
    await signOut(auth);
    toast.info('Logged out');
  };

  if (!authReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Brain className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Auth 
          onLogin={handleLogin} 
          onSignup={handleSignup} 
          onGoogleLogin={handleGoogleLogin} 
        />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <ChatSidebar
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={setActiveChatId}
          onNewChat={createChat}
          onDeleteChat={deleteChat}
          onToggleMemory={() => setIsMemoryOpen(!isMemoryOpen)}
          isMemoryOpen={isMemoryOpen}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger render={
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              } />
              <SheetContent side="left" className="p-0 w-64">
                <ChatSidebar
                  chats={chats}
                  activeChatId={activeChatId}
                  onSelectChat={setActiveChatId}
                  onNewChat={createChat}
                  onDeleteChat={deleteChat}
                  onToggleMemory={() => setIsMemoryOpen(!isMemoryOpen)}
                  isMemoryOpen={isMemoryOpen}
                />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <Brain className="w-6 h-6 text-primary" />
              <span className="hidden sm:inline">Pollinations AI</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
              <UserIcon className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium truncate max-w-[120px]">
                {user.email}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="max-w-4xl mx-auto pb-20">
            {activeChatId ? (
              messages.length === 0 ? (
                <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center text-center p-8">
                  <div className="bg-primary/5 p-6 rounded-full mb-4">
                    <Brain className="w-12 h-12 text-primary/40" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">How can I help you today?</h2>
                  <p className="text-muted-foreground max-w-md">
                    Start a conversation. I'll remember key details in your Memory Bank to provide better assistance over time.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))
              )
            ) : (
              <div className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center text-center p-8">
                <Brain className="w-16 h-16 text-primary/20 mb-6" />
                <h2 className="text-3xl font-bold mb-4">Welcome to Pollinations Chat</h2>
                <Button onClick={createChat} size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  Start Your First Chat
                </Button>
              </div>
            )}
            {loading && (
              <div className="p-6 flex gap-4 bg-muted/30 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-2 w-24 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="sticky bottom-0 w-full">
          <ChatInput onSend={sendMessage} disabled={!activeChatId || loading} />
        </div>
      </div>

      {/* Memory Panel (Desktop) */}
      {isMemoryOpen && (
        <div className="hidden lg:block">
          <MemoryPanel 
            memories={memories} 
            onDeleteMemory={deleteMemory} 
            onClose={() => setIsMemoryOpen(false)} 
          />
        </div>
      )}

      {/* Memory Panel (Mobile/Tablet) */}
      <Sheet open={isMemoryOpen && window.innerWidth < 1024} onOpenChange={setIsMemoryOpen}>
        <SheetContent side="right" className="p-0 w-80">
          <MemoryPanel 
            memories={memories} 
            onDeleteMemory={deleteMemory} 
            onClose={() => setIsMemoryOpen(false)} 
          />
        </SheetContent>
      </Sheet>

      <Toaster position="top-center" />
    </div>
  );
}
