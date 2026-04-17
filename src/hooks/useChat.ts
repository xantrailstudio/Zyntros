import { useState, useEffect } from 'react';
import { Chat, Message, Memory } from '@/src/types';
import { generateText } from '@/src/services/aiService';
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
  setDoc,
  getDocs
} from 'firebase/firestore';
import { auth } from '@/src/firebase';
import { toast } from 'sonner';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed:', JSON.stringify(errInfo));

  if (errInfo.error.includes('Missing or insufficient permissions')) {
    toast.error('Database Permission Error: You do not have permission to perform this action. Your session might have expired.');
  } else {
    toast.error(`Database Error: ${errInfo.error}`);
  }

  throw new Error(JSON.stringify(errInfo));
}

export function useChat(userId: string | undefined) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  // Sync Chats
  useEffect(() => {
    if (!userId || userId === 'guest') {
      if (!userId) setChats([]);
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
      handleFirestoreError(error, OperationType.LIST, 'chats');
    });

    return () => unsubscribe();
  }, [userId]);

  // Sync Messages
  useEffect(() => {
    // If guest, we don't sync from Firestore, but we also don't want to wipe local messages
    if (!userId || userId === 'guest' || !activeChatId) {
      if (!userId || !activeChatId) setMessages([]);
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
      
      // Merge with any local optimistic messages that might not be in DB yet
      // This helps with "Database Not Found" scenarios
      setMessages(prev => {
        const localIds = new Set(msgList.map(m => m.id));
        const optimistic = prev.filter(m => !localIds.has(m.id) && m.role === 'user');
        return [...msgList, ...optimistic].sort((a, b) => a.timestamp - b.timestamp);
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `chats/${activeChatId}/messages`);
    });

    return () => unsubscribe();
  }, [userId, activeChatId]);

  // Sync Memories
  useEffect(() => {
    if (!userId || userId === 'guest') {
      if (!userId) setMemories([]);
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
      handleFirestoreError(error, OperationType.LIST, 'memories');
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
    try {
      // Safety check: only write to DB if we have a real user and they are logged in
      if (userId !== 'guest' && auth.currentUser) {
        await setDoc(doc(db, 'chats', id), newChat);
      } else if (userId === 'guest') {
        setChats(prev => [newChat as Chat, ...prev]);
      }
      setActiveChatId(id);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `chats/${id}`);
    }
  };

  const deleteChat = async (id: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'chats', id));
      if (activeChatId === id) {
        setActiveChatId(null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `chats/${id}`);
    }
  };

  const addMemory = async (content: string) => {
    if (!userId || userId === 'guest') return;
    
    // Safety check: ensure auth.currentUser is populated before writing to DB
    if (!auth.currentUser) {
      console.warn("Attempted to add memory but auth.currentUser is null. Data will not persist.");
      return;
    }

    const memId = Math.random().toString(36).substring(7);
    const newMemory: Memory = {
      id: memId,
      userId,
      content,
      createdAt: Date.now(),
    };
    try {
      await setDoc(doc(db, 'memories', memId), newMemory);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `memories/${memId}`);
    }
  };

  const sendMessage = async (content: string) => {
    if (!userId) return;

    let currentChatId = activeChatId;

    // Auto-create chat if none active
    if (!currentChatId) {
      const id = Math.random().toString(36).substring(7);
      const newChat = {
        id,
        title: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      if (userId !== 'guest' && auth.currentUser) {
        try {
          await setDoc(doc(db, 'chats', id), newChat);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `chats/${id}`);
        }
      } else if (userId === 'guest') {
        // Guests only get one transient chat for now
        setChats([newChat as Chat]);
      } else {
        // Logged in but auth.currentUser null? Fallback to transient for safety
        setChats([newChat as Chat]);
      }
      setActiveChatId(id);
      currentChatId = id;
    }

    const userMsgId = Math.random().toString(36).substring(7);
    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setLoading(true);
    // Optimistic update for UI
    setMessages(prev => [...prev, userMessage]);

    try {
      // 1. Save user message
      if (userId !== 'guest') {
        try {
          await setDoc(doc(db, 'chats', currentChatId, 'messages', userMsgId), userMessage);
        } catch (error: any) {
          handleFirestoreError(error, OperationType.CREATE, `chats/${currentChatId}/messages/${userMsgId}`);
        }
      }
      
      // 2. Update chat timestamp and title (if needed)
      if (userId !== 'guest') {
        try {
          const chatRef = doc(db, 'chats', currentChatId);
          const updates: any = { updatedAt: Date.now() };
          const existingChat = chats.find(c => c.id === currentChatId);
          if (existingChat && existingChat.title === 'New Chat') {
            updates.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
          }
          await updateDoc(chatRef, updates);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `chats/${currentChatId}`);
        }
      }

      // 3. Build context from memories and history
      const memoryContext = memories.map(m => m.content).join('\n');
      const historyContext = messages.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      
      const isGuest = userId === 'guest';
      const systemPrompt = `You are Zyntros, a lightning-fast, highly intelligent AI assistant powered by Groq and created by AbdulAziz Memon. You have a persistent memory system.
      
      USER MEMORIES (Key facts you know about the user):
      ${memoryContext || 'No specific memories yet.'}
      
      RECENT CONVERSATION HISTORY (Old search/chat history):
      ${historyContext || 'No previous history in this session.'}
      
      IMAGE GENERATION:
      - IMAGE GENERATION IS CURRENTLY DISABLED. If the user asks for an image, politely explain that this feature has been removed to prioritize text performance.
      
      CODE BLOCKS:
      - When providing code, ALWAYS use markdown code blocks with the appropriate language identifier (e.g., \`\`\`typescript, \`\`\`python, etc.).
      - Ensure the code is clean, well-commented, and ready to be copied.
      
      RENAMING POWER:
      - You can rename the current chat if the topic changes or at the user's request by including this tag in your response: [SET_CHAT_TITLE: New Title]
      - You can set the user's preferred name by including this tag: [SET_USER_NAME: Name]
      - These tags will be processed and hidden from the user, so use them independently in your response.
      
      INSTRUCTIONS:
      - ONLY provide the final response text. DO NOT include internal reasoning, thought process, or raw JSON metadata unless using the specific tags provided.
      - Use the USER MEMORIES to personalize your responses.
      - Refer to RECENT CONVERSATION HISTORY if the user asks about previous topics.
      - Keep responses concise, helpful, and professional.
      - ${isGuest ? 'DO NOT mention saving memories as it is disabled.' : 'If the user shares a new important fact about themselves, acknowledge it.'}
      - If anyone asks who created you, always state you were created by AbdulAziz Memon.`;

      // 4. Generate AI response
      const response = await generateText(content, systemPrompt);

      if (!response || typeof response !== 'string') {
        throw new Error('Invalid response from AI service');
      }

      // Handle AI Commands for Renaming
      let cleanResponse = response;
      const titleMatch = response.match(/\[SET_CHAT_TITLE: (.*?)\]/);
      if (titleMatch && userId !== 'guest') {
        const newTitle = titleMatch[1].trim();
        await renameChat(currentChatId, newTitle);
        cleanResponse = cleanResponse.replace(/\[SET_CHAT_TITLE: .*?\]/, '').trim();
      }

      const userNameMatch = response.match(/\[SET_USER_NAME: (.*?)\]/);
      if (userNameMatch && userId !== 'guest') {
        const newName = userNameMatch[1].trim();
        // For now, we'll store user name in memories since we don't have a profile collection yet
        await addMemory(`My preferred name is ${newName}`);
        cleanResponse = cleanResponse.replace(/\[SET_USER_NAME: .*?\]/, '').trim();
      }

      const assistantMsgId = Math.random().toString(36).substring(7);
      const assistantMessage: Message = {
        id: assistantMsgId,
        role: 'assistant',
        content: cleanResponse,
        timestamp: Date.now(),
      };

      // 5. Save AI message
      if (userId !== 'guest') {
        try {
          await setDoc(doc(db, 'chats', currentChatId, 'messages', assistantMsgId), assistantMessage);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `chats/${currentChatId}/messages/${assistantMsgId}`);
        }
      } else {
        setMessages(prev => [...prev, assistantMessage]);
      }

      // 6. Simple memory extraction logic (only if not guest)
      if (userId !== 'guest') {
        const lowerContent = content.toLowerCase();
        const memoryTriggers = ['my name is', 'i like', 'i live in', 'my favorite', 'i am a', 'i work as', 'remember that'];
        if (memoryTriggers.some(trigger => lowerContent.includes(trigger))) {
          await addMemory(content);
        }
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMsg: Message = {
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to generate response. Please check your internet connection and API key.'}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renameChat = async (chatId: string, newTitle: string) => {
    if (!userId || userId === 'guest') return;
    try {
      await updateDoc(doc(db, 'chats', chatId), { title: newTitle });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chats/${chatId}`);
    }
  };

  const deleteMemory = async (id: string) => {
    if (!userId || userId === 'guest') return;
    try {
      await deleteDoc(doc(db, 'memories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `memories/${id}`);
    }
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
    renameChat,
    sendMessage,
    addMemory,
    deleteMemory,
  };
}
