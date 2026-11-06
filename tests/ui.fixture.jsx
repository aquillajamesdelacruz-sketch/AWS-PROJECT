import { memberships } from "../src/lib/memberships.js";
// Dev-server-only component fixture. Not a production entry or authentication bypass.
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import Watchlist from '../src/component/Watchlist.jsx';
import Collection from '../src/component/Collection.jsx';
import BoughtSavings from '../src/component/BoughtSavings.jsx';
import Settings from '../src/component/Settings.jsx';
import AddItemModal from '../src/component/AddItemModal.jsx';
import Landing from '../src/page/landing.jsx';
import Login from '../src/page/login.jsx';
import Register from '../src/page/register.jsx';
import Dashboard from '../src/page/dashboard.jsx';
import DashboardHome from '../src/component/DashboardHome.jsx';
import { Notifications } from '../src/component/DashboardHome.jsx';
import Dialog from '../src/component/Dialog.jsx';
import '../src/index.css';
import '../src/App.css';
import '../src/page/login.css';
import '../src/page/register.css';
import '../src/page/dashboard.css';
import '../src/component/Watchlist.css';
import '../src/component/Collection.css';
import '../src/component/DashboardHome.css';
import '../src/component/BoughtSavings.css';
import '../src/component/Settings.css';
import '../src/component/AddItemModal.css';
import '../src/styles/Theme.css';
import '../src/page/landing.css';
import '../src/styles/System.css';

const params = new URLSearchParams(location.search);
document.documentElement.dataset.theme = params.get('theme') || 'light';
const scene = params.get('scene') || 'watchlist';
if (scene === 'dashboard') localStorage.setItem('peekyfox-theme',params.get('theme') || 'light');
const fixtureTime = Date.now();
const initialItems = [{ id:'one', name:'Wireless headphones for everyday listening', price:2400, original:3200, target:2000, store:'Shopee', category:'Electronics', collection:'Next upgrade', alert:true, createdAt:fixtureTime, history:[{ price:3200, at:fixtureTime-86400000 },{ price:2400, at:fixtureTime }] }];
export function Fixture() {
  const [items, setItems] = useState(initialItems);
  const [open, setOpen] = useState(false);
  const [focused,setFocused]=useState(null);
  const [settings, setSettings] = useState({ email:'test@example.com', inApp:true, emailAlerts:false, frequency:'instant', theme:params.get('theme') || 'light', stockThreshold:5 });
  const [name, setName] = useState('Alex');
  const [collections, setCollections] = useState([{ id:'collection', name:'Next upgrade', color:'#c2410c' },{ id:'travel', name:'Travel', color:'#1e3a8a' }]);
  const [purchases,setPurchases]=useState([{id:'bought',name:initialItems[0].name,paid:2400,original:3200,saved:800,store:'Shopee',boughtAt:fixtureTime,sourceItem:initialItems[0]}]);
  if(focused) return <Watchlist items={items} openId={focused} onOpened={()=>{}} onUpdate={async()=>{}} onDelete={async()=>{}} onAdd={()=>{}} />;
  if (scene === 'landing') return <Landing />;
  if (scene === 'login') return <Login />;
  if (scene === 'register') return <Register />;
  if (scene === 'dashboard') return <Dashboard userName="Alex" previewOnboarding />;
  return <main className="db-main" style={{ minHeight:'100dvh' }}>
    {scene === 'watchlist' && <Watchlist items={items} collections={['Next upgrade']} onAdd={() => setOpen(true)} onUpdate={async (item) => setItems([item])} onDelete={async () => setItems([])} onBought={async () => setItems([])} />}
    {scene === 'collection' && <Collection items={items} collections={collections} onCreate={async (item) => setCollections([...collections,{...item,id:'new'}])} onRename={async (collection,name)=>{setCollections(cs=>cs.map(c=>c.id===collection.id?{...c,name}:c));setItems(xs=>xs.map(i=>({...i,collection:i.collection===collection.name?name:i.collection,collections:memberships(i).map(n=>n===collection.name?name:n)})));}} onAddMembers={async (name,selected)=>setItems(xs=>xs.map(i=>selected.some(s=>s.id===i.id)?{...i,collections:[...memberships(i),name]}:i))} onDelete={async ids => setCollections(cs=>cs.filter(c=>!ids.includes(c.id)))} onAddItem={() => setOpen(true)} onViewItem={() => {}} />}
    {scene === 'savings' && <BoughtSavings purchases={purchases} onUndo={async p=>setPurchases(ps=>ps.filter(x=>x.id!==p.id))} />}
    {scene === 'home' && <><h1>Dashboard</h1><DashboardHome items={items} purchases={[]} collections={[]} onQuickAdd={() => setOpen(true)} onViewItem={() => {}} onViewAll={() => {}} /></>}
    {scene === 'settings' && <Settings userName={name} onNameChange={setName} settings={settings} onSettings={async (patch) => { setSettings({...settings,...patch}); document.documentElement.dataset.theme = patch.theme || settings.theme; return ''; }} items={items} onDeleteAccount={async () => ''} />}
    {scene === 'dialog' && <><h1>Dialog verification</h1><button onClick={() => setOpen(true)}>Open dialog</button>{open && <Dialog onClose={() => setOpen(false)}><h2>Account confirmation</h2><button onClick={() => setOpen(false)}>Cancel</button><button>Confirm</button></Dialog>}</>}
    {scene === 'notifications' && <><h1>Notification verification</h1><button onClick={() => setOpen(true)}>Open notifications</button>{open && <Notifications notifications={[{id:'n',itemId:'one',text:'Your tracked price has changed.',at:fixtureTime,color:'#c2410c'}]} onViewItem={id=>setFocused(id)} onClose={() => setOpen(false)} onMarkRead={() => {}} />}</>}
    {open && !['dialog','notifications'].includes(scene) && <AddItemModal collections={['Next upgrade']} onClose={() => setOpen(false)} onSave={async () => {}} />}
  </main>;
}
createRoot(document.getElementById('root')).render(<StrictMode><BrowserRouter><Fixture /></BrowserRouter></StrictMode>);
