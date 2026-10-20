import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);
const app = firebaseConfigured ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
let authInstance: ReturnType<typeof getAuth> | null = null;
if (app) {
  if (Platform.OS === "web") {
    authInstance = getAuth(app);
  } else {
    try {
      authInstance = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    } catch {
      authInstance = getAuth(app);
    }
  }
}
export const auth = authInstance;
export const db = app ? getFirestore(app) : null;
