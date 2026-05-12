import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAcyZAEyl1cd2vpIIWhEngQGyXaEQJjpS0",
  authDomain: "sg-darq.firebaseapp.com",
  projectId: "sg-darq",
  storageBucket: "sg-darq.firebasestorage.app",
  messagingSenderId: "174284213826",
  appId: "1:174284213826:web:f389bf6ed3c19a1fabe7db"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// Ruta base del sistema principal (READ para auto-generación)
export const APP_ID   = 'sg-darq';
export const MAIN_COL = (col) => ['artifacts', APP_ID, 'public', 'data', col];

// Colecciones propias de este módulo
export const AGENDA_COL   = ['artifacts', APP_ID, 'public', 'data', 'agenda_items'];
export const EVENTOS_COL  = ['artifacts', APP_ID, 'public', 'data', 'eventos'];
export const USUARIOS_COL = ['artifacts', APP_ID, 'public', 'data', 'usuarios_agenda'];
