import { CloseIcon } from "./Icons.jsx";
import Dialog from "./Dialog.jsx";
import { celebrate } from "../lib/celebrate.js";
import { useEffect, useRef, useState } from "react";
import find from "../assets/find.png";
import mascot from "../assets/Mascot.png";

import { uploadImage, uploadImageFromUrl } from "../lib/cloudinary.js";
import { fetchProductInfo } from "../lib/productFetch.js";
import {
  validateProductUrl, validateTargetPrice, validateWatchlistCount, validateExpiryDate, validateStockThreshold,
  CATEGORIES, DEFAULT_CATEGORY, DEFAULT_STOCK_THRESHOLD, MAX_EXPIRY_DAYS, MAX_STOCK, addDays, dateToInputValue,
} from "../lib/validation/schemas.js";

const STEPS = ["Paste link", "Confirm details", "Track"];
const STORES = { shopee: "Shopee", lazada: "Lazada", amazon: "Amazon", tiktok: "TikTok Shop" };

const detectStore = (url) => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("shopee.") || host === "shp.ee") return STORES.shopee;
    if (host.includes("lazada.") || host === "lzd.co") return STORES.lazada;
    if (host.includes("amazon.") || host.startsWith("amzn.")) return STORES.amazon;
    if (host.includes("tiktok.com")) return STORES.tiktok;
    return null;
  } catch {
    return null;
  }
};
const parse = (v) => Number(String(v).replace(/[^0-9.]/g, "")) || 0;
const peso = (n) => "₱" + parse(n).toLocaleString("en-PH");

