// pages/index.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createGame = async () => {
    if (!name.trim()) { setError('Enter your name'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); setLoading(false); return; }
      localStorage.setItem(`poker_player_${data.gameId}`, data.playerId);
      router.push(`/game/${data.gameId}`);
    } catch { setError('Network error'); setLoading(false); }
  };

  const joinGame = async () => {
    if (!name.trim()) { setError('Enter your name'); return; }
    if (!code.trim()) { setError('Enter access code'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/game/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name, accessCode: code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); setLoading(false); return; }
      localStorage.setItem(`poker_player_${data.gameId}`, data.playerId);
      router.push(`/game/${data.gameId}`);
    } catch { setError('Network error'); setLoading(false); }
  };

  return (
    <>
      <Head>
        <title>Poker — Play with Friends</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: '#0d1117',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        padding: '20px',
      }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          
          {/* Logo */}
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 60, marginBottom: 12 }}>🃏</div>
            <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: -1 }}>
              Poker Night
            </h1>
            <p style={{ color: '#8b949e', margin: '8px 0 0', fontSize: 15 }}>
              Texas Hold'em with friends — no signup needed
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: 16,
            padding: 28,
          }}>
            {/* Tabs */}
            <div style={{ display: 'flex', marginBottom: 24, background: '#0d1117', borderRadius: 10, padding: 4 }}>
              {(['create', 'join'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(''); }}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: tab === t ? '#21262d' : 'transparent',
                    color: tab === t ? '#fff' : '#8b949e',
                    fontWeight: tab === t ? 600 : 400,
                    fontSize: 14, transition: 'all 0.2s',
                  }}
                >
                  {t === 'create' ? '🎰 New Game' : '🎯 Join Game'}
                </button>
              ))}
            </div>

            {/* Name input */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: '#8b949e', fontSize: 13, marginBottom: 6, textAlign: 'left' }}>
                Your Name
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. poker_ace"
                maxLength={20}
                onKeyDown={e => e.key === 'Enter' && (tab === 'create' ? createGame() : joinGame())}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 15,
                  background: '#0d1117', border: '1px solid #30363d', color: '#fff',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Code input (join only) */}
            {tab === 'join' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', color: '#8b949e', fontSize: 13, marginBottom: 6, textAlign: 'left' }}>
                  Access Code
                </label>
                <input
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABCD12"
                  maxLength={6}
                  onKeyDown={e => e.key === 'Enter' && joinGame()}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8, fontSize: 18,
                    background: '#0d1117', border: '1px solid #30363d', color: '#f1c40f',
                    outline: 'none', letterSpacing: 4, textAlign: 'center', fontWeight: 700,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#e74c3c', marginBottom: 14 }}>
                {error}
              </div>
            )}

            <button
              onClick={tab === 'create' ? createGame : joinGame}
              disabled={loading}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                background: loading ? '#21262d' : (tab === 'create' ? '#2ea043' : '#1f6feb'),
                color: '#fff', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Loading...' : tab === 'create' ? '🚀 Create Game' : '🎯 Join Game'}
            </button>
          </div>

          {/* Features */}
          <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['🎮', 'Up to 8 players'],
              ['⚡', 'Real-time updates'],
              ['💬', 'In-game chat'],
              ['🆓', 'Free, no signup'],
              [Von Noah G. für Info]
            ].map(([icon, text]) => (
              <div key={text} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 10, padding: '10px 14px', color: '#8b949e', fontSize: 13 }}>
                {icon} {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
