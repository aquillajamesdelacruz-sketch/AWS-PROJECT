const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const send = async (fileOrUrl) => {
  // Check Cloudinary configuration
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary is not set up. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env file, then restart the dev server."
    );
  }

  const formData = new FormData();
  formData.append("file", fileOrUrl);
  formData.append("upload_preset", UPLOAD_PRESET); // must be an UNSIGNED preset

  let response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });
  } catch {
  
    throw new Error("Could not reach Cloudinary. Check your internet connection.");
  }

  // changed: read the body safely, an error page is not always JSON
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || `Upload failed (${response.status}).`);
  }

  // Return Cloudinary image URL
  return data.secure_url;
};

// Upload a picture the user picked from their device
export const uploadImage = async (file) => {
  // Check if an image was selected
  if (!file) {
    throw new Error("Please select an image.");
  }

  // Check image format
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image.");
  }

  // Limit image size to 5MB
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must not exceed 5MB.");
  }

  return send(file);
};

// added: upload an image that lives at a public web address (the product photo found by "Fetch").
// Cloudinary downloads it itself, so the browser never has to fetch the image (that would be
// blocked by the store's CORS rules) and the image is not hot-linked from Shopee/Lazada later.
export const uploadImageFromUrl = async (imageUrl) => {
  if (!/^https?:\/\//i.test(imageUrl || "")) {
    throw new Error("That image address is not valid.");
  }

  return send(imageUrl);
};
