import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: "AIzaSyBHUdmLt1sF7vv4bmyc_-Mh8RWbyTUwXRg",
  authDomain: "gestor-home.firebaseapp.com",
  projectId: "gestor-home",
  storageBucket: "gestor-home.firebasestorage.app",
  messagingSenderId: "617778457911",
  appId: "1:617778457911:web:060aaf1dd75f1df577feb2",
  measurementId: "G-6XBVB0K8TJ"
};

export const VAPID_KEY = 'BHFPHCc8rGnIre8XMsXYJH_4JMOpnPqqklX_QD2PP97HsgsMsLN4qXzE7v1U3MZm-lSvx6cFfXgXESTV54amfyc';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get messaging instance (only if browser supports it)
export function getMessagingInstance() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  
  try {
    return getMessaging(app);
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
    return null;
  }
}
