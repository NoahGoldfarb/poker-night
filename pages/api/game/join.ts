// pages/api/game/join.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { getRedis, gameKey, codeKey, GAME_TTL } from '../../../lib/redis';
import type { GameState } from '../../../lib/poker';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { accessCode, playerName } = req.body;
  if (!accessCode?.trim() || !playerName?.trim()) {
    return res.status(400).json({ error: 'Code and name required' });
  }

  const redis = getRedis();
  const code = accessCode.trim().toUpperCase();
  const gameId = await redis.get<string>(codeKey(code));
  
  if (!gameId) return res.status(404).json({ error: 'Game not found. Check your code.' });

  const raw = await redis.get<string>(gameKey(gameId));
  if (!raw) return res.status(404).json({ error: 'Game expired' });

  const state: GameState = typeof raw === 'string' ? JSON.parse(raw) : raw;
  
  if (state.phase !== 'waiting' && state.phase !== 'showdown') {
    return res.status(400).json({ error: 'Game already in progress' });
  }
  
  if (state.players.length >= 8) {
    return res.status(400).json({ error: 'Game is full (max 8 players)' });
  }

  const playerId = uuidv4();
  const seatIndex = state.players.length;

  state.players.push({
    id: playerId,
    name: playerName.trim().slice(0, 20),
    chips: 1000,
    cards: [],
    bet: 0,
    totalBet: 0,
    folded: false,
    allin: false,
    isActive: true,
    seatIndex,
    isReady: false,
  });

  state.chatMessages.push({
    playerId: 'system',
    playerName: 'System',
    message: `${playerName.trim()} joined the game`,
    timestamp: Date.now(),
    isSystem: true,
  });

  state.updatedAt = Date.now();

  await redis.setex(gameKey(gameId), GAME_TTL, JSON.stringify(state));

  res.json({ gameId, playerId, accessCode: code });
}
