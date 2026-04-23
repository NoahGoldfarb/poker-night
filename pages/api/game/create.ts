// pages/api/game/create.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { getRedis, gameKey, codeKey, GAME_TTL } from '../../../lib/redis';
import { createInitialGameState } from '../../../lib/poker';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { playerName } = req.body;
  if (!playerName?.trim()) return res.status(400).json({ error: 'Name required' });

  const redis = getRedis();
  const gameId = uuidv4();
  const playerId = uuidv4();
  
  let accessCode = generateCode();
  // Ensure code is unique
  let attempts = 0;
  while (await redis.get(codeKey(accessCode)) && attempts < 10) {
    accessCode = generateCode();
    attempts++;
  }

  const state = createInitialGameState(gameId, accessCode);
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
    seatIndex: 0,
    isReady: false,
  });

  state.chatMessages.push({
    playerId: 'system',
    playerName: 'System',
    message: `${playerName.trim()} created the game`,
    timestamp: Date.now(),
    isSystem: true,
  });

  await redis.setex(gameKey(gameId), GAME_TTL, JSON.stringify(state));
  await redis.setex(codeKey(accessCode), GAME_TTL, gameId);

  res.json({ gameId, playerId, accessCode });
}
