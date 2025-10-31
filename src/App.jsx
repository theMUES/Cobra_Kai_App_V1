import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

// Verve MVP component single file
// Tailwind is required for styling in this demo

const MOCK_ACTORS = [
  {
    id: "a1",
    name: "Ryan Gosling",
    headshot: "https://www.themoviedb.org/t/p/w138_and_h175_face/xUj3e8y3u2gG3bQZ1dZ3Vh1Qx0G.jpg",
    bio: "Film actor known for range across drama and comedy.",
    roles: [
      { id: "r1", movie: "La La Land", year: 2016 },
      { id: "r2", movie: "Drive", year: 2011 },
      { id: "r3", movie: "The Nice Guys", year: 2016 }
    ]
  },
  {
    id: "a2",
    name: "Zendaya",
    headshot: "https://www.themoviedb.org/t/p/w138_and_h175_face/8Y43POKjjKDGI9MH89NW0NAzzp8.jpg",
    bio: "Versatile performer with rising career momentum.",
    roles: [
      { id: "r4", movie: "Dune", year: 2021 },
      { id: "r5", movie: "Malcolm & Marie", year: 2021 },
      { id: "r6", movie: "Spider-Man: No Way Home", year: 2021 }
    ]
  },
  {
    id: "a3",
    name: "Viola Davis",
    headshot: "https://www.themoviedb.org/t/p/w138_and_h175_face/gi2YQ2xvK9OZ0yJ5cQw2kR8Wv9G.jpg",
    bio: "Award-winning actor with an immense emotional range.",
    roles: [
      { id: "r7", movie: "Fences", year: 2016 },
      { id: "r8", movie: "The Help", year: 2011 }
    ]
  }
];

const STORAGE_KEY = "verve_ratings_v1";
const USER_KEY = "verve_user_v1";

function median(arr) {
  if (!arr || arr.length === 0) return null;
  const s = [...arr].sort((a,b)=>a-b);
  const mid = Math.floor(s.length/2);
  if (s.length % 2 === 0) return (s[mid-1] + s[mid]) / 2;
  return s[mid];
}

function debounce(fn, wait = 200) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

function useRatings() {
  const [ratings, setRatings] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error("Failed to read ratings from localStorage", e);
      return {};
    }
  });

  const write = useCallback(
    debounce((next) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save ratings to localStorage", e);
      }
    }, 250),
    []
  );

  useEffect(() => {
    write(ratings);
  }, [ratings, write]);

  const addRating = useCallback((userId, roleId, score) => {
    setRatings(prev => {
      const key = roleId;
      const prevList = prev[key] ? [...prev[key]] : [];
      const filtered = prevList.filter(r => r.userId !== userId);
      filtered.push({ userId, score, ts: Date.now() });
      return { ...prev, [key]: filtered };
    });
  }, []);

  const getRoleRatings = useCallback((roleId) => (ratings[roleId] ? ratings[roleId].map(r=>r.score) : []), [ratings]);

  return { ratings, addRating, getRoleRatings };
}

function Header({ onOpenAbout }){
  return (
    <header className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white">
      <div className="flex items-center gap-3">
        <div className="text-2xl font-bold tracking-tight">Verve</div>
        <div className="text-sm opacity-70">The pulse of performance</div>
      </div>
      <nav className="flex gap-3 items-center">
        <button className="text-sm hover:underline" onClick={onOpenAbout}>About</button>
      </nav>
    </header>
  );
}

function StarBar({value, onChange}){
  return (
    <div className="flex items-center gap-3">
      <input type="range" min={0} max={100} value={value} onChange={(e)=>onChange(Number(e.target.value))} className="w-60" aria-label="Rating slider"/>
      <div className="w-12 text-right font-mono">{value}</div>
    </div>
  );
}

