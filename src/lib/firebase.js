import { memberships } from "./memberships.js";
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
  onAuthStateChanged,
  updatePassword,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser as deleteAuthUser,
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

let registrationPending = false;
export const register = async (email, password, username) => {
  registrationPending = true;
  try {
  const response = await createUserWithEmailAndPassword(auth, email, password);

  //this gets the users id 
  const user = response.user;

  await updateProfile(user, { displayName: username });
  //save the other infos in the real time database
  await set(ref(db, "users/" + user.uid), {
    uid: user.uid,
    username: username,
    email: email,
    createdAt: new Date().toISOString()
  });

  return response;
  } finally {
    try { await signOut(auth); } finally { registrationPending = false; }
  }
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
  // added: Realtime Database rejects `undefined`, so only send the fields that were given
  const changes = {};
  if (username !== undefined) { changes.username = username; changes.nameEdited = true; }
  if (contactNumber !== undefined) changes.contactNumber = contactNumber;
  await update(ref(db, "users/" + uid), changes);
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


// ========================================================================================= Collection functions


// CREATE: add a collection
export const addCollection = async (uid, collection) => {
  const newRef = push(ref(db, `users/${uid}/collections`));

  await set(newRef, {
    ...collection,          
    id: newRef.key,        
    createdAt: Date.now()
  });

  return newRef.key;
};

// READ: real-time listener, same shape as getItems.
export const listenCollections = (uid, callback) => {
  const collectionsRef = ref(db, `users/${uid}/collections`);

  return onValue(collectionsRef, (snapshot) => {
    const data = snapshot.val() || {};

    callback(Object.values(data).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)));
  });
};

// UPDATE: change fields of one collection.
// If the NAME changes, the items that use the old name are moved to the new one.
export const updateCollection = async (uid, collectionId, updatedData, oldName) => {
  const updates = {};

  // one update() call with several paths = all changes succeed or none do
  Object.entries(updatedData).forEach(([key, value]) => {
    updates[`users/${uid}/collections/${collectionId}/${key}`] = value;
  });

  if (oldName && updatedData.name && updatedData.name !== oldName) {
    const snap = await get(ref(db, `users/${uid}/items`));
    Object.values(snap.val() || {}).forEach((item) => {
      if (memberships(item).includes(oldName)) {
        const names = memberships(item).map(name => name === oldName ? updatedData.name : name);
        updates[`users/${uid}/items/${item.id}/collection`] = names[0] || "";
        updates[`users/${uid}/items/${item.id}/collections`] = names;
      }
    });
  }

  await update(ref(db), updates);
};

// DELETE: remove collections by id. The items inside are KEPT, only their
export const deleteCollections = async (uid, collectionIds, collectionNames = []) => {
  const updates = {};

  collectionIds.forEach((id) => {
    updates[`users/${uid}/collections/${id}`] = null;   // null = delete in a multi-path update
  });

  if (collectionNames.length) {
    const snap = await get(ref(db, `users/${uid}/items`));
    Object.values(snap.val() || {}).forEach((item) => {
      if (memberships(item).some(name => collectionNames.includes(name))) {
        const names = memberships(item).filter(name => !collectionNames.includes(name));
        updates[`users/${uid}/items/${item.id}/collection`] = names[0] || "";
        updates[`users/${uid}/items/${item.id}/collections`] = names;
      }
    });
  }

  await update(ref(db), updates);
};


// ========================================================================================= Purchase functions

// CREATE: move an item from the watchlist to purchases
export const markAsBought = async (uid, item, paid) => {
  const purchaseRef = push(ref(db, `users/${uid}/purchases`));
  const paidAmount = Number(paid) || Number(item.price) || 0;

  const purchase = {
    sourceItem: item,
    createdAt: item.createdAt || null,
    history: item.history || [],
    id: purchaseRef.key,
    itemId: item.id,
    name: item.name,
    store: item.store || "",
    image: item.image || null,
    paid: paidAmount,
    original: Number(item.original) || paidAmount,
    saved: Math.max(0, (Number(item.original) || paidAmount) - paidAmount), // how much cheaper than the original price
    boughtAt: Date.now()
  };

  await update(ref(db), {
    [`users/${uid}/purchases/${purchaseRef.key}`]: purchase,
    [`users/${uid}/items/${item.id}`]: null            // null removes it from the watchlist
  });

  return purchaseRef.key;
};

