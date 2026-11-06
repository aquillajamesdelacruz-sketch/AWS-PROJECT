import { useEffect, useRef } from "react";
export default function Popover({children,onClose,label,className=""}) {
 const panel=useRef(null); const opener=useRef(null); const close=useRef(onClose);
 useEffect(()=>{close.current=onClose;},[onClose]);
 useEffect(()=>{
  if(!opener.current) opener.current=document.activeElement;
  const trigger=opener.current;
  const node=panel.current;
  node?.querySelector("button, a")?.focus();
  const outside=e=>{if(!panel.current?.contains(e.target) && e.target!==trigger && !trigger?.contains(e.target)) close.current();};
  const key=e=>{if(e.key==="Escape"){e.stopPropagation();close.current();trigger?.focus();}};
  document.addEventListener("pointerdown",outside); document.addEventListener("keydown",key);
  return ()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",key);if(node?.contains(document.activeElement) && trigger?.isConnected) trigger.focus();};
 },[]);
 return <section ref={panel} role="dialog" aria-label={label} className={"pf-popover "+className}>{children}</section>;
}
