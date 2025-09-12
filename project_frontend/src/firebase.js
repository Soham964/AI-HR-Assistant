// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Fallback values in case environment variables are not set
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA9wtbXho-BlJmVGTr4CmLwg32sbOtqryk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hr-manager-e1bf6.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hr-manager-e1bf6",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hr-manager-e1bf6.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "959531520879",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:959531520879:web:01d0c79e161bf6ca29ce9a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WB5NN43KWS"
};

// Log configuration status
console.log('Firebase configuration status:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasAuthDomain: !!firebaseConfig.authDomain,
  hasProjectId: !!firebaseConfig.projectId,
  hasStorageBucket: !!firebaseConfig.storageBucket,
  hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
  hasAppId: !!firebaseConfig.appId,
  hasMeasurementId: !!firebaseConfig.measurementId
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);