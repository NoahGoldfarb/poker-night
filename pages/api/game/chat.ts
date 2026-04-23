// pages/api/game/chat.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getRedis, gameKey, GAME_TTL } from '../../../lib/redis';
import type { GameState } from '../../../lib/poker';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { gameId, playerId, message } = req.body;
  if (!gameId || !playerId || !message?.trim()) {
    return res.status(400).json({ error: 'Missing params' });
  }

  const redis = getRedis();
  const raw = await redis.get<string>(gameKey(gameId));
  if (!raw) return res.status(404).json({ error: 'Game not found' });

  const state: GameState = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const player = state.players.find(p => p.id === playerId);
  if (!player) return res.status(403).json({ error: 'Not in game' });

  state.chatMessages.push({
    playerId,
    playerName: player.name,
    message: message.trim().slice(0, 200),
    timestamp: Date.now(),
  });

  if (state.chatMessages.length > 50) {
    state.chatMessages = state.chatMessages.slice(-50);
  }

  state.updatedAt = Date.now();
  await redis.setex(gameKey(gameId), GAME_TTL, JSON.stringify(state));
  res.json({ success: true });
}
