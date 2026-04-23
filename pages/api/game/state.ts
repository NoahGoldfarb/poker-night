// pages/api/game/state.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getRedis, gameKey } from '../../../lib/redis';
import type { GameState, Card } from '../../../lib/poker';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { gameId, playerId } = req.query;
  if (!gameId || !playerId) return res.status(400).json({ error: 'Missing params' });

  const redis = getRedis();
  const raw = await redis.get<string>(gameKey(gameId as string));
  if (!raw) return res.status(404).json({ error: 'Game not found' });

  const state: GameState = typeof raw === 'string' ? JSON.parse(raw) : raw;

  // Hide other players' cards unless showdown
  const sanitized: GameState = {
    ...state,
    players: state.players.map(p => {
      if (p.id === playerId || state.phase === 'showdown') {
        return p;
      }
      return {
        ...p,
        cards: p.cards.map(() => ({ suit: 'spades', rank: '2', hidden: true } as Card)),
      };
    }),
  };

  res.setHeader('Cache-Control', 'no-store');
  res.json(sanitized);
}
