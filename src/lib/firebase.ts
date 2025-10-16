import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyBHUdmLt1sF7vv4bmyc_-Mh8RWbyTUwXRg",
  authDomain: "gestor-home.firebaseapp.com",
  projectId: "gestor-home",
  storageBucket: "gestor-home.firebasestorage.app",
  messagingSenderId: "617778457911",
  appId: "1:617778457911:web:060aaf1dd75f1df577feb2",
  measurementId: "G-6XBVB0K8TJ"
};

export const VAPID_KEY = 'BHFPHCc8rGnIre8XMsXYJH_4JMOpnPqqklX_QD2PP97HsgsMsLN4qXzE7v1U3MZm-lSvx6cFfXgXESTV54amfyc';

const app = initializeApp(firebaseConfig);

let messaging: Messaging | null = null;

// Initialize messaging only if supported
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error('Error initializing Firebase Messaging:', error);
  }
}

export { messaging, getToken, onMessage };
