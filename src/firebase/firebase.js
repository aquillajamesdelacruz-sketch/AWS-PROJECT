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
  // added: Realtime Database rejects `undefined`, so only send the fields that were given
  const changes = {};
  if (username !== undefined) changes.username = username;
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
// NOTE (added): Collections follow the same pattern as the item functions above.
// They are stored under  users/{uid}/collections/{collectionId}
// and each one looks like { id, name, color, createdAt }.
// Items point to a collection by its NAME (item.collection), so the delete
// function below also clears that field on the items that belonged to it.

// CREATE: add a collection (push() makes a unique id, same as addItem)
export const addCollection = async (uid, collection) => {
  const newRef = push(ref(db, `users/${uid}/collections`));

  await set(newRef, {
    ...collection,          // { name, color } from the Create Collection modal
    id: newRef.key,         // keep the key inside the record so the UI can use it
    createdAt: Date.now()
  });

  return newRef.key;
};

// READ: real-time listener, same shape as getItems.
// Returns the unsubscribe function so React can clean it up.
export const listenCollections = (uid, callback) => {
  const collectionsRef = ref(db, `users/${uid}/collections`);

  return onValue(collectionsRef, (snapshot) => {
    const data = snapshot.val() || {};

    // oldest first, so the list does not jump around (push ids are time based, but be explicit)
    callback(Object.values(data).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)));
  });
};

// UPDATE: change fields of one collection (e.g. rename or recolor).
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
      if (item.collection === oldName) {
        updates[`users/${uid}/items/${item.id}/collection`] = updatedData.name;
      }
    });
  }

  await update(ref(db), updates);
};

// DELETE: remove collections by id. The items inside are KEPT, only their
// collection field is cleared (same behavior the old local-state code had).
export const deleteCollections = async (uid, collectionIds, collectionNames = []) => {
  const updates = {};

  collectionIds.forEach((id) => {
    updates[`users/${uid}/collections/${id}`] = null;   // null = delete in a multi-path update
  });

  if (collectionNames.length) {
    const snap = await get(ref(db, `users/${uid}/items`));
    Object.values(snap.val() || {}).forEach((item) => {
      if (collectionNames.includes(item.collection)) {
        updates[`users/${uid}/items/${item.id}/collection`] = "";
      }
    });
  }

  await update(ref(db), updates);
};


// ========================================================================================= Purchase functions
// NOTE (added): "Bought and Savings" data. Stored at users/{uid}/purchases/{id}.
// A purchase is created when the user taps "Mark as bought" on a watchlist item.

// CREATE: move an item from the watchlist to purchases in ONE multi-path update,
// so you can never end up with the item in both places (or in neither).
export const markAsBought = async (uid, item, paid) => {
  const purchaseRef = push(ref(db, `users/${uid}/purchases`));
  const paidAmount = Number(paid) || Number(item.price) || 0;

  const purchase = {
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

// READ: real-time listener (newest first), same shape as listenItems
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
