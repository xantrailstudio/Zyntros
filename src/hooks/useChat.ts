import { useState, useEffect } from 'react';
import { Chat, Message, Memory } from '@/src/types';
import { generateText } from '@/src/services/pollinationsService';
import { db } from '@/src/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc, 
  setDoc
} from 'firebase/firestore';

export function useChat(userId: string | undefined) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync Chats
  useEffect(() => {
    if (!userId) {
      setChats([]);
      return;
    }

    const q = query(
      collection(db, 'chats'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Chat[];
      setChats(chatList);
    }, (error) => {
      console.error('Firestore Chats Error:', error);
    });

    return () => unsubscribe();
  }, [userId]);

  // Sync Messages
  useEffect(() => {
    if (!userId || !activeChatId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', activeChatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Message[];
      setMessages(msgList);
    }, (error) => {
      console.error('Firestore Messages Error:', error);
    });

    return () => unsubscribe();
  }, [userId, activeChatId]);

  // Sync Memories
  useEffect(() => {
    if (!userId) {
      setMemories([]);
      return;
    }

    const q = query(
      collection(db, 'memories'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memList = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Memory[];
      setMemories(memList);
    }, (error) => {
      console.error('Firestore Memories Error:', error);
    });

    return () => unsubscribe();
  }, [userId]);

  const createChat = async () => {
    if (!userId) return;
    const id = Math.random().toString(36).substring(7);
    const newChat = {
      id,
      title: 'New Chat',
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await setDoc(doc(db, 'chats', id), newChat);
    setActiveChatId(id);
  };

  const deleteChat = async (id: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, 'chats', id));
    if (activeChatId === id) {
      setActiveChatId(null);
    }
  };

  const addMemory = async (content: string) => {
    if (!userId) return;
    const memId = Math.random().toString(36).substring(7);
    const newMemory: Memory = {
      id: memId,
      userId,
      content,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'memories', memId), newMemory);
  };

  const sendMessage = async (content: string) => {
    if (!userId || !activeChatId) return;

    const userMsgId = Math.random().toString(36).substring(7);
    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setLoading(true);
    try {
      // 1. Save user message
      await setDoc(doc(db, 'chats', activeChatId, 'messages', userMsgId), userMessage);
      
      // 2. Update chat timestamp and title if it's the first message
      const chatRef = doc(db, 'chats', activeChatId);
      const updates: any = { updatedAt: Date.now() };
      if (messages.length === 0) {
        updates.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
      }
      await updateDoc(chatRef, updates);

      // 3. Build context from memories and history
      const memoryContext = memories.map(m => m.content).join('\n');
      const historyContext = messages.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      
      const systemPrompt = `You are Zyntros, a highly intelligent AI assistant with a persistent memory system.
      
      USER MEMORIES (Key facts you know about the user):
      ${memoryContext || 'No specific memories yet.'}
      
      RECENT CONVERSATION HISTORY (Old search/chat history):
      ${historyContext || 'No previous history in this session.'}
      
      INSTRUCTIONS:
      - Use the USER MEMORIES to personalize your responses.
      - Refer to RECENT CONVERSATION HISTORY if the user asks about previous topics.
      - Keep responses concise, helpful, and professional.
      - If the user shares a new important fact about themselves, acknowledge it.`;

      // 4. Generate AI response
      const response = await generateText(content, systemPrompt);

      const assistantMsgId = Math.random().toString(36).substring(7);
      const assistantMessage: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      // 5. Save AI message
      await setDoc(doc(db, 'chats', activeChatId, 'messages', assistantMsgId), assistantMessage);

      // 6. Simple memory extraction logic
      const lowerContent = content.toLowerCase();
      const memoryTriggers = ['my name is', 'i like', 'i live in', 'my favorite', 'i am a', 'i work as'];
      if (memoryTriggers.some(trigger => lowerContent.includes(trigger))) {
        await addMemory(content);
      }

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async (id: string) => {
    if (!userId) return;
    await deleteDoc(doc(db, 'memories', id));
  };

  return {
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
  };
}
