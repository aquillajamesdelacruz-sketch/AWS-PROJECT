// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import {
  getDatabase,
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue
} from "firebase/database";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBAiOfN5ysNvseuouRYdUW-tgINk-hi6dA",
  authDomain: "akirafirebase.firebaseapp.com",
  databaseURL: "https://akirafirebase-default-rtdb.firebaseio.com",
  projectId: "akirafirebase",
  storageBucket: "akirafirebase.firebasestorage.app",
  messagingSenderId: "865395224316",
  appId: "1:865395224316:web:9bbb3358ce07e923dfb179",
  measurementId: "G-7M4ENYFW16"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getDatabase(app);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export const register = async (email, password, username, contactNumber) => {
  const response = await createUserWithEmailAndPassword(auth, email, password);

  //this gets the users id 
  const user = response.user;

  //save the other infos in the real time database
  await set(ref(db, "users/" + user.uid), {
    uid: user.uid,
    username: username,
    email: email,
    contactNumber: contactNumber,
    createdAt: new Date().toISOString()
  });

  return response;
};

export const login = async (email, password) => {
  const response = await signInWithEmailAndPassword(auth, email, password);
  return response;
};

export const googleSignIn = async () => {
  const response = await signInWithPopup(auth, provider);
  return response;
};

export const logout = async () => {
  const response = await signOut(auth);
  return response;
};

// Update user profile
export const updateUser = async (uid, username, contactNumber) => {
  await update(ref(db, "users/" + uid), {
    username,
    contactNumber
  });
};

// Delete user
export const deleteUser = async (uid) => {
  await remove(ref(db, "users/" + uid));
};

// ========================================================================================= Database functions

// add item
export const addItem = async (userId, item) => {

  const newItemRef = push(ref(db, `users/${userId}/items`)); 

  const newItem = {
    ...item,
    id: newItemRef.key,
    createdAt: Date.now()
  };
  await set(newItemRef, newItem);
  return newItemRef.key;
}

// reed 
// DISPLAY ITEMS FROM FIREBASE
export const getItems = (uid, callback) => {

  const itemsRef = ref(db, "users/" + uid + "/items");

  const unsubscribe = onValue(itemsRef, (snapshot) => {

    const data = snapshot.val() || {};

    const items = Object.values(data);

    callback(items);

  });

  return unsubscribe;
};

//update 
export const updateItem = async (userId, itemId, updatedData) => {

  const itemRef = ref(db, `users/${userId}/items/${itemId}`);
  
  await update(itemRef, updatedData);
}

// Begone
export const deleteItem = async (uid, itemId) => {

  const itemRef = ref(db, "users/" + uid + "/items/" + itemId);

  await remove(itemRef);

};


// Listen for item changes in real time
export const listenItems = (uid, callback) => getItems(uid, callback);
