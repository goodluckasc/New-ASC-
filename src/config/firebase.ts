import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyDm679ctxWmU3wnhuZ1tGMzQ7Bei02QewE",
  authDomain: "asc-gdlk.firebaseapp.com",
  projectId: "asc-gdlk",
  storageBucket: "asc-gdlk.firebasestorage.app",
  messagingSenderId: "160992769620",
  appId: "1:160992769620:web:ad2baa7912219d6d055fc1"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export default app;
