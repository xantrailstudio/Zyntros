"use client";

import { useState, useEffect, useRef } from 'react';
import { auth } from '@/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  User
} from 'firebase/auth';
import { Auth } from '@/components/Auth';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { MemoryPanel } from '@/components/MemoryPanel';
import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Brain, LogOut, Menu, User as UserIcon, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
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
    addMemory,
    deleteMemory,
  } = useChat(user?.uid || (isGuest ? 'guest' : undefined));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        setIsGuest(false);
        setShowAuthModal(false);
      } else {
        setIsGuest(true);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Automatically create a chat for guests if none exists
  useEffect(() => {
    if (authReady && isGuest && chats.length === 0 && !activeChatId) {
      createChat();
    }
  }, [authReady, isGuest, chats.length, activeChatId]);

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
    if (user) {
      await signOut(auth);
    }
    setIsGuest(true);
    toast.info('Logged out');
  };

  if (!authReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Brain className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-4 top-4 z-10"
              onClick={() => setShowAuthModal(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            <Auth 
              onLogin={handleLogin} 
              onSignup={handleSignup} 
              onGoogleLogin={handleGoogleLogin} 
            />
          </div>
        </div>
      )}

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

      {/* Main Area */}
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
              <SheetContent side="left" className="p-0 w-64 border-r">
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
              <span className="hidden sm:inline">Zyntros</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!user ? (
              <Button 
                variant="default" 
                size="sm" 
                className="h-8 text-xs font-semibold px-4"
                onClick={() => setShowAuthModal(true)}
              >
                Sign In
              </Button>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
                  <UserIcon className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-medium truncate max-w-[120px]">
                    {user.email}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {/* Messages */}
          <div 
            className="flex-1 overflow-y-auto scroll-smooth" 
            ref={scrollRef}
          >
            <div className="max-w-4xl mx-auto pb-20 p-4">
              {isGuest && (
                <div className="m-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-[10px] text-primary font-medium text-center">
                  You are in Guest Mode. Memories are disabled. Sign in to unlock full features.
                </div>
              )}
              {activeChatId && messages.length > 0 ? (
                <>
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  {loading && (
                    <ChatMessage 
                      message={{ id: 'loading', role: 'assistant', content: '', timestamp: Date.now() }} 
                      isLoading={true} 
                    />
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6 pt-20">
                  <div className="bg-primary/5 p-8 rounded-full">
                    <Brain className="w-16 h-16 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">How can I help you today?</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Type a message below to start a new conversation. I'll remember key details in your Memory Bank.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input */}
          <div className="sticky bottom-0 w-full p-4 bg-gradient-to-t from-background via-background to-transparent">
            <div className="max-w-4xl mx-auto">
              <ChatInput onSend={sendMessage} disabled={loading} />
            </div>
          </div>
        </div>
      </div>

      {/* Memory Panel (Desktop) */}
      {isMemoryOpen && (
        <div className="hidden lg:block w-80 border-l bg-card">
          <MemoryPanel 
            memories={memories} 
            onAddMemory={addMemory}
            onDeleteMemory={deleteMemory} 
            onClose={() => setIsMemoryOpen(false)} 
          />
        </div>
      )}

      {/* Memory Panel (Mobile/Tablet) */}
      <Sheet open={isMemoryOpen && typeof window !== 'undefined' && window.innerWidth < 1024} onOpenChange={setIsMemoryOpen}>
        <SheetContent side="right" className="p-0 w-80 border-l">
          <MemoryPanel 
            memories={memories} 
            onAddMemory={addMemory}
            onDeleteMemory={deleteMemory} 
            onClose={() => setIsMemoryOpen(false)} 
          />
        </SheetContent>
      </Sheet>

      <Toaster position="top-center" />
    </div>
  );
}
