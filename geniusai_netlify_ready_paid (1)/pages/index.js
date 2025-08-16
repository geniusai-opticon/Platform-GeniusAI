
import { useEffect, useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function Home(){
  const { data: session } = useSession();
  const [stats,setStats]=useState({total:0,goal:1000,remaining:1000});
  const [form,setForm]=useState({name:'',email:'',interest:'',spending:'',ref:''});
  const [launchIn,setLaunchIn]=useState('');

  useEffect(()=>{
    fetch('/api/stats').then(r=>r.json()).then(setStats).catch(()=>{});
    const end = Date.now() + 30*24*60*60*1000;
    const id = setInterval(()=>{
      const t = Math.max(0,end-Date.now());
      const d = Math.floor(t/86400000);
      const h = Math.floor((t%86400000)/3600000);
      const m = Math.floor((t%3600000)/60000);
      const s = Math.floor((t%60000)/1000);
      setLaunchIn(`${d}d ${h}h ${m}m ${s}s`);
    },1000);
    return ()=>clearInterval(id);
  },[]);

  const submit = async (e)=>{
    e.preventDefault();
    const res = await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
    if(res.ok){ alert('Registrierung erfolgreich 🎉'); fetch('/api/stats').then(r=>r.json()).then(setStats); } else alert('Fehler bei der Registrierung');
  };

  const checkout = async ()=>{
    if(!form.email) return alert('Bitte Email eintragen');
    const r = await fetch('/api/stripe/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.email,referral:form.ref})});
    const j = await r.json();
    if(j.url) window.location.href=j.url; else alert('Checkout Fehler');
  };

  return (
    <div className="container">
      <div className="hero">
        <h1>GENIUS.AI.SOLUTION – Beta</h1>
        <p>3 Monate Premium kostenlos – nur für die ersten 1000 Beta-Tester.</p>
        <p><strong>Countdown:</strong> {launchIn}</p>
        <p><strong>Registrierungen:</strong> {stats.total} / {stats.goal} (frei: {stats.remaining})</p>
        {!session ? (
          <button className="btn" onClick={()=>signIn('google')}>Mit Google starten</button>
        ) : (
          <div className="flex">
            <span>Eingeloggt als {session.user?.email}</span>
            <button className="btn" onClick={()=>signOut()}>Logout</button>
          </div>
        )}
      </div>

      <div className="grid">
        <div className="card">
          <h3>Beta-Registrierung</h3>
          <form onSubmit={submit}>
            <label>Name</label>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
            <label>Email</label>
            <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
            <label>Interessiert an</label>
            <select value={form.interest} onChange={e=>setForm({...form,interest:e.target.value})}>
              <option value="">Bitte wählen</option>
              <option value="strom">Strom</option>
              <option value="gas">Gas</option>
              <option value="dsl">DSL</option>
              <option value="mobilfunk">Mobilfunk</option>
            </select>
            <label>Monatliche Ausgaben (ca.)</label>
            <input value={form.spending} onChange={e=>setForm({...form,spending:e.target.value})} placeholder="z. B. 120€" />
            <label>Referral (optional)</label>
            <input value={form.ref} onChange={e=>setForm({...form,ref:e.target.value})} />
            <div className="flex" style={{marginTop:12}}>
              <button className="btn" type="submit">Registrieren</button>
              <button className="btn" type="button" onClick={checkout}>Zu Premium wechseln</button>
            </div>
            <small>DSGVO-konform · jederzeit kündbar</small>
          </form>
        </div>

        <div className="card">
          <h3>Was du bekommst</h3>
          <ul>
            <li>3 Monate Premium (Wert: 30€)</li>
            <li>Früher Zugang & Feedback-Kanal</li>
            <li>Referral-Boni</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
