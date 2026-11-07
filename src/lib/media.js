// Deliver resized, automatically compressed formats for owned Cloudinary product media.
export function productImage(url, width=640) {
 if(typeof url!=="string") return url;
 try { const parsed=new URL(url); if(parsed.hostname!=="res.cloudinary.com" || !parsed.pathname.includes("/image/upload/") || parsed.pathname.includes("/s--") || parsed.pathname.includes("/f_auto,")) return url;
 return url.replace("/image/upload/",`/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
 } catch { return url; }
}
