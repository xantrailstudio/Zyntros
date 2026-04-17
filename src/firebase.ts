import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// If database ID is '(default)', passing it explicitly can sometimes cause issues in specific environments.
// Calling without it defaults to the primary database.
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

// Test Firestore connection
async function testConnection() {
  try {
    // Only try to reach server if we have an app
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
  } catch (error: any) {
    if (error?.message?.includes('the client is offline') || error?.message?.includes('not found')) {
      console.error("Firebase Configuration Error: Could not reach Firestore database. Please verify your project has Firestore enabled and the database ID is correct.", error);
    }
  }
}

testConnection();
