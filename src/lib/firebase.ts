'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: 'studio-3329476131-fbaa8',
  appId: '1:1066446244848:web:6c8ab20fee7fb32876eb35',
  storageBucket: 'studio-3329476131-fbaa8.firebasestorage.app',
  apiKey: 'AIzaSyAv7ZUtzxeOMOHU8Egyy8eylueY892FWCI',
  authDomain: 'studio-3329476131-fbaa8.firebaseapp.com',
  messagingSenderId: '1066446244848',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
