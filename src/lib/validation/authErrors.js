import { MESSAGES } from "./schemas.js";

// Maps Firebase Auth error codes to the messages shown to the user.
const LOGIN_ERRORS = {
  "auth/invalid-credential": "Invalid email or password.",
  "auth/wrong-password": "Incorrect password.",
  "auth/user-not-found": "Invalid email or password.",
  "auth/invalid-email": MESSAGES.auth.emailInvalid,
  "auth/missing-password": MESSAGES.auth.passwordRequired,
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many failed attempts. Please try again later.",
  "auth/network-request-failed": "Network error. Please check your connection and try again.",
  "auth/popup-closed-by-user": "Google sign-in was cancelled.",
  "auth/cancelled-popup-request": "Google sign-in was cancelled.",
  "auth/popup-blocked": "The sign-in popup was blocked. Please allow popups and try again.",
};

const SIGNUP_ERRORS = {
  "auth/email-already-in-use": "This email is already registered.",
  "auth/invalid-email": MESSAGES.auth.emailInvalid,
  "auth/weak-password": MESSAGES.auth.passwordLength,
  "auth/network-request-failed": "Network error. Please check your connection and try again.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
};

export const loginErrorMessage = (error) =>
  LOGIN_ERRORS[error?.code] || "Something went wrong. Please try again.";

export const signupErrorMessage = (error) =>
  SIGNUP_ERRORS[error?.code] || "Something went wrong. Please try again.";
