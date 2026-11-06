import { z } from "zod";

// Every user-facing validation message lives here so the wording can be matched
// to the test cases in ONE place.

export const MAX_WATCHLIST_ITEMS = 50;
export const MAX_TARGET_PRICE = 10000;
export const MAX_URL_LENGTH = 2048;
export const MAX_SEARCH_LENGTH = 255;
export const MAX_EXPIRY_DAYS = 365;
export const MIN_STOCK = 1;
export const MAX_STOCK = 100;
export const DEFAULT_STOCK_THRESHOLD = 5;

export const CATEGORIES = ["Electronics", "Fashion", "Home & Living", "Beauty & Health", "Groceries", "Toys & Games", "Sports & Outdoors", "Other"];
export const DEFAULT_CATEGORY = "Other";
export const FREQUENCY_VALUES = ["instant", "daily"];

export const MESSAGES = {
  target: {
    empty: "Target price is required.",
    notNumber: "Target price must be a number.",
    special: "Target price must not contain special characters.",
    notPositive: "Target price must be greater than zero.",
    tooHigh: "Target price cannot exceed ₱10,000.",
  },
  url: {
    empty: "Please enter a product URL.",
    tooLong: "URL is too long. The maximum is 2,048 characters.",
    invalid: "Please enter a valid URL.",
    protocol: "URL must start with http:// or https://.",
    unsupported: "This website is not supported. Supported sites: Shopee, Lazada, Amazon and TikTok Shop.",
  },
  search: {
    empty: "Please enter a search term.",
    tooLong: "Search cannot exceed 255 characters.",
    specialOnly: "Search must contain at least one letter or number.",
  },
  expiry: {
    empty: "Expiration date is required.",
    invalid: "Please enter a valid expiration date.",
    past: "Expiration date cannot be in the past.",
    today: "Expiration date must be at least 1 day from today.",
    tooFar: "Expiration date cannot be more than 365 days from today.",
  },
  stock: {
    empty: "Stock threshold is required.",
    notNumber: "Stock threshold must be a number.",
    notWhole: "Stock threshold must be a whole number.",
    tooLow: "Stock threshold must be at least 1.",
    tooHigh: "Stock threshold cannot exceed 100.",
    saved: "Stock threshold saved.",
  },
  notifications: {
    missing: "Notification preference cannot be empty.",
    invalid: "Invalid notification preference.",
    saved: "Notification preferences saved.",
    failed: "Could not save notification preferences. Please try again.",
  },
  watchlist: {
    limit: "Watchlist limit reached. You can track up to 50 items. Remove an item to add a new one.",
  },
  auth: {
    required: "Please fill in all required fields.",
    emailRequired: "Email is required.",
    passwordRequired: "Password is required.",
    emailInvalid: "Please enter a valid email address.",
    passwordLength: "Password must be at least 8 characters.",
    passwordNumber: "Password must contain at least one number.",
    passwordSymbol: "Password must contain at least one symbol.",
    passwordMismatch: "Passwords do not match.",
    loginSuccess: "Login successful!",
    signupSuccess: "Registration successful!",
  },
};

// Returns the first error message, or "" when the value is valid.
export const firstError = (schema, value) => {
  const result = schema.safeParse(value);
  return result.success ? "" : result.error.issues[0].message;
};

// Target price in add item modal - whole number or decimal, 0 < price <= 10,000

export const targetPriceSchema = z.string().superRefine((raw, ctx) => {
  const fail = (message) => ctx.addIssue({ code: "custom", message });
  const value = raw.trim();

  if (!value) return fail(MESSAGES.target.empty);
  if (/[^0-9a-zA-Z.\-\s]/.test(value)) return fail(MESSAGES.target.special);   // e.g. ₱, @, #, $, %, ,
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(value)) return fail(MESSAGES.target.notNumber); // e.g. abc, 12abc, 1.2.3

  const number = Number(value);
  if (number <= 0) return fail(MESSAGES.target.notPositive);
  if (number > MAX_TARGET_PRICE) return fail(MESSAGES.target.tooHigh);
});

export const validateTargetPrice = (value) => firstError(targetPriceSchema, value ?? "");


// Product URL (Additemmodal.jsx + firebase/productFetch.js)

const SUPPORTED_HOSTS = [
  /(^|\.)shopee\.[a-z.]+$/i,
  /(^|\.)shp\.ee$/i,
  /(^|\.)lazada\.[a-z.]+$/i,
  /(^|\.)amazon\.[a-z.]+$/i,
  /(^|\.)amzn\.(to|com|asia)$/i,
  /(^|\.)tiktok\.com$/i,
];

export const productUrlSchema = z.string().superRefine((raw, ctx) => {
  const fail = (message) => ctx.addIssue({ code: "custom", message });
  const value = raw.trim();

  if (!value) return fail(MESSAGES.url.empty);
  if (value.length > MAX_URL_LENGTH) return fail(MESSAGES.url.tooLong);   // checked before parsing

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return fail(MESSAGES.url.invalid);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return fail(MESSAGES.url.protocol);
  if (!parsed.hostname.includes(".")) return fail(MESSAGES.url.invalid);
  if (!SUPPORTED_HOSTS.some((re) => re.test(parsed.hostname))) return fail(MESSAGES.url.unsupported);
});

export const validateProductUrl = (value) => firstError(productUrlSchema, value ?? "");

// Watchlist limit in Dashboard `count` is how many items are tracked.

export const watchlistCountSchema = z
  .number()
  .int()
  .max(MAX_WATCHLIST_ITEMS - 1, MESSAGES.watchlist.limit);

