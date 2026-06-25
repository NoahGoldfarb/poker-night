// lib/poker.ts - Complete Texas Hold'em poker engine

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  hidden?: boolean;
}

export type GamePhase = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';
export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'allin';

export interface Player {
  id: string;
  name: string;
  chips: number;
  cards: Card[];
  bet: number;
  totalBet: number;
  folded: boolean;
  allin: boolean;
  isActive: boolean;
  seatIndex: number;
  isReady: boolean;
  lastAction?: PlayerAction;
  handRank?: number;
  handName?: string;
}

export interface ChatMessage {
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface GameState {
  gameId: string;
  accessCode: string;
  phase: GamePhase;
  players: Player[];
  communityCards: Card[];
  // FIX: deck is stored in state so all streets draw from the same shuffled deck
  deck: Card[];
  chatMessages: ChatMessage[];
  pot: number;
  sidePots: { amount: number; eligiblePlayers: string[] }[];
  currentPlayerIndex: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  smallBlind: number;
  bigBlind: number;
  currentBet: number;
  minRaise: number;
  round: number;
  winners?: { playerId: string; amount: number; handName: string }[];
  lastAction?: { playerId: string; action: PlayerAction; amount?: number };
  createdAt: number;
  updatedAt: number;
}

const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

// Hand evaluation
const HAND_RANKS = {
  ROYAL_FLUSH: 9,
  STRAIGHT_FLUSH: 8,
  FOUR_OF_A_KIND: 7,
  FULL_HOUSE: 6,
  FLUSH: 5,
  STRAIGHT: 4,
  THREE_OF_A_KIND: 3,
  TWO_PAIR: 2,
  ONE_PAIR: 1,
  HIGH_CARD: 0,
};

const HAND_NAMES: Record<number, string> = {
  9: 'Royal Flush',
  8: 'Straight Flush',
  7: 'Four of a Kind',
  6: 'Full House',
  5: 'Flush',
  4: 'Straight',
  3: 'Three of a Kind',
  2: 'Two Pair',
  1: 'One Pair',
  0: 'High Card',
};

function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = getCombinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = getCombinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function evaluateFiveCards(cards: Card[]): { rank: number; name: string; value: number[] } {
  const ranks = cards.map(c => RANK_VALUES[c.rank]).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const rankCounts: Record<number, number> = {};
  ranks.forEach(r => { rankCounts[r] = (rankCounts[r] || 0) + 1; });

  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const uniqueRanks = Object.keys(rankCounts).map(Number).sort((a, b) => b - a);

  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = uniqueRanks.length === 5 && (ranks[0] - ranks[4] === 4);
  const isLowAceStraight = uniqueRanks.length === 5 &&
    JSON.stringify(ranks) === JSON.stringify([14, 5, 4, 3, 2]);

  if (isFlush && isStraight && ranks[0] === 14) {
    return { rank: HAND_RANKS.ROYAL_FLUSH, name: 'Royal Flush', value: ranks };
  }
  if (isFlush && (isStraight || isLowAceStraight)) {
    return { rank: HAND_RANKS.STRAIGHT_FLUSH, name: 'Straight Flush', value: ranks };
  }
  if (counts[0] === 4) {
    return { rank: HAND_RANKS.FOUR_OF_A_KIND, name: 'Four of a Kind', value: ranks };
  }
  if (counts[0] === 3 && counts[1] === 2) {
    return { rank: HAND_RANKS.FULL_HOUSE, name: 'Full House', value: ranks };
  }
  if (isFlush) {
    return { rank: HAND_RANKS.FLUSH, name: 'Flush', value: ranks };
  }
  if (isStraight || isLowAceStraight) {
    return { rank: HAND_RANKS.STRAIGHT, name: 'Straight', value: ranks };
  }
  if (counts[0] === 3) {
    return { rank: HAND_RANKS.THREE_OF_A_KIND, name: 'Three of a Kind', value: ranks };
  }
  if (counts[0] === 2 && counts[1] === 2) {
    return { rank: HAND_RANKS.TWO_PAIR, name: 'Two Pair', value: ranks };
  }
  if (counts[0] === 2) {
    return { rank: HAND_RANKS.ONE_PAIR, name: 'One Pair', value: ranks };
  }
  return { rank: HAND_RANKS.HIGH_CARD, name: 'High Card', value: ranks };
}

export function getBestHand(holeCards: Card[], communityCards: Card[]): { rank: number; name: string; value: number[] } {
  const allCards = [...holeCards, ...communityCards];
  const combos = getCombinations(allCards, 5);
  let best = { rank: -1, name: '', value: [] as number[] };

  for (const combo of combos) {
    const result = evaluateFiveCards(combo);
    if (result.rank > best.rank ||
      (result.rank === best.rank && compareArrays(result.value, best.value) > 0)) {
      best = result;
    }
  }
  return best;
}

function compareArrays(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function determineWinners(players: Player[], communityCards: Card[]): {
  playerId: string; amount: number; handName: string
}[] {
  const activePlayers = players.filter(p => !p.folded && p.cards.length > 0);

  if (activePlayers.length === 1) {
    const totalPot = players.reduce((sum, p) => sum + p.totalBet, 0);
    return [{ playerId: activePlayers[0].id, amount: totalPot, handName: 'Last player standing' }];
  }

  const hands = activePlayers.map(p => ({
    player: p,
    hand: getBestHand(p.cards, communityCards),
  }));

  hands.sort((a, b) => {
    if (a.hand.rank !== b.hand.rank) return b.hand.rank - a.hand.rank;
    return compareArrays(b.hand.value, a.hand.value);
  });

  const totalPot = players.reduce((sum, p) => sum + p.totalBet, 0);

  // Handle ties: split pot among all players with the same best hand
  const bestRank = hands[0].hand.rank;
  const bestValue = hands[0].hand.value;
  const tiedWinners = hands.filter(
    h => h.hand.rank === bestRank && compareArrays(h.hand.value, bestValue) === 0
  );

  if (tiedWinners.length > 1) {
    const share = Math.floor(totalPot / tiedWinners.length);
    return tiedWinners.map(w => ({
      playerId: w.player.id,
      amount: share,
      handName: w.hand.name + ' (split)',
    }));
  }

  return [{
    playerId: hands[0].player.id,
    amount: totalPot,
    handName: hands[0].hand.name,
  }];
}

export function createInitialGameState(gameId: string, accessCode: string): GameState {
  return {
    gameId,
    accessCode,
    phase: 'waiting',
    players: [],
    communityCards: [],
    deck: [],
    chatMessages: [],
    pot: 0,
    sidePots: [],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    smallBlindIndex: 1,
    bigBlindIndex: 2,
    smallBlind: 25,
    bigBlind: 50,
    currentBet: 0,
    minRaise: 50,
    round: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function startNewRound(state: GameState): GameState {
  // FIX: no direct mutation of state — work on filtered copy
  const activePlayers = state.players.filter(p => p.chips > 0);

  if (activePlayers.length < 2) return state;

  // FIX: shuffle ONE deck for the entire round and store it in state
  const deck = createDeck();
  // Deal 2 cards per active player, burn 1 before each street (standard dealing)
  // We just use the first N*2 cards for hole cards and indices 10+ for community
  let deckIdx = 0;

  const dealerIndex = (state.dealerIndex + 1) % activePlayers.length;
  const sbIndex = (dealerIndex + 1) % activePlayers.length;
  const bbIndex = (dealerIndex + 2) % activePlayers.length;

  // Rebuild players from activePlayers (removes broke players)
  const players = activePlayers.map(p => ({
    ...p,
    cards: [
      { ...deck[deckIdx++] },
      { ...deck[deckIdx++] },
    ],
    bet: 0,
    totalBet: 0,
    folded: false,
    allin: false,
    lastAction: undefined as PlayerAction | undefined,
    handRank: undefined as number | undefined,
    handName: undefined as string | undefined,
  }));

  // Post blinds
  const sbAmount = Math.min(state.smallBlind, players[sbIndex].chips);
  players[sbIndex].chips -= sbAmount;
  players[sbIndex].bet = sbAmount;
  players[sbIndex].totalBet = sbAmount;
  if (players[sbIndex].chips === 0) players[sbIndex].allin = true;

  const bbAmount = Math.min(state.bigBlind, players[bbIndex].chips);
  players[bbIndex].chips -= bbAmount;
  players[bbIndex].bet = bbAmount;
  players[bbIndex].totalBet = bbAmount;
  if (players[bbIndex].chips === 0) players[bbIndex].allin = true;

  const firstToAct = (bbIndex + 1) % players.length;

  // FIX: store remaining deck starting at community card position (after hole cards dealt)
  // Community cards: flop at deckIdx, deckIdx+1, deckIdx+2; turn at deckIdx+3; river at deckIdx+4
  const remainingDeck = deck.slice(deckIdx);

  return {
    ...state,
    phase: 'preflop',
    players,
    communityCards: [],
    deck: remainingDeck,
    pot: sbAmount + bbAmount,
    sidePots: [],
    currentPlayerIndex: firstToAct,
    dealerIndex,
    smallBlindIndex: sbIndex,
    bigBlindIndex: bbIndex,
    currentBet: state.bigBlind,
    minRaise: state.bigBlind * 2,
    round: state.round + 1,
    winners: undefined,
    updatedAt: Date.now(),
  };
}

export function processAction(
  state: GameState,
  playerId: string,
  action: PlayerAction,
  raiseAmount?: number
): GameState {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || playerIndex !== state.currentPlayerIndex) return state;

  const players = state.players.map(p => ({ ...p }));
  const player = players[playerIndex];
  let pot = state.pot;
  let currentBet = state.currentBet;
  let minRaise = state.minRaise;

  switch (action) {
    case 'fold':
      player.folded = true;
      player.lastAction = 'fold';
      break;

    case 'check':
      if (state.currentBet > player.bet) return state;
      player.lastAction = 'check';
      break;

    case 'call': {
      const callAmount = Math.min(state.currentBet - player.bet, player.chips);
      player.chips -= callAmount;
      player.bet += callAmount;
      player.totalBet += callAmount;
      pot += callAmount;
      player.lastAction = 'call';
      if (player.chips === 0) player.allin = true;
      break;
    }

    case 'raise': {
      const amount = raiseAmount || state.minRaise;
      const additionalNeeded = amount - player.bet;
      const actualAdditional = Math.min(additionalNeeded, player.chips);
      player.chips -= actualAdditional;
      player.bet += actualAdditional;
      player.totalBet += actualAdditional;
      pot += actualAdditional;
      currentBet = player.bet;
      minRaise = Math.max(state.bigBlind, amount - state.currentBet) + amount;
      player.lastAction = 'raise';
      if (player.chips === 0) player.allin = true;
      break;
    }

    case 'allin': {
      const allInAmount = player.chips;
      player.chips = 0;
      player.bet += allInAmount;
      player.totalBet += allInAmount;
      pot += allInAmount;
      if (player.bet > currentBet) {
        currentBet = player.bet;
        minRaise = player.bet - state.currentBet + player.bet;
      }
      player.allin = true;
      player.lastAction = 'allin';
      break;
    }
  }

  const updatedState = {
    ...state,
    players,
    pot,
    currentBet,
    minRaise,
    lastAction: { playerId, action, amount: raiseAmount },
    updatedAt: Date.now(),
  };

  // Check if we should advance the phase
  if (shouldAdvancePhase(players, currentBet, state.bigBlindIndex, state.phase, action)) {
    return advancePhase(updatedState);
  }

  // Find next active player
  let nextIndex = playerIndex;
  let attempts = 0;
  do {
    nextIndex = (nextIndex + 1) % players.length;
    attempts++;
    if (attempts > players.length) {
      return advancePhase(updatedState);
    }
  } while (players[nextIndex].folded || players[nextIndex].allin);

  return { ...updatedState, currentPlayerIndex: nextIndex };
}

function shouldAdvancePhase(
  players: Player[],
  currentBet: number,
  bbIndex: number,
  phase: GamePhase,
  lastAction: PlayerAction
): boolean {
  const activePlayers = players.filter(p => !p.folded);
  if (activePlayers.length <= 1) return true;

  const canActPlayers = activePlayers.filter(p => !p.allin);
  if (canActPlayers.length === 0) return true;

  // Everyone must have acted AND all bets must be equal
  const allBetsEqual = canActPlayers.every(p => p.bet === currentBet);
  const allHaveActed = canActPlayers.every(p => p.lastAction !== undefined);

  // FIX: in preflop, BB gets to act even if everyone just called
  // This is handled naturally: BB's lastAction is undefined until they act,
  // so allHaveActed will be false until BB acts.

  return allBetsEqual && allHaveActed;
}

function advancePhase(state: GameState): GameState {
  const activePlayers = state.players.filter(p => !p.folded);

  if (activePlayers.length <= 1) {
    return finishRound(state);
  }

  const phaseOrder: GamePhase[] = ['preflop', 'flop', 'turn', 'river'];
  const currentPhaseIndex = phaseOrder.indexOf(state.phase);

  // FIX: river is the last betting phase — after river betting ends, go to showdown
  if (currentPhaseIndex === -1 || currentPhaseIndex >= phaseOrder.length - 1) {
    return finishRound(state);
  }

  const nextPhase = phaseOrder[currentPhaseIndex + 1];

  // FIX: draw community cards from the stored deck, not a new random deck
  const deck = state.deck;
  let communityCards = [...state.communityCards];

  if (nextPhase === 'flop') {
    communityCards = [deck[0], deck[1], deck[2]];
  } else if (nextPhase === 'turn') {
    communityCards = [...communityCards, deck[3]];
  } else if (nextPhase === 'river') {
    communityCards = [...communityCards, deck[4]];
  }

  const players = state.players.map(p => ({
    ...p,
    bet: 0,
    lastAction: undefined as PlayerAction | undefined,
  }));

  // First to act post-flop: first active non-folded, non-allin player after dealer
  const dealerIdx = state.dealerIndex;
  let firstActiveIndex = -1;
  for (let i = 1; i <= players.length; i++) {
    const idx = (dealerIdx + i) % players.length;
    if (!players[idx].folded && !players[idx].allin) {
      firstActiveIndex = idx;
      break;
    }
  }

  return {
    ...state,
    phase: nextPhase,
    communityCards,
    players,
    currentBet: 0,
    minRaise: state.bigBlind,
    currentPlayerIndex: firstActiveIndex >= 0 ? firstActiveIndex : 0,
    updatedAt: Date.now(),
  };
}

function finishRound(state: GameState): GameState {
  const winners = determineWinners(state.players, state.communityCards);

  const players = state.players.map(p => {
    const win = winners.find(w => w.playerId === p.id);
    const hand = !p.folded && p.cards.length > 0
      ? getBestHand(p.cards, state.communityCards)
      : null;
    return {
      ...p,
      chips: p.chips + (win ? win.amount : 0),
      handName: hand?.name,
      handRank: hand?.rank,
    };
  });

  return {
    ...state,
    phase: 'showdown',
    players,
    winners,
    updatedAt: Date.now(),
  };
}

export { HAND_NAMES };
