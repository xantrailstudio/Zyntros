export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Chat {
  id: string;
  title: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Memory {
  id: string;
  userId: string;
  content: string;
  category?: string;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}