function StepLine({ on = false }) {
  return (
    <svg className={`ai-line${on ? " is-on" : ""}`} width="106" height="24" viewBox="0 0 106 24" fill="none" aria-hidden="true">
      <path className="ai-line__wave" d="M1 12h8l5-7 7 14 7-14 7 14 6-7h14" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path className="ai-line__body" d="M70 12c8-9 22-9 28 0-6 9-20 9-28 0z" fill="#f97316" />
      <path className="ai-line__tail" d="M99 7l5-3M99 17l5 3M100 12h5" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function AddItemModal({ initialUrl = "", collections = [], watchlistCount = 0, defaultStockThreshold = DEFAULT_STOCK_THRESHOLD, onClose, onSave }) {
  const [phase, setPhase] = useState(initialUrl ? "fetching" : "paste"); // paste | fetching | confirm | success
  const [url, setUrl] = useState(initialUrl);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [original, setOriginal] = useState("");   // optional: the price before the discount
  const [target, setTarget] = useState("");
  const [collection, setCollection] = useState(collections[0] || "");
  const [toast, setToast] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [urlError, setUrlError] = useState("");
  const [targetError, setTargetError] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [expires, setExpires] = useState("");
  const [expiresError, setExpiresError] = useState("");
  const [stock, setStock] = useState(String(defaultStockThreshold ?? DEFAULT_STOCK_THRESHOLD));
  const [stockError, setStockError] = useState("");
  const today = new Date();
  const limitError = validateWatchlistCount(watchlistCount);   // "" while there is still room

  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);   // a picture the user picked from their device
  const [previewImage, setPreviewImage] = useState("");

  // added: image found by "Fetch"
  const [cloudImage, setCloudImage] = useState("");            // the same picture once it is in Cloudinary
  const [fetchNote, setFetchNote] = useState("");              // message shown under the badge after fetching
  const [uploadingImage, setUploadingImage] = useState(false); // true while the fetched image goes to Cloudinary
  const runId = useRef(0);                                     // identifies the latest Fetch so an old one cannot overwrite the form
  const imageToken = useRef(0);                                // bumped whenever the user picks/removes a picture, so a late Cloudinary reply cannot bring an old one back
  const fileInput = useRef(null);
  const blobUrl = useRef("");                                  // object URL of a picked file, revoked when replaced

  const step = phase === "success" ? 2 : phase === "confirm" ? 1 : 0;
  const store = detectStore(url);

  // changed: picking a file replaces whatever "Fetch" found. The old preview address is released
  // so the browser does not keep every picked picture in memory.
  const clearBlob = () => {
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    blobUrl.current = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // validate right away so the user is told now, not at save time
    if (!/^image\/(jpeg|png|webp|gif|avif)$/i.test(file.type)) {
      setSaveError("Please use a JPG, PNG, WEBP, GIF or AVIF image.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSaveError("Image must not exceed 5MB.");
      e.target.value = "";
      return;
    }

    imageToken.current++;            // cancels the fetched picture still uploading
    clearBlob();
    blobUrl.current = URL.createObjectURL(file);
    setSelectedImage(file);
    setCloudImage("");
    setUploadingImage(false);
    setPreviewImage(blobUrl.current);
    setSaveError("");
  };

  // clears the picked file AND the fetched one
  const removeImage = () => {
    imageToken.current++;
    if (fileInput.current) fileInput.current.value = "";   // lets the same file be picked again
    setUploadingImage(false);
    clearBlob();
    setSelectedImage(null);
    setCloudImage("");
    setPreviewImage("");
  };

  // when the modal closes: release the picked-file preview and ignore any fetch still running
  useEffect(() => () => { clearBlob(); runId.current = -1; }, []);

  // changed: REAL fetch (was a timer that left every field empty).
  //   1. read the link  -> name, price, image address        (productFetch.js)
  //   2. send the image address to Cloudinary                 (cloudinary.js)
  //   3. fill the form so the user only has to check it
  // If anything fails the user still gets the form and can type/pick things by hand.
  useEffect(() => {
    if (phase !== "fetching") return;

    // validate before fetching (also covers a link passed in from the dashboard quick-add)
    const problem = limitError || validateProductUrl(url);
    if (problem) {
      setUrlError(problem);
      setPhase("paste");
      return;
    }

    // The effect re-runs when the phase changes (fetching -> confirm), so it cannot use its own cleanup
    // to cancel the image upload that continues after the form appears. A run number is used instead:
    // it only changes when a NEW fetch starts or the modal closes.
    const controller = new AbortController();
    const myRun = ++runId.current;
    const isCancelled = () => runId.current !== myRun;

    (async () => {
      const notes = [];
      let info = { name: "", price: 0, original: 0, image: "" };

      try {
        info = await fetchProductInfo(url, controller.signal);
      } catch (error) {
        if (isCancelled()) return;
        notes.push(`Pixie could not read that page (${error.message}). Please fill in the details yourself.`);
      }
      if (isCancelled()) return;

      // auto-fill the inputs (only what was found; empty values stay empty)
      setName(info.name || "");
      setPrice(info.price ? String(info.price) : "");
      setOriginal(info.original ? String(info.original) : "");
      setTarget("");
      removeImage();
      if (info.name || info.price) celebrate({ subtle: true });
      setPhase("confirm");   // show the form now; the image keeps uploading in the background

      if (info.name && !info.price) notes.push("Pixie found the name but not the price. Please type the current price.");

      if (info.image) {
        const myImage = imageToken.current;
        const stale = () => isCancelled() || imageToken.current !== myImage;   // user picked/removed a picture meanwhile
        setPreviewImage(info.image);     // shows the picture straight away
        setUploadingImage(true);
        try {
          const uploaded = await uploadImageFromUrl(info.image);   // -> Cloudinary
          if (stale()) return;
          setCloudImage(uploaded);
          setPreviewImage(uploaded);     // from now on the preview is the Cloudinary copy
        } catch (error) {
          if (stale()) return;
          // keep the shop's picture address so the item still gets an image
          setCloudImage(info.image);
          notes.push(`The product image could not be copied to Cloudinary (${error.message}); the shop's own image link will be used instead.`);
        } finally {
          if (!stale()) setUploadingImage(false);
        }
      } else if (info.name) {
        notes.push("No product image was found. You can upload one yourself.");
      }

      if (!isCancelled()) setFetchNote(notes.join(" "));
    })();

    return () => controller.abort();   // only stops the page request; the image upload is guarded by isCancelled()
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps



  
    // changed the save function, and added the image uplood raaa
    const save = async () => {
      setSaveError("");

      const targetProblem = validateTargetPrice(target);
      const expiresProblem = validateExpiryDate(expires);
      const stockProblem = validateStockThreshold(stock);
      setTargetError(targetProblem);
      setExpiresError(expiresProblem);
      setStockError(stockProblem);
      if (targetProblem || expiresProblem || stockProblem) return;
      if (limitError) return setSaveError(limitError);

      setSaving(true);

      try {
        // Which image to save (all of them end up as a Cloudinary address):
        //   1. a picture the user picked  -> uploaded now
        //   2. the fetched picture        -> already in Cloudinary (cloudImage)
        let imageUrl = null;

        if (selectedImage) {
          imageUrl = await uploadImage(selectedImage);
        } else if (cloudImage) {
          imageUrl = cloudImage;
        }

        // Save product information and Cloudinary URL
        await onSave?.({
          image: imageUrl,
          name: name.trim(),
          url,
          store,
          original: Math.max(parse(original), parse(price)),
          price: parse(price),
          target: parse(target),
          collection,
          category,
          expiresAt: expires,
          stockThreshold: Number(stock),
          alert: true
        });

        setToast(true);
        setPhase("success");
        celebrate();

      } catch (error) {
        console.error(error);
        setSaveError(error.message || "Could not save this item.");

      } finally {
        setSaving(false);
      }
    };


    const handleFetch = () => {
      const problem = limitError || validateProductUrl(url);
      setUrlError(problem);
      if (!problem) setPhase("fetching");
    };

    const reset = () => {
      setUrl(""); setName(""); setPrice(""); setOriginal(""); setTarget("");
      setUrlError(""); setTargetError("");
      setCategory(DEFAULT_CATEGORY); setExpires(""); setExpiresError("");
      setStock(String(defaultStockThreshold ?? DEFAULT_STOCK_THRESHOLD)); setStockError("");
      removeImage(); setFetchNote(""); setSaveError("");     // added: the old picture must not carry over to the next item
      setToast(false); setPhase("paste");
    };

  return (
    <Dialog onClose={onClose} overlayClassName="ai-overlay" className="ai-modal" labelledBy="ai-title">
        <header className="ai-head">
          <div>
            <h2 id="ai-title">Add an item</h2>
            <p>One link closer to a better price.</p>
          </div>
          <button type="button" className="ai-close" aria-label="Close" onClick={onClose}><CloseIcon /></button>
        </header>

        <ol className="ai-steps" aria-label={`Step ${step + 1} of 3`}>
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? "is-current" : i < step ? "is-done" : ""}>
              <span>{i + 1} {label}</span>
              {i < STEPS.length - 1 && <StepLine on={i < step} />}
            </li>
          ))}
        </ol>

        {phase !== "success" && (
          <>
            <label className="ai-label" htmlFor="ai-url">Product link</label>
            <div className="ai-linkrow">
              <input id="ai-url" className="ai-input" type="url" placeholder="https://shopee.ph/product/example"
                value={url} onChange={(e) => { setUrl(e.target.value); setUrlError(""); }} disabled={phase === "fetching"}
                aria-invalid={!!urlError} aria-describedby={urlError ? "ai-url-error" : undefined} />
              <button type="button" className={`ai-fetch${phase === "fetching" ? " is-busy" : ""}`}
                disabled={phase === "fetching" || !!limitError} onClick={handleFetch}>
                {phase === "fetching" && <span className="ai-dot" />}Fetch
              </button>
            </div>
            {(urlError || limitError) && <p id="ai-url-error" className="ai-error ai-error--field" role="alert">{limitError || urlError}</p>}
          </>
        )}

        {phase === "paste" && (
          <div className="ai-center">
            <img src={find} alt="" className="ai-fox" />
            <h3>Paste a link to get started.</h3>
            <p>Shopee, Lazada, TikTok Shop, Amazon and more.</p>
          </div>
        )}

        {phase === "fetching" && (
          <>
            <div className="ai-center">
              <img src={find} alt="Pixie searching with a magnifying glass" className="ai-fox" />
              <h3>Pixie is taking a closer look.</h3>
              <p>Reading available product details, including the current price...</p>
              <span className="ai-spinner" role="status" aria-label="Loading" />
            </div>
            <div className="ai-skeleton" aria-hidden="true">
              <i className="ai-skeleton__img" />
              <div><i style={{ width: "62%" }} /><i style={{ width: "38%" }} /><i style={{ width: "20%", height: 26 }} /></div>
            </div>
          </>
        )}

        {phase === "confirm" && (
          <>
            {store && <span className="ai-badge">{store} detected</span>}

            {/* added: message about what the fetch could and could not fill in */}
            {fetchNote && <p className="ai-note" role="status">{fetchNote}</p>}

            {/* Product image: shows the fetched picture (already in Cloudinary) or the one the user picked */}
            <label className="ai-label" htmlFor="ai-image">Product image</label>
            <div className="ai-image">
              {previewImage ? (
                <div className="ai-image__thumb">
                  <img src={previewImage} alt="Product preview" />
                  {uploadingImage && <span className="ai-image__busy">Uploading...</span>}
                </div>
              ) : (
                <div className="ai-image__thumb ai-image__thumb--empty" aria-hidden="true">No image</div>
              )}
              <div className="ai-image__side">
                <input id="ai-image" ref={fileInput} className="ai-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={handleImageChange} />
                {previewImage && (
                  <button type="button" className="ai-image__remove" onClick={removeImage}>Remove image</button>
                )}
              </div>
            </div>

            <label className="ai-label" htmlFor="ai-name">Product name</label>
            <input id="ai-name" className="ai-input" value={name} onChange={(e) => setName(e.target.value)} />

            <div className="ai-grid">
              <div>
                <label className="ai-label" htmlFor="ai-price">Current price</label>
                <input id="ai-price" className="ai-input" inputMode="decimal" value={price ? peso(price) : ""}
                  onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <label className="ai-label" htmlFor="ai-orig">Original price (optional)</label>
                <input id="ai-orig" className="ai-input" inputMode="decimal" value={original ? peso(original) : ""}
                  onChange={(e) => setOriginal(e.target.value)} />
              </div>
              <div>
                <label className="ai-label" htmlFor="ai-target">Target price</label>
                <input id="ai-target" className="ai-input" inputMode="decimal" placeholder="e.g. 999" value={target}
                  onChange={(e) => { setTarget(e.target.value); if (targetError) setTargetError(validateTargetPrice(e.target.value)); }}
                  onBlur={() => setTargetError(validateTargetPrice(target))}
                  aria-invalid={!!targetError} aria-describedby={targetError ? "ai-target-error" : undefined} />
                {targetError && <p id="ai-target-error" className="ai-error ai-error--field" role="alert">{targetError}</p>}
              </div>
              <div>
                <label className="ai-label" htmlFor="ai-coll">Collection</label>
                <select id="ai-coll" className="ai-input ai-select" value={collection} onChange={(e) => setCollection(e.target.value)}>
                  <option value="">No collection</option>
                  {collections.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="ai-label" htmlFor="ai-cat">Category</label>
                <select id="ai-cat" className="ai-input ai-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="ai-label" htmlFor="ai-exp">Alert expires on</label>
                <input id="ai-exp" className="ai-input" type="date" value={expires}
                  min={dateToInputValue(addDays(today, 1))} max={dateToInputValue(addDays(today, MAX_EXPIRY_DAYS))}
                  onChange={(e) => { setExpires(e.target.value); if (expiresError) setExpiresError(validateExpiryDate(e.target.value)); }}
                  onBlur={() => setExpiresError(validateExpiryDate(expires))}
                  aria-invalid={!!expiresError} aria-describedby={expiresError ? "ai-exp-error" : undefined} />
                {expiresError && <p id="ai-exp-error" className="ai-error ai-error--field" role="alert">{expiresError}</p>}
              </div>
              <div>
                <label className="ai-label" htmlFor="ai-stock">Stock alert threshold (1-{MAX_STOCK})</label>
                <input id="ai-stock" className="ai-input" inputMode="numeric" value={stock}
                  onChange={(e) => { setStock(e.target.value); if (stockError) setStockError(validateStockThreshold(e.target.value)); }}
                  onBlur={() => setStockError(validateStockThreshold(stock))}
                  aria-invalid={!!stockError} aria-describedby={stockError ? "ai-stock-error" : undefined} />
                {stockError && <p id="ai-stock-error" className="ai-error ai-error--field" role="alert">{stockError}</p>}
              </div>
            </div>

            {/* added: this message was set but never shown, so failed uploads looked like nothing happened */}
            {saveError && <p className="ai-error" role="alert">{saveError}</p>}

            <div className="ai-actions ai-actions--end">
              <button type="button" className="ai-btn ai-btn--ghost" onClick={onClose}>Cancel</button>
              <button type="button" className="ai-btn ai-btn--primary" onClick={save} disabled={!name.trim() || parse(price) <= 0 || saving || uploadingImage}>
                {saving ? "Saving..." : uploadingImage ? "Uploading image..." : "Save and track"}
              </button>
            </div>
          </>
        )}

        {phase === "success" && (
          <>
            <div className="ai-success">
              <div className="ai-success__stage">
                <img src={mascot} alt="Pixie celebrating" />
              </div>
              <h3>Item tracked successfully!</h3>
              <p className="ai-success__msg">
                {name.split(",")[0]} added to {collection || "your watchlist"}. We will notify you when it hits {peso(target)}.
              </p>
              <div className="ai-actions">
                <button type="button" className="ai-btn ai-btn--primary" onClick={onClose}>Done</button>
                <button type="button" className="ai-btn ai-btn--ghost" onClick={reset}>Add another item</button>
              </div>
            </div>
            {toast && (
              <div className="ai-toast" role="status">
                <span className="ai-toast__dot" />Item added to tracker.
                <button type="button" aria-label="Dismiss" onClick={() => setToast(false)}><CloseIcon /></button>
              </div>
            )}
          </>
        )}
    </Dialog>
  );
}