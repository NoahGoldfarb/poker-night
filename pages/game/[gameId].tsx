// pages/game/[gameId].tsx
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import type { GameState, Player, Card, PlayerAction } from '../../lib/poker';

const SUIT_SYMBOLS: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const SUIT_COLORS: Record<string, string> = {
  spades: '#1a1a2e',
  hearts: '#c0392b',
  diamonds: '#c0392b',
  clubs: '#1a1a2e',
};

function CardComponent({ card, size = 'md' }: { card: Card; size?: 'sm' | 'md' | 'lg' }) {
  const w = size === 'sm' ? 36 : size === 'md' ? 52 : 72;
  const h = size === 'sm' ? 50 : size === 'md' ? 72 : 100;
  const fs = size === 'sm' ? 10 : size === 'md' ? 14 : 20;

  if (card.hidden) {
    return (
      <div style={{
        width: w, height: h, borderRadius: 8, background: 'linear-gradient(135deg, #1a472a 0%, #2d7a4f 50%, #1a472a 100%)',
        border: '2px solid #4a9d6f', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: fs + 4, opacity: 0.5 }}>🂠</span>
      </div>
    );
  }

  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];

  return (
    <div style={{
      width: w, height: h, borderRadius: 8, background: '#fff',
      border: '2px solid #ddd', display: 'flex', flexDirection: 'column',
      padding: '3px 4px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      flexShrink: 0, position: 'relative',
    }}>
      <div style={{ fontSize: fs, fontWeight: 700, color, lineHeight: 1 }}>{card.rank}</div>
      <div style={{ fontSize: fs, color, lineHeight: 1 }}>{symbol}</div>
      <div style={{
        position: 'absolute', bottom: 3, right: 4, fontSize: fs,
        fontWeight: 700, color, transform: 'rotate(180deg)', lineHeight: 1,
      }}>
        {card.rank}
      </div>
      <div style={{
        position: 'absolute', fontSize: fs * 1.8, color,
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        opacity: 0.15, pointerEvents: 'none',
      }}>
        {symbol}
      </div>
    </div>
  );
}

