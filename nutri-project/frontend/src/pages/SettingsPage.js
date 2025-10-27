import React, { useEffect, useState } from 'react';

const ALLERGENS = ['peanuts','tree nuts','dairy','eggs','soy','gluten','shellfish'];

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        if (alive) setProfile({
          id: data.id,
          name: data.name || '',
          email: data.email || '',
          preferences: data.preferences || {},
          allergens: Array.isArray(data.allergens) ? data.allergens : [],
          calorieTarget: data.calorieTarget ?? null,
          notifications: data.notifications || { menuReminders: false, weeklySummary: false }
        });
      } catch (e) {
        if (alive) setError(e.message);
      }
    })();
    return () => { alive = false; };
  }, []);

  const update = (key, value) => setProfile(p => ({ ...p, [key]: value }));
  const togglePref = (key) =>
    setProfile(p => ({ ...p, preferences: { ...(p.preferences||{}), [key]: !p?.preferences?.[key] }}));
  const toggleAllergen = (a) =>
    setProfile(p => ({ ...p, allergens: p.allergens.includes(a) ? p.allergens.filter(x => x!==a) : [...p.allergens, a] }));

  const save = async () => {
    if (!profile) return;
    setSaving(true); setError(null); setSaved(false);
    if (profile.calorieTarget != null && (profile.calorieTarget < 0 || profile.calorieTarget > 10000)) {
      setSaving(false); setError('Calorie target must be between 0 and 10,000.'); return;
    }
    try {
      const res = await fetch('/api/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="p-6" style={{color:'#b00020'}}>{error}</div>;
  if (!profile) return <div className="p-6">Loading…</div>;

  return (
    <main className="max-w-3xl" style={{margin:'0 auto', padding:'24px', display:'grid', gap:'16px'}}>
      <h1 style={{fontSize:'24px', fontWeight:'600'}}>Account Settings</h1>

      <section style={{display:'grid', gap:'8px'}}>
        <label>
          <div style={{fontSize:'12px', color:'#666'}}>Display name</div>
          <input
            style={{width:'100%', border:'1px solid #ccc', borderRadius:8, padding:'8px'}}
            value={profile.name}
            onChange={e => update('name', e.target.value)}
          />
        </label>

        <div>
          <div style={{fontSize:'12px', color:'#666'}}>Email</div>
          <div style={{border:'1px solid #eee', borderRadius:8, padding:'8px', background:'#fafafa'}}>{profile.email}</div>
        </div>
      </section>

      <section>
        <h2 style={{fontSize:'18px', fontWeight:'500'}}>Dietary preferences</h2>
        {['vegetarian','vegan','halal','kosher'].map(k => (
          <label key={k} style={{display:'flex', alignItems:'center', gap:'8px'}}>
            <input type="checkbox" checked={!!profile.preferences?.[k]} onChange={() => togglePref(k)} />
            <span style={{textTransform:'capitalize'}}>{k}</span>
          </label>
        ))}
      </section>

      <section>
        <h2 style={{fontSize:'18px', fontWeight:'500'}}>Allergens</h2>
        <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
          {ALLERGENS.map(a => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAllergen(a)}
              style={{
                padding:'6px 10px', borderRadius:999,
                border:'1px solid #ccc',
                background: profile.allergens.includes(a) ? '#eaeaea' : 'white',
                cursor:'pointer'
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </section>

      <section style={{display:'grid', gap:'8px'}}>
        <h2 style={{fontSize:'18px', fontWeight:'500'}}>Daily calorie target</h2>
        <input
          type="number"
          min={0}
          max={10000}
          style={{width:120, border:'1px solid #ccc', borderRadius:8, padding:'8px'}}
          value={profile.calorieTarget ?? ''}
          onChange={e => update('calorieTarget', e.target.value === '' ? null : Number(e.target.value))}
          placeholder="e.g., 2200"
        />
      </section>

      <section>
        <h2 style={{fontSize:'18px', fontWeight:'500'}}>Notifications</h2>
        <label style={{display:'flex', alignItems:'center', gap:'8px'}}>
          <input
            type="checkbox"
            checked={!!profile.notifications?.menuReminders}
            onChange={e => update('notifications', { ...(profile.notifications||{}), menuReminders: e.target.checked })}
          />
          <span>Dining hall menu reminders</span>
        </label>
        <label style={{display:'flex', alignItems:'center', gap:'8px'}}>
          <input
            type="checkbox"
            checked={!!profile.notifications?.weeklySummary}
            onChange={e => update('notifications', { ...(profile.notifications||{}), weeklySummary: e.target.checked })}
          />
          <span>Weekly nutrition summary</span>
        </label>
      </section>

      <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
        <button
          onClick={save}
          disabled={saving}
          style={{padding:'10px 16px', borderRadius:8, border:'none', background:'#111', color:'#fff', opacity:saving?0.6:1, cursor:'pointer'}}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && <span style={{color:'#0a7f2e'}}>Saved!</span>}
      </div>
    </main>
  );
}