function ActorCard({actor, score, onOpen}){
  return (
    <div className="bg-gradient-to-b from-white/4 to-white/2 rounded-2xl p-4 shadow-lg flex gap-4 items-center">
      <img src={actor.headshot} alt={`${actor.name} headshot`} onError={(e)=>{ e.currentTarget.onerror = null; e.currentTarget.src = "data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='200'><rect width='100%' height='100%' fill='#374151'/><text x='50%' y='50%' fill='#9CA3AF' font-size='14' font-family='Arial' dominant-baseline='middle' text-anchor='middle'>No image</text></svg>`); }} className="w-20 h-20 rounded-lg object-cover"/>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{actor.name}</div>
            <div className="text-xs opacity-70">{actor.bio}</div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-70">Verve Score</div>
            <div className="text-2xl font-bold">{score != null ? Math.round(score) : "—"}</div>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={()=>onOpen(actor)} className="px-3 py-1 rounded bg-white/6 text-sm">View</button>
        </div>
      </div>
    </div>
  );
}

function ActorPage({actor, getRoleRatings, addRating, onClose, localUserId}){
  const initialRole = actor.roles?.[0]?.id ?? null;
  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [score, setScore] = useState(85);
  const [message, setMessage] = useState("");
  const modalRef = useRef(null);
  const firstInteractiveRef = useRef(null);

  const roleRatings = useMemo(()=> getRoleRatings(selectedRole), [getRoleRatings, selectedRole]);
  const roleMedian = median(roleRatings);

  const careerMedian = useMemo(()=> {
    const perRoleMedians = actor.roles.map(r => median(getRoleRatings(r.id))).filter(Boolean);
    return median(perRoleMedians);
  }, [actor.roles, getRoleRatings]);

  const submit = () => {
    if (!selectedRole) { setMessage("No performance selected to rate."); return; }
    addRating(localUserId, selectedRole, score);
    setMessage("Thanks — your rating was saved locally.");
    setTimeout(()=>setMessage(""), 2500);
  };

  useEffect(()=> {
    function onKey(e){ if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return ()=> window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(()=> {
    const prev = document.activeElement;
    const timer = setTimeout(()=> { (firstInteractiveRef.current || modalRef.current)?.focus(); }, 0);
    return ()=> { clearTimeout(timer); if (prev && typeof prev.focus === "function") prev.focus(); };
  }, []);

  return (
    <div ref={modalRef} role="dialog" aria-modal="true" aria-label={`${actor.name} performance details`} tabIndex={-1} className="p-6 bg-black text-white rounded-xl shadow-2xl max-w-3xl mx-auto outline-none">
      <div className="flex items-start gap-6">
        <img src={actor.headshot} alt={`${actor.name} headshot`} onError={(e)=>{ e.currentTarget.onerror = null; e.currentTarget.src = "data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='100%' height='100%' fill='#374151'/><text x='50%' y='50%' fill='#9CA3AF' font-size='14' font-family='Arial' dominant-baseline='middle' text-anchor='middle'>No image</text></svg>`); }} className="w-28 h-28 rounded-lg object-cover"/>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{actor.name}</div>
              <div className="text-sm opacity-70">{actor.bio}</div>
            </div>
            <div className="text-center">
              <div className="text-xs opacity-70">Career Median</div>
              <div className="text-3xl font-bold">{careerMedian != null ? Math.round(careerMedian) : "—"}</div>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm opacity-70">Select performance</label>
            {actor.roles && actor.roles.length > 0 ? (
              <select className="block mt-2 p-2 rounded bg-white/5" value={selectedRole} onChange={(e)=>setSelectedRole(e.target.value)} ref={firstInteractiveRef}>
                {actor.roles.map(r=> <option key={r.id} value={r.id}>{r.movie} — {r.year}</option>)}
              </select>
            ) : (
              <div className="mt-2 text-sm opacity-70">No performances available</div>
            )}

            <div className="mt-4">
              <label className="text-sm opacity-70">Rate this performance</label>
              <div className="mt-2">
                <StarBar value={score} onChange={setScore} />
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={submit} className="px-4 py-2 bg-amber-400 text-black rounded font-semibold" aria-label="Submit rating">Submit Rating</button>
                <button onClick={onClose} className="px-4 py-2 border rounded" aria-label="Back to list">Back</button>
              </div>
              {message && <div className="mt-2 text-sm text-green-300">{message}</div>}
            </div>

            <div className="mt-6">
              <div className="text-sm opacity-70">Performance median</div>
              <div className="mt-1 text-lg font-medium">{roleMedian != null ? Math.round(roleMedian) : "No ratings yet"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Leaderboard({actors, actorScores, onOpen}){
  const sorted = [...actors].map(a=>({actor:a, score: actorScores[a.id] ?? null})).sort((x,y)=> (y.score ?? 0) - (x.score ?? 0));
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Top Actors</h3>
      <div className="grid grid-cols-1 gap-3">
        {sorted.map(({actor, score})=> (
          <div key={actor.id} className="p-3 bg-white/3 rounded flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded overflow-hidden">
                <img src={actor.headshot} alt={`${actor.name} headshot`} onError={(e)=>{ e.currentTarget.onerror = null; e.currentTarget.src = "data:image/svg+xml;utf8,"+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><rect width='100%' height='100%' fill='#374151'/><text x='50%' y='50%' fill='#9CA3AF' font-size='8' font-family='Arial' dominant-baseline='middle' text-anchor='middle'>No image</text></svg>`); }} className="w-full h-full object-cover"/>
              </div>
              <div>
                <div className="font-medium">{actor.name}</div>
                <div className="text-xs opacity-70">{actor.roles.length} performances</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-70">Verve Score</div>
              <div className="text-xl font-bold">{score != null ? Math.round(score) : "—"}</div>
              <div className="mt-2">
                <button onClick={()=>onOpen(actor)} className="text-sm px-3 py-1 border rounded">View</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App(){
  const [actors] = useState(MOCK_ACTORS);
  const { ratings, addRating, getRoleRatings } = useRatings();
  const [activeActor, setActiveActor] = useState(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const localUserId = useMemo(() => {
    try {
      let id = localStorage.getItem(USER_KEY);
      if (!id) {
        id = `u_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
        localStorage.setItem(USER_KEY, id);
      }
      return id;
    } catch (e) {
      console.error("Failed to get/create local user id", e);
      return "anon";
    }
  }, []);

  const actorScores = useMemo(()=>{
    const map = {};
    actors.forEach(a=>{
      const perRoleMedians = a.roles.map(r=> median(getRoleRatings(r.id))).filter(Boolean);
      map[a.id] = perRoleMedians.length ? median(perRoleMedians) : null;
    });
    return map;
  }, [actors, ratings, getRoleRatings]);

  const totalRatings = useMemo(()=> Object.values(ratings).reduce((s,arr)=>s+arr.length,0), [ratings]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-gray-800 text-white p-6">
      <Header onOpenAbout={()=>setAboutOpen(true)} />

      <main className="max-w-6xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Discover actors</h2>
            <div className="text-sm opacity-60">Rate performances to shape the score</div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {actors.map(a=> (
              <ActorCard key={a.id} actor={a} score={actorScores[a.id]} onOpen={(act)=> setActiveActor(act)} />
            ))}
          </div>
        </section>

        <aside className="md:col-span-1 space-y-4">
          <Leaderboard actors={actors} actorScores={actorScores} onOpen={(act)=>setActiveActor(act)} />

          <div className="p-4 bg-white/5 rounded">
            <h4 className="font-semibold">Your stats</h4>
            <p className="text-sm opacity-70 mt-2">Ratings submitted: {totalRatings}</p>
            <p className="text-sm opacity-70 mt-1">Local profile: {localUserId}</p>
            <p className="text-xs opacity-50 mt-2">This is a demo MVP — ratings are stored locally in your browser.</p>
          </div>
        </aside>
      </main>

      {activeActor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setActiveActor(null)} aria-hidden="true" />
          <div className="relative z-50 w-full max-w-4xl p-4">
            <ActorPage actor={activeActor} getRoleRatings={getRoleRatings} addRating={addRating} onClose={()=>setActiveActor(null)} localUserId={localUserId} />
          </div>
        </div>
      )}

      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80" onClick={()=>setAboutOpen(false)} />
          <div className="relative z-60 max-w-2xl bg-white/5 rounded p-6">
            <h3 className="text-lg font-bold">About Verve</h3>
            <p className="mt-3 text-sm opacity-80">Verve measures actor performances per role. This MVP stores ratings locally. For a full product, connect TMDb/IMDb data, add user accounts, anti-abuse systems, and scalable aggregation.</p>
            <div className="mt-4 text-right"><button className="px-4 py-2 bg-amber-400 text-black rounded" onClick={()=>setAboutOpen(false)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
