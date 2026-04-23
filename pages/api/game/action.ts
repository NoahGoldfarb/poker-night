// pages/api/game/action.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getRedis, gameKey, GAME_TTL } from '../../../lib/redis';
import type { GameState, PlayerAction } from '../../../lib/poker';
import { processAction, startNewRound } from '../../../lib/poker';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { gameId, playerId, action, amount } = req.body;
  if (!gameId || !playerId || !action) return res.status(400).json({ error: 'Missing params' });

  const redis = getRedis();
  const raw = await redis.get<string>(gameKey(gameId));
  if (!raw) return res.status(404).json({ error: 'Game not found' });

  let state: GameState = typeof raw === 'string' ? JSON.parse(raw) : raw;

  if (state.phase === 'waiting' || state.phase === 'finished') {
    return res.status(400).json({ error: 'Game not in progress' });
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) {
    return res.status(400).json({ error: 'Not your turn' });
  }

  const actionNames: Record<PlayerAction, string> = {
    fold: 'folded',
    check: 'checked',
    call: `called ${state.currentBet}`,
    raise: `raised to ${amount || state.minRaise}`,
    allin: 'went all-in',
  };

  state = processAction(state, playerId, action as PlayerAction, amount);

  const player = state.players.find(p => p.id === playerId);
  state.chatMessages.push({
    playerId: 'system',
    playerName: 'System',
    message: `${player?.name} ${actionNames[action as PlayerAction]}`,
    timestamp: Date.now(),
    isSystem: true,
  });

  // Keep only last 50 messages
  if (state.chatMessages.length > 50) {
    state.chatMessages = state.chatMessages.slice(-50);
  }

  await redis.setex(gameKey(gameId), GAME_TTL, JSON.stringify(state));
  res.json({ success: true, state });
}