export const validateWatchlistCount = (count) => firstError(watchlistCountSchema, count);

// Login

const emailRule = (requiredMessage) =>
  z
    .string()
    .trim()
    .min(1, requiredMessage)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, MESSAGES.auth.emailInvalid);

export const loginSchema = z.object({
  email: emailRule(MESSAGES.auth.emailRequired),
  password: z.string().min(1, MESSAGES.auth.passwordRequired),
});

export const validateLogin = (form) => firstError(loginSchema, form);

// Registration
const requiredSchema = z.object({
  email: z.string().trim().min(1, MESSAGES.auth.required),
  fullName: z.string().trim().min(1, MESSAGES.auth.required),
  password: z.string().min(1, MESSAGES.auth.required),
  confirm: z.string().min(1, MESSAGES.auth.required),
});

export const passwordSchema = z
  .string()
  .min(8, MESSAGES.auth.passwordLength)
  .regex(/[0-9]/, MESSAGES.auth.passwordNumber)
  .regex(/[^A-Za-z0-9\s]/, MESSAGES.auth.passwordSymbol);

export const signupSchema = z
  .object({
    email: emailRule(MESSAGES.auth.required),
    fullName: z.string().trim().min(1, MESSAGES.auth.required),
    password: passwordSchema,
    confirm: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirm) {
      ctx.addIssue({ code: "custom", path: ["confirm"], message: MESSAGES.auth.passwordMismatch });
    }
  });

// Empty fields are reported first, then the individual rules.
export const validateSignup = (form) =>
  firstError(requiredSchema, form) || firstError(signupSchema, form);


// Product search (Watchlist.jsx)

export const searchQuerySchema = z.string().superRefine((raw, ctx) => {
  const fail = (message) => ctx.addIssue({ code: "custom", message });
  const value = raw.trim();

  if (!value) return fail(MESSAGES.search.empty);
  if (value.length > MAX_SEARCH_LENGTH) return fail(MESSAGES.search.tooLong);
  if (!/[\p{L}\p{N}]/u.test(value)) return fail(MESSAGES.search.specialOnly);   // e.g. "@#$%", "!!!"
});

export const validateSearchQuery = (value) => firstError(searchQuerySchema, value ?? "");

export const categorySchema = z.enum(CATEGORIES);

// Alert expiration date in Additemmodal
//    Accepts 1-365 days from today. is a parameter so it can be tested.

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const dateToInputValue = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const makeExpirySchema = (now = new Date()) =>
  z.string().superRefine((raw, ctx) => {
    const fail = (message) => ctx.addIssue({ code: "custom", message });
    const value = raw.trim();

    if (!value) return fail(MESSAGES.expiry.empty);

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return fail(MESSAGES.expiry.invalid);
    const [, y, m, d] = match.map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return fail(MESSAGES.expiry.invalid);

    const days = Math.round((date - startOfDay(now)) / 86400000);
    if (days < 0) return fail(MESSAGES.expiry.past);
    if (days === 0) return fail(MESSAGES.expiry.today);
    if (days > MAX_EXPIRY_DAYS) return fail(MESSAGES.expiry.tooFar);
  });

export const validateExpiryDate = (value, now = new Date()) => firstError(makeExpirySchema(now), value ?? "");


// Stock threshold in Additemmodal and Settings - whole number 1-100
export const stockThresholdSchema = z.union([z.string(), z.number()]).superRefine((raw, ctx) => {
  const fail = (message) => ctx.addIssue({ code: "custom", message });
  const value = String(raw).trim();

  if (!value) return fail(MESSAGES.stock.empty);
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(value)) return fail(MESSAGES.stock.notNumber);   // abc, 5a, @, 1e3

  const number = Number(value);
  if (number > MAX_STOCK) return fail(MESSAGES.stock.tooHigh);
  if (number <= 0) return fail(MESSAGES.stock.tooLow);                 // zero and negatives
  if (!Number.isInteger(number)) return fail(MESSAGES.stock.notWhole);
});

export const validateStockThreshold = (value) => firstError(stockThresholdSchema, value ?? "");


// Notification preferences in Settings & Dashboard.jsx null / undefined are rejected, as is any value of the wrong type.
const booleanState = z.any().superRefine((value, ctx) => {
  if (value === null || value === undefined) ctx.addIssue({ code: "custom", message: MESSAGES.notifications.missing });
  else if (typeof value !== "boolean") ctx.addIssue({ code: "custom", message: MESSAGES.notifications.invalid });
});

const frequencyState = z.any().superRefine((value, ctx) => {
  if (value === null || value === undefined) ctx.addIssue({ code: "custom", message: MESSAGES.notifications.missing });
  else if (!FREQUENCY_VALUES.includes(value)) ctx.addIssue({ code: "custom", message: MESSAGES.notifications.invalid });
});

export const notificationShape = { inApp: booleanState, emailAlerts: booleanState, frequency: frequencyState };
export const NOTIFICATION_KEYS = Object.keys(notificationShape);

// Validates a settings patch. Only notification keys are checked, but a key that is present with the value undefined/null is rejected.
export const validateNotificationPatch = (patch) => {
  if (patch === null || patch === undefined) return MESSAGES.notifications.missing;
  for (const key of NOTIFICATION_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      const problem = firstError(notificationShape[key], patch[key]);
      if (problem) return problem;
    }
  }
  return "";
};

// Full-object check (all three states must be present)
export const notificationPrefsSchema = z.object(notificationShape);
export const validateNotificationPrefs = (prefs) => firstError(notificationPrefsSchema, prefs ?? {});