// READ: real-time listener same shape as listenItems
export const listenPurchases = (uid, callback) => {
  const purchasesRef = ref(db, `users/${uid}/purchases`);

  return onValue(purchasesRef, (snapshot) => {
    const data = snapshot.val() || {};
    callback(Object.values(data).sort((a, b) => (b.boughtAt || 0) - (a.boughtAt || 0)));
  });
};

// DELETE: remove one purchase record
export const deletePurchase = async (uid, purchaseId) => {
  await remove(ref(db, `users/${uid}/purchases/${purchaseId}`));
};


// ========================================================================================= Session, profile and settings

// Tells React when someone logs in or out
export const watchAuth = (callback) => onAuthStateChanged(auth, user => { if (!registrationPending || !user) callback(user); });

// READ the profile saved by register
export const getUserProfile = async (uid) => {
  const snap = await get(ref(db, "users/" + uid));
  return snap.exists() ? snap.val() : null;
};

// Google sign-in never calls register(), so those users have no profile yet.
export const ensureUserRecord = async (user) => {
  const profileRef = ref(db, "users/" + user.uid);
  const snap = await get(profileRef);
  if (snap.exists() && snap.val().username) {
    const saved = snap.val();
    if (user.displayName && !saved.nameEdited && saved.username !== user.displayName) {
      await update(profileRef, { username: user.displayName });
      return { ...saved, username: user.displayName };
    }
    return saved;
  }

  const profile = {
    uid: user.uid,
    username: user.displayName || "Friend",
    email: user.email || "",
    contactNumber: "",
    createdAt: new Date().toISOString()
  };
  await update(profileRef, profile);
  return profile;
};

// Settings notifications theme email things leik dat
export const saveSettings = async (uid, patch) => {
  await update(ref(db, `users/${uid}/settings`), patch);
};

export const listenSettings = (uid, callback) =>
  onValue(ref(db, `users/${uid}/settings`), (snapshot) => callback(snapshot.val() || {}));

// change password.
export const changePassword = async (currentPassword, newPassword) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Please log in again.");
  if (!user.providerData.some((p) => p.providerId === "password")) {
    // accounts created with Google have no password to change
    const error = new Error("This account signs in with Google, so there is no password to change.");
    error.code = "app/no-password";
    throw error;
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
};

// delete account
export const deleteAccount = async () => {
  const user = auth.currentUser;
  if (!user) return;
  await remove(ref(db, "users/" + user.uid));
  await deleteAuthUser(user);
};

export const registerWithGoogle = async () => {
  registrationPending = true;
  try {
    const credential = await googleSignIn();
    await ensureUserRecord(credential.user);
    return credential.user.email || "";
  } finally {
    try { await signOut(auth); } finally { registrationPending = false; }
  }
};

export const restorePurchase = async (uid, purchase) => {
 const id = purchase.itemId || push(ref(db, `users/${uid}/items`)).key;
 const existing = await get(ref(db, `users/${uid}/items/${id}`));
 if (existing.exists()) throw new Error("This item is already in your watchlist.");
 const restored = purchase.sourceItem || { name:purchase.name, price:purchase.paid, original:purchase.original, image:purchase.image || null, store:purchase.store || "", history:purchase.history || [], createdAt:purchase.createdAt || purchase.boughtAt, target:purchase.paid, alert:false };
 await update(ref(db), { [`users/${uid}/items/${id}`]:{...restored,id}, [`users/${uid}/purchases/${purchase.id}`]:null });
};
export const addCollectionMembers = async (uid, name, items) => {
 const changes = {};
 items.forEach(item => {
   changes[`users/${uid}/items/${item.id}/collections`] = [...new Set([...memberships(item),name])];
   if (!item.collection) changes[`users/${uid}/items/${item.id}/collection`] = name;
 });
 if (items.length) await update(ref(db),changes);
};
