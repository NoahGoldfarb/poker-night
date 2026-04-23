// pages/api/game/start.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getRedis, gameKey, GAME_TTL } from '../../../lib/redis';
import type { GameState } from '../../../lib/poker';
import { startNewRound } from '../../../lib/poker';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { gameId, playerId } = req.body;
  if (!gameId || !playerId) return res.status(400).json({ error: 'Missing params' });

  const redis = getRedis();
  const raw = await redis.get<string>(gameKey(gameId));
  if (!raw) return res.status(404).json({ error: 'Game not found' });

  let state: GameState = typeof raw === 'string' ? JSON.parse(raw) : raw;
  
  // Only first player (host) can start
  if (state.players[0]?.id !== playerId) {
    return res.status(403).json({ error: 'Only the host can start the game' });
  }

  if (state.players.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 players' });
  }

  state = startNewRound(state);
  
  state.chatMessages.push({
    playerId: 'system',
    playerName: 'System',
    message: `Round ${state.round} started! Blinds: ${state.smallBlind}/${state.bigBlind}`,
    timestamp: Date.now(),
    isSystem: true,
  });

  await redis.setex(gameKey(gameId), GAME_TTL, JSON.stringify(state));
  res.json({ success: true });
}
