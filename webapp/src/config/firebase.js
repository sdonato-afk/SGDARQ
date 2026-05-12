import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyAcyZAEyl1cd2vpIIWhEngQGyXaEQJjpS0",
  authDomain: "sg-darq.firebaseapp.com",
  projectId: "sg-darq",
  storageBucket: "sg-darq.firebasestorage.app",
  messagingSenderId: "174284213826",
  appId: "1:174284213826:web:f389bf6ed3c19a1fabe7db"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const appId = 'sg-darq';
export const MAIN_COL = (colName) => ['artifacts', appId, 'public', 'data', colName];
