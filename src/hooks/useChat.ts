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
      console.error('Firestore Chats Error:', error);
    });

    return () => unsubscribe();
  }, [userId]);

  // Sync Messages
  useEffect(() => {
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
    if (!userId || userId === 'guest') return;
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
      
      if (userId !== 'guest') {
        await setDoc(doc(db, 'chats', id), newChat);
      } else {
        // Guests only get one transient chat for now
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
    try {
      // 1. Save user message
      if (userId !== 'guest') {
        await setDoc(doc(db, 'chats', currentChatId, 'messages', userMsgId), userMessage);
      } else {
        setMessages(prev => [...prev, userMessage]);
      }
      
      // 2. Update chat timestamp and title (if needed)
      if (userId !== 'guest') {
        const chatRef = doc(db, 'chats', currentChatId);
        const updates: any = { updatedAt: Date.now() };
        // We only auto-set title on the very first message if it was "New Chat"
        const existingChat = chats.find(c => c.id === currentChatId);
        if (existingChat && existingChat.title === 'New Chat') {
          updates.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
        }
        await updateDoc(chatRef, updates);
      }

      // 3. Build context from memories and history
      const memoryContext = memories.map(m => m.content).join('\n');
      const historyContext = messages.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      
      const isGuest = userId === 'guest';
      const systemPrompt = `You are Zyntros, a highly intelligent AI assistant created by AbdulAziz Memon. You have a persistent memory system.
      
      USER MEMORIES (Key facts you know about the user):
      ${memoryContext || 'No specific memories yet.'}
      
      RECENT CONVERSATION HISTORY (Old search/chat history):
      ${historyContext || 'No previous history in this session.'}
      
      IMAGE GENERATION:
      ${isGuest ? '- IMAGE GENERATION IS DISABLED. If the user asks for an image, politely explain that they need to sign in to use this feature.' : `
      - You can generate images by using the following markdown format: ![Image](/api/generate-image?prompt=DESCRIPTION&seed=SEED&width=1024&height=1024&model=flux)
      - Replace DESCRIPTION with a detailed, descriptive prompt for the image (use %20 for spaces).
      - Replace SEED with a random number for variety.
      - When a user asks for an image, provide the markdown and a brief description.`}
      
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
        await setDoc(doc(db, 'chats', currentChatId, 'messages', assistantMsgId), assistantMessage);
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

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const renameChat = async (chatId: string, newTitle: string) => {
    if (!userId || userId === 'guest') return;
    await updateDoc(doc(db, 'chats', chatId), { title: newTitle });
  };

  const deleteMemory = async (id: string) => {
    if (!userId || userId === 'guest') return;
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
    renameChat,
    sendMessage,
    addMemory,
    deleteMemory,
  };
}
