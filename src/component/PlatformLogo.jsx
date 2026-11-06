import shopee from "../assets/platforms/shopee.svg";
import amazon from "../assets/platforms/amazon.svg";
import tiktok from "../assets/platforms/tiktok.svg";
import lazada from "../assets/platforms/lazada.ico";
export default function PlatformLogo({store=""}) { const key=Object.keys({shopee,amazon,tiktok,lazada}).find(k=>store.toLowerCase().includes(k)); return key ? <img className="platform-logo" src={{shopee,amazon,tiktok,lazada}[key]} width="24" height="24" alt="" /> : null; }