function PlayerSeat({ player, isMe, isCurrentTurn, dealerIndex, sbIndex, bbIndex }: {
  player: Player; isMe: boolean; isCurrentTurn: boolean;
  dealerIndex: number; sbIndex: number; bbIndex: number;
}) {
  const isDealer = player.seatIndex === dealerIndex;
  const isSB = player.seatIndex === sbIndex;
  const isBB = player.seatIndex === bbIndex;

  return (
    <div style={{
      background: isMe ? 'rgba(74, 157, 111, 0.15)' : 'rgba(255,255,255,0.05)',
      border: isCurrentTurn
        ? '2px solid #f39c12'
        : isMe ? '2px solid #4a9d6f' : '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: '10px 14px', minWidth: 140,
      opacity: player.folded ? 0.4 : 1,
      position: 'relative',
      transition: 'all 0.3s',
      boxShadow: isCurrentTurn ? '0 0 20px rgba(243,156,18,0.4)' : 'none',
    }}>
      {/* Badges */}
      <div style={{ position: 'absolute', top: -10, left: 8, display: 'flex', gap: 4 }}>
        {isDealer && <span style={{ background: '#fff', color: '#000', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>D</span>}
        {isSB && <span style={{ background: '#3498db', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>SB</span>}
        {isBB && <span style={{ background: '#e74c3c', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>BB</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `hsl(${player.name.charCodeAt(0) * 7 % 360}, 60%, 50%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {player.name[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {player.name} {isMe && '(You)'}
          </div>
          <div style={{ fontSize: 11, color: '#f1c40f' }}>
            ${player.chips.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {player.cards.length > 0 ? player.cards.map((card, i) => (
          <CardComponent key={i} card={card} size="sm" />
        )) : (
          <div style={{ width: 36, height: 50, borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)' }} />
        )}
      </div>

      {/* Status */}
      <div style={{ fontSize: 11, color: '#aaa' }}>
        {player.folded ? '🚫 Folded' :
          player.allin ? '💥 All-In' :
          player.bet > 0 ? `Bet: $${player.bet}` :
          player.lastAction ? player.lastAction : 'Waiting...'}
      </div>

      {player.handName && (
        <div style={{ fontSize: 10, color: '#f39c12', marginTop: 2 }}>
          ✨ {player.handName}
        </div>
      )}
    </div>
  );
}

export default function GamePage() {
  const router = useRouter();
  const { gameId } = router.query;
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState('');
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout>();
  const lastUpdatedRef = useRef(0);

  useEffect(() => {
    const pid = localStorage.getItem(`poker_player_${gameId}`);
    if (!pid) { router.push('/'); return; }
    setPlayerId(pid);
  }, [gameId, router]);

  const fetchState = useCallback(async () => {
    if (!gameId || !playerId) return;
    try {
      const res = await fetch(`/api/game/state?gameId=${gameId}&playerId=${playerId}`);
      if (!res.ok) { router.push('/'); return; }
      const data = await res.json();
      if (data.updatedAt !== lastUpdatedRef.current) {
        lastUpdatedRef.current = data.updatedAt;
        setState(data);
        setRaiseAmount(data.minRaise || data.bigBlind * 2);
      }
    } catch {}
  }, [gameId, playerId, router]);

  useEffect(() => {
    if (!playerId || !gameId) return;
    fetchState();
    pollRef.current = setInterval(fetchState, 1500);
    return () => clearInterval(pollRef.current);
  }, [fetchState, playerId, gameId]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [state?.chatMessages.length]);

  const doAction = async (action: PlayerAction, amount?: number) => {
    if (!state || !playerId || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId, action, amount }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Action failed');
      else { setState(data.state); lastUpdatedRef.current = data.state.updatedAt; }
    } catch { setError('Network error'); }
    setLoading(false);
  };

  const startGame = async () => {
    if (!playerId || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, playerId }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Failed to start');
    } catch { setError('Network error'); }
    setLoading(false);
    fetchState();
  };

  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !playerId) return;
    const msg = chatInput;
    setChatInput('');
    await fetch('/api/game/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, playerId, message: msg }),
    });
    fetchState();
  };

  if (!state) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', fontSize: 18 }}>Loading table...</div>
      </div>
    );
  }

  const me = state.players.find(p => p.id === playerId);
  const isMyTurn = state.players[state.currentPlayerIndex]?.id === playerId;
  const isHost = state.players[0]?.id === playerId;
  const canCheck = isMyTurn && state.currentBet <= (me?.bet || 0);
  const canCall = isMyTurn && state.currentBet > (me?.bet || 0);
  const callAmount = state.currentBet - (me?.bet || 0);

  return (
    <>
      <Head>
        <title>Poker — {state.accessCode}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ minHeight: '100vh', background: '#0d1117', color: '#fff', fontFamily: "'Segoe UI', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ background: '#161b22', borderBottom: '1px solid #30363d', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 22 }}>🃏</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Texas Hold'em</div>
              <div style={{ fontSize: 12, color: '#8b949e' }}>Round {state.round} • Blinds {state.smallBlind}/{state.bigBlind}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#21262d', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: '#8b949e' }}>
              Code: <span style={{ color: '#f1c40f', fontWeight: 700, letterSpacing: 2 }}>{state.accessCode}</span>
            </div>
            <div style={{ background: phase_color(state.phase), borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: '#fff' }}>
              {state.phase.toUpperCase()}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Main table */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
            
            {/* Pot */}
            <div style={{ textAlign: 'center', padding: '16px 0 8px', fontSize: 20, fontWeight: 700 }}>
              <span style={{ background: 'rgba(241,196,15,0.1)', border: '1px solid rgba(241,196,15,0.3)', borderRadius: 20, padding: '6px 20px', color: '#f1c40f' }}>
                Pot: ${state.pot.toLocaleString()}
              </span>
            </div>

            {/* Community cards */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, padding: '12px 20px', minHeight: 90 }}>
              {state.communityCards.map((card, i) => (
                <CardComponent key={i} card={card} size="lg" />
              ))}
              {Array.from({ length: 5 - state.communityCards.length }).map((_, i) => (
                <div key={i} style={{ width: 72, height: 100, borderRadius: 8, border: '2px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }} />
              ))}
            </div>

            {/* Winners */}
            {state.winners && state.winners.length > 0 && (
              <div style={{ textAlign: 'center', margin: '8px auto', background: 'rgba(46,160,67,0.15)', border: '1px solid #2ea043', borderRadius: 12, padding: '12px 24px' }}>
                {state.winners.map(w => {
                  const wp = state.players.find(p => p.id === w.playerId);
                  return (
                    <div key={w.playerId} style={{ fontSize: 16, fontWeight: 600 }}>
                      🏆 {wp?.name} wins ${w.amount} with {w.handName}!
                    </div>
                  );
                })}
              </div>
            )}

            {error && (
              <div style={{ textAlign: 'center', margin: '0 20px', background: 'rgba(231,76,60,0.15)', border: '1px solid #e74c3c', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#e74c3c' }}
                onClick={() => setError('')}>
                ⚠ {error} (click to dismiss)
              </div>
            )}

            {/* Players */}
            <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              {state.players.map((player, i) => (
                <PlayerSeat
                  key={player.id}
                  player={player}
                  isMe={player.id === playerId}
                  isCurrentTurn={i === state.currentPlayerIndex && state.phase !== 'waiting' && state.phase !== 'showdown'}
                  dealerIndex={state.dealerIndex}
                  sbIndex={state.smallBlindIndex}
                  bbIndex={state.bigBlindIndex}
                />
              ))}
            </div>

            {/* My cards (larger) */}
            {me && me.cards.length > 0 && (
              <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 8 }}>Your Hand</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
                  {me.cards.map((card, i) => <CardComponent key={i} card={card} size="lg" />)}
                </div>
                {me.handName && <div style={{ marginTop: 8, color: '#f39c12', fontWeight: 600 }}>✨ {me.handName}</div>}
              </div>
            )}

            {/* Actions */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #30363d', marginTop: 'auto' }}>
              
              {state.phase === 'waiting' && isHost && state.players.length >= 2 && (
                <div style={{ textAlign: 'center' }}>
                  <button onClick={startGame} disabled={loading} style={btnStyle('#2ea043')}>
                    ▶ Start Game ({state.players.length} players)
                  </button>
                </div>
              )}

              {state.phase === 'waiting' && !isHost && (
                <div style={{ textAlign: 'center', color: '#8b949e', fontSize: 14 }}>
                  Waiting for host to start... ({state.players.length}/8 players)
                </div>
              )}

              {state.phase === 'waiting' && isHost && state.players.length < 2 && (
                <div style={{ textAlign: 'center', color: '#8b949e', fontSize: 14 }}>
                  Share code <strong style={{ color: '#f1c40f' }}>{state.accessCode}</strong> — waiting for players...
                </div>
              )}

              {state.phase === 'showdown' && isHost && (
                <div style={{ textAlign: 'center' }}>
                  <button onClick={startGame} disabled={loading} style={btnStyle('#3498db')}>
                    ▶ Next Round
                  </button>
                </div>
              )}

              {isMyTurn && !me?.folded && !me?.allin && state.phase !== 'waiting' && state.phase !== 'showdown' && (
                <div>
                  <div style={{ fontSize: 13, color: '#f39c12', textAlign: 'center', marginBottom: 12, fontWeight: 600 }}>
                    ⏰ Your turn!
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 }}>
                    <button onClick={() => doAction('fold')} disabled={loading} style={btnStyle('#e74c3c', 'sm')}>
                      🚫 Fold
                    </button>
                    {canCheck && (
                      <button onClick={() => doAction('check')} disabled={loading} style={btnStyle('#7f8c8d', 'sm')}>
                        ✅ Check
                      </button>
                    )}
                    {canCall && (
                      <button onClick={() => doAction('call')} disabled={loading} style={btnStyle('#3498db', 'sm')}>
                        📞 Call ${Math.min(callAmount, me?.chips || 0)}
                      </button>
                    )}
                    <button onClick={() => doAction('raise', raiseAmount)} disabled={loading || raiseAmount > (me?.chips || 0) + (me?.bet || 0)} style={btnStyle('#f39c12', 'sm')}>
                      📈 Raise to ${raiseAmount}
                    </button>
                    <button onClick={() => doAction('allin')} disabled={loading} style={btnStyle('#9b59b6', 'sm')}>
                      💥 All-In ${me?.chips}
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 320, margin: '0 auto' }}>
                    <input
                      type="range"
                      min={state.minRaise}
                      max={(me?.chips || 0) + (me?.bet || 0)}
                      value={raiseAmount}
                      onChange={e => setRaiseAmount(Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#f39c12' }}
                    />
                    <input
                      type="number"
                      value={raiseAmount}
                      onChange={e => setRaiseAmount(Number(e.target.value))}
                      min={state.minRaise}
                      max={(me?.chips || 0) + (me?.bet || 0)}
                      style={{ width: 70, background: '#21262d', border: '1px solid #30363d', borderRadius: 6, color: '#fff', padding: '4px 8px', fontSize: 13 }}
                    />
                  </div>
                </div>
              )}

              {!isMyTurn && state.phase !== 'waiting' && state.phase !== 'showdown' && (
                <div style={{ textAlign: 'center', color: '#8b949e', fontSize: 13 }}>
                  Waiting for <strong style={{ color: '#fff' }}>{state.players[state.currentPlayerIndex]?.name}</strong>...
                </div>
              )}
            </div>
          </div>

          {/* Chat sidebar */}
          <div style={{ width: 260, background: '#161b22', borderLeft: '1px solid #30363d', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #30363d', fontSize: 13, fontWeight: 600, color: '#8b949e' }}>
              💬 Chat
            </div>
            <div ref={chatRef} style={{ flex: 1, overflow: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {state.chatMessages.map((msg, i) => (
                <div key={i} style={{ fontSize: 12 }}>
                  {msg.isSystem ? (
                    <div style={{ color: '#8b949e', fontStyle: 'italic' }}>
                      {msg.message}
                    </div>
                  ) : (
                    <div>
                      <span style={{ color: `hsl(${msg.playerName.charCodeAt(0) * 7 % 360}, 60%, 60%)`, fontWeight: 600 }}>
                        {msg.playerName}:
                      </span>
                      <span style={{ color: '#e6edf3', marginLeft: 4 }}>{msg.message}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <form onSubmit={sendChat} style={{ padding: '10px 14px', borderTop: '1px solid #30363d', display: 'flex', gap: 6 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Message..."
                maxLength={200}
                style={{ flex: 1, background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, color: '#fff', padding: '6px 10px', fontSize: 12, outline: 'none' }}
              />
              <button type="submit" style={{ background: '#21262d', border: '1px solid #30363d', borderRadius: 6, color: '#fff', padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
                ↵
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

function phase_color(phase: string): string {
  const colors: Record<string, string> = {
    waiting: '#6e7681',
    preflop: '#1f6feb',
    flop: '#2ea043',
    turn: '#f78166',
    river: '#d29922',
    showdown: '#9b59b6',
    finished: '#6e7681',
  };
  return colors[phase] || '#6e7681';
}

function btnStyle(color: string, size?: 'sm'): React.CSSProperties {
  return {
    background: color,
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    padding: size === 'sm' ? '8px 14px' : '12px 24px',
    fontSize: size === 'sm' ? 13 : 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  };
}
