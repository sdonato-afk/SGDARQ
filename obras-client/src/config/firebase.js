import { initializeApp } from 'firebase/app';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
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
  localCache: memoryLocalCache()
});
export const storage = getStorage(app);

// Ruta base del sistema principal (READ-ONLY desde este módulo)
export const MAIN_PATH = ['artifacts', 'sg-darq', 'public', 'data'];

// Colecciones propias del módulo de seguimiento
export const OBRAS_COL = 'obras_seguimiento'; // config doc por obraId
