/*
 * Heads‑Up Poker Trainer
 *
 * This script implements a simplified heads‑up no‑limit Texas Hold ’Em game.
 * It uses plain JavaScript and DOM manipulation so that it can run directly
 * in a browser.  The AI opponents model tendencies based on recent WSOP
 * champions.  After each hand, the game provides feedback on expected value
 * and deception.  This implementation focuses on core mechanics rather than
 * flashy graphics.
 */

(() => {
  // Utility functions for cards
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  // Map rank to numeric value for sorting (A high)
  const RANK_VALUES = {
    '2': 2,
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    'T': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14,
  };

  class Card {
    constructor(rank, suit) {
      this.rank = rank;
      this.suit = suit;
    }
    toString() {
      return this.rank + this.suit;
    }
  }

  class Deck {
    constructor() {
      this.cards = [];
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          this.cards.push(new Card(rank, suit));
        }
      }
    }
    shuffle() {
      // Fisher‑Yates shuffle
      for (let i = this.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
      }
    }
    deal() {
      return this.cards.pop();
    }
  }

  /**
   * Evaluate the strength of a 7‑card hand.
   * Returns an object with a category (0–8) and an array of kicker values for tie‑breaking.
   * 8: Straight flush, 7: Four of a kind, 6: Full house, 5: Flush, 4: Straight,
   * 3: Three of a kind, 2: Two pair, 1: One pair, 0: High card.
   */
  function evaluateHand(cards) {
      // Helper: sort cards descending by rank value
      const sorted = cards.slice().sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
      // Count occurrences of each rank
      const counts = {};
      for (const c of sorted) {
        counts[c.rank] = (counts[c.rank] || 0) + 1;
      }
      // Group by suit
      const suitsMap = { '♠': [], '♥': [], '♦': [], '♣': [] };
      for (const c of sorted) suitsMap[c.suit].push(c);
      // Precompute combinations of 5 cards from 7
      const combs = [];
      const n = sorted.length;
      for (let i = 0; i < n - 4; i++) {
        for (let j = i + 1; j < n - 3; j++) {
          for (let k = j + 1; k < n - 2; k++) {
            for (let l = k + 1; l < n - 1; l++) {
              for (let m = l + 1; m < n; m++) {
                combs.push([sorted[i], sorted[j], sorted[k], sorted[l], sorted[m]]);
              }
            }
          }
        }
      }
      // Evaluate each 5‑card combination and keep the best
      let best = { category: -1, values: [] };
      for (const hand of combs) {
        const evalResult = evaluate5(hand);
        if (evalResult.category > best.category) {
          best = evalResult;
        } else if (evalResult.category === best.category) {
          // Compare kickers lexicographically
          const a = evalResult.values;
          const b = best.values;
          let better = false;
          for (let i = 0; i < a.length; i++) {
            if (a[i] > b[i]) {
              better = true;
              break;
            } else if (a[i] < b[i]) {
              better = false;
              break;
            }
          }
          if (better) best = evalResult;
        }
      }
      return best;
  }

  /**
   * Evaluate a 5‑card hand. Returns {category, values} for tie breaks.
   * Straight flush > four of a kind > full house > flush > straight > three of a kind > two pair > one pair > high card.
   */
  function evaluate5(hand) {
    // Sort by rank descending
    hand = hand.slice().sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
    const counts = {};
    const suits = {};
    const values = hand.map(c => RANK_VALUES[c.rank]);
    for (const c of hand) {
      counts[c.rank] = (counts[c.rank] || 0) + 1;
      suits[c.suit] = (suits[c.suit] || 0) + 1;
    }
    // Detect flush
    const isFlush = Object.values(suits).some(cnt => cnt >= 5);
    // Detect straight (including wheel A-2-3-4-5)
    let isStraight = false;
    let straightHigh = 0;
    const uniqueRanks = [...new Set(values)];
    // Check sequences of five
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      let seq = true;
      for (let j = 0; j < 4; j++) {
        if (uniqueRanks[i + j] - 1 !== uniqueRanks[i + j + 1]) {
          seq = false;
          break;
        }
      }
      if (seq) {
        isStraight = true;
        straightHigh = uniqueRanks[i];
        break;
      }
    }
    // Wheel straight (A-5)
    if (!isStraight && uniqueRanks.includes(14) && uniqueRanks.includes(5) && uniqueRanks.includes(4) && uniqueRanks.includes(3) && uniqueRanks.includes(2)) {
      isStraight = true;
      straightHigh = 5;
    }
    // Straight flush
    if (isFlush && isStraight) {
      // Determine highest straight flush high card
      const flushSuit = Object.keys(suits).find(s => suits[s] >= 5);
      const flushCards = hand.filter(c => c.suit === flushSuit);
      const flushValues = flushCards.map(c => RANK_VALUES[c.rank]);
      const uniq = [...new Set(flushValues)].sort((a, b) => b - a);
      let found = false;
      let sfHigh = 0;
      // check for straight flush sequences
      for (let i = 0; i <= uniq.length - 5; i++) {
        let seq = true;
        for (let j = 0; j < 4; j++) {
          if (uniq[i + j] - 1 !== uniq[i + j + 1]) {
            seq = false;
            break;
          }
        }
        if (seq) {
          found = true;
          sfHigh = uniq[i];
          break;
        }
      }
      if (!found && uniq.includes(14) && uniq.includes(5) && uniq.includes(4) && uniq.includes(3) && uniq.includes(2)) {
        found = true;
        sfHigh = 5;
      }
      if (found) {
        return { category: 8, values: [sfHigh] };
      }
    }
    // Four of a kind
    const quadsRank = Object.keys(counts).find(r => counts[r] === 4);
    if (quadsRank) {
      const kicker = values.find(v => v !== RANK_VALUES[quadsRank]);
      return { category: 7, values: [RANK_VALUES[quadsRank], kicker] };
    }
    // Full house
    let tripsRank = null;
    let pairRank = null;
    for (const r of Object.keys(counts)) {
      if (counts[r] === 3) {
        if (!tripsRank || RANK_VALUES[r] > RANK_VALUES[tripsRank]) {
          tripsRank = r;
        }
      }
    }
    if (tripsRank) {
      for (const r of Object.keys(counts)) {
        if (r !== tripsRank && counts[r] >= 2) {
          if (!pairRank || RANK_VALUES[r] > RANK_VALUES[pairRank]) {
            pairRank = r;
          }
        }
      }
      if (pairRank) {
        return { category: 6, values: [RANK_VALUES[tripsRank], RANK_VALUES[pairRank]] };
      }
    }
    // Flush
    if (isFlush) {
      // return top five card ranks of flush
      const flushSuit = Object.keys(suits).find(s => suits[s] >= 5);
      const flushCards = hand.filter(c => c.suit === flushSuit).sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
      const top = flushCards.slice(0, 5).map(c => RANK_VALUES[c.rank]);
      return { category: 5, values: top };
    }
    // Straight
    if (isStraight) {
      return { category: 4, values: [straightHigh] };
    }
    // Three of a kind
    if (tripsRank) {
      // get kickers
      const kickers = [];
      for (const v of values) {
        if (v !== RANK_VALUES[tripsRank]) kickers.push(v);
      }
      const topKick = kickers.slice(0, 2);
      return { category: 3, values: [RANK_VALUES[tripsRank], ...topKick] };
    }
    // Two pair
    const pairs = [];
    for (const r of Object.keys(counts)) {
      if (counts[r] === 2) pairs.push(r);
    }
    if (pairs.length >= 2) {
      pairs.sort((a, b) => RANK_VALUES[b] - RANK_VALUES[a]);
      const highPair = RANK_VALUES[pairs[0]];
      const lowPair = RANK_VALUES[pairs[1]];
      // kicker
      const kickerVal = values.find(v => v !== highPair && v !== lowPair);
      return { category: 2, values: [highPair, lowPair, kickerVal] };
    }
    // One pair
    if (pairs.length === 1) {
      const pairVal = RANK_VALUES[pairs[0]];
      const kickers = values.filter(v => v !== pairVal).slice(0, 3);
      return { category: 1, values: [pairVal, ...kickers] };
    }
    // High card
    return { category: 0, values: values.slice(0, 5) };
  }

  /**
   * Compare two 7‑card hands. Returns 1 if handA is better, ‑1 if handB is better, 0 if tie.
   */
  function compareHands(handA, handB, board) {
    const cardsA = handA.concat(board);
    const cardsB = handB.concat(board);
    const evalA = evaluateHand(cardsA);
    const evalB = evaluateHand(cardsB);
    if (evalA.category > evalB.category) return 1;
    if (evalA.category < evalB.category) return -1;
    // Compare values lexicographically
    for (let i = 0; i < evalA.values.length; i++) {
      if (evalA.values[i] > evalB.values[i]) return 1;
      if (evalA.values[i] < evalB.values[i]) return -1;
    }
    return 0;
  }

  /**
   * Approximate equity of a hand vs random opponent given current board.
   * Performs Monte Carlo simulation by dealing random unknown cards.
   */
  function computeEquity(playerCards, knownBoard, deck, runs = 200) {
    let wins = 0;
    let ties = 0;
    const remaining = deck.cards.filter(c => !playerCards.includes(c) && !knownBoard.includes(c));
    for (let i = 0; i < runs; i++) {
      // Copy deck and shuffle remainder
      const available = remaining.slice();
      // Randomly choose opponent hole cards
      shuffleArray(available);
      const oppCards = [available[0], available[1]];
      // Build full board: fill missing community cards
      const board = knownBoard.slice();
      let j = 2;
      while (board.length < 5) {
        board.push(available[j]);
        j++;
      }
      const cmp = compareHands(playerCards, oppCards, board);
      if (cmp > 0) wins++;
      else if (cmp === 0) ties++;
    }
    return (wins + ties / 2) / runs;
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // DOM elements
  const setupDiv = document.getElementById('setup');
  const startBtn = document.getElementById('startBtn');
  const stackSelect = document.getElementById('stackSelect');
  const opponentSelect = document.getElementById('opponentSelect');
  const preMatchBlurb = document.getElementById('preMatchBlurb');
  const blurbText = document.getElementById('blurbText');
  const continueBtn = document.getElementById('continueBtn');
  const gameArea = document.getElementById('gameArea');
  const analysisArea = document.getElementById('analysisArea');
  const analysisContent = document.getElementById('analysisContent');
  const nextHandBtn = document.getElementById('nextHandBtn');
  const endScreen = document.getElementById('endScreen');
  const endTitle = document.getElementById('endTitle');
  const endMsg = document.getElementById('endMsg');
  const restartBtn = document.getElementById('restartBtn');
  const messageSpan = document.getElementById('message');
  const potAmountSpan = document.getElementById('potAmount');
  const communityDiv = document.getElementById('communityCards');
  const opponentCardsDiv = document.getElementById('opponentCards');
  const opponentStackDiv = document.getElementById('opponentStack');
  const playerCardsDiv = document.getElementById('playerCards');
  const playerStackDiv = document.getElementById('playerStack');
  const foldBtn = document.getElementById('foldBtn');
  const checkBtn = document.getElementById('checkBtn');
  const allInBtn = document.getElementById('allInBtn');
  const raiseRange = document.getElementById('raiseRange');
  const raiseValueSpan = document.getElementById('raiseValue');
  const confirmRaiseBtn = document.getElementById('confirmRaiseBtn');

  // Opponent blurbs mapping
  const opponentBlurbs = {
    tamayo: 'Aggressive Caller: plays many hands, calls down with top or middle pair and occasionally traps with strong hands.',
    weinman: 'Small‑ball Technician: prefers small pots, check‑raises and makes precise value bets.',
    jorstad: 'Tank Analyzer: deliberate decision making, values thin bets and may trap with disguised monsters.',
    aldemir: 'Value Hunter: raises strong hands for value, check‑raises draws and makes courageous calls.',
    salas: 'Short‑Stack Gladiator: push‑fold specialist; shoves wide when stacks are shallow.',
  };

  // Global game state
  let gameState = {};

  // Player structure: {cards: Card[], stack: number, currentBet: number, folded: boolean}

  startBtn.addEventListener('click', () => {
    const stackScenario = stackSelect.value;
    const oppType = opponentSelect.value;
    gameState.stackScenario = stackScenario;
    gameState.opponentType = oppType;
    // Show blurb
    blurbText.textContent = opponentBlurbs[oppType];
    setupDiv.classList.add('hidden');
    preMatchBlurb.classList.remove('hidden');
  });

  continueBtn.addEventListener('click', () => {
    preMatchBlurb.classList.add('hidden');
    gameArea.classList.remove('hidden');
    initGame();
  });

  nextHandBtn.addEventListener('click', () => {
    analysisArea.classList.add('hidden');
    if (gameState.player.stack <= 0 || gameState.opponent.stack <= 0) {
      // Show end screen
      showEnd();
    } else {
      startHand();
    }
  });

  restartBtn.addEventListener('click', () => {
    endScreen.classList.add('hidden');
    setupDiv.classList.remove('hidden');
  });

  // Action buttons
  foldBtn.addEventListener('click', () => {
    if (gameState.awaitingUser) {
      userAction('fold');
    }
  });
  checkBtn.addEventListener('click', () => {
    if (gameState.awaitingUser) {
      userAction('check');
    }
  });
  allInBtn.addEventListener('click', () => {
    if (gameState.awaitingUser) {
      userAction('allin');
    }
  });
  raiseRange.addEventListener('input', () => {
    raiseValueSpan.textContent = raiseRange.value;
  });
  confirmRaiseBtn.addEventListener('click', () => {
    if (gameState.awaitingUser) {
      userAction('raise', parseInt(raiseRange.value, 10));
    }
  });

  function initGame() {
    // Set initial stacks based on scenario
    const bb = 100; // big blind baseline
    gameState.bigBlind = bb;
    switch (gameState.stackScenario) {
      case 'short':
        gameState.playerStartStack = 20 * bb;
        gameState.opponentStartStack = 20 * bb;
        break;
      case 'equal':
        gameState.playerStartStack = 100 * bb;
        gameState.opponentStartStack = 100 * bb;
        break;
      case 'big':
        gameState.playerStartStack = 150 * bb;
        gameState.opponentStartStack = 50 * bb;
        break;
      default:
        gameState.playerStartStack = 100 * bb;
        gameState.opponentStartStack = 100 * bb;
    }
    // Initialize players
    gameState.player = { cards: [], stack: gameState.playerStartStack, currentBet: 0, folded: false };
    gameState.opponent = { cards: [], stack: gameState.opponentStartStack, currentBet: 0, folded: false };
    gameState.button = 'player'; // player begins on button; alternate each hand
    startHand();
  }

  function startHand() {
    // Reset board state
    gameState.deck = new Deck();
    gameState.deck.shuffle();
    gameState.board = [];
    gameState.player.cards = [gameState.deck.deal(), gameState.deck.deal()];
    gameState.opponent.cards = [gameState.deck.deal(), gameState.deck.deal()];
    gameState.player.currentBet = 0;
    gameState.opponent.currentBet = 0;
    gameState.player.folded = false;
    gameState.opponent.folded = false;
    gameState.pot = 0;
    // Swap button (dealer) each hand
    gameState.button = gameState.button === 'player' ? 'opponent' : 'player';
    // Post blinds
    postBlinds();
    updateDisplay();
    gameState.stage = 'preflop';
    gameState.actionLog = [];
    // Determine who acts first (small blind acts first pre‑flop)
    const firstToAct = (gameState.button === 'player') ? 'opponent' : 'player';
    gameState.turn = firstToAct;
    nextAction();
  }

  function postBlinds() {
    const sb = gameState.bigBlind / 2;
    if (gameState.button === 'player') {
      // Player posts small blind
      bet(gameState.player, sb);
      bet(gameState.opponent, gameState.bigBlind);
    } else {
      bet(gameState.opponent, sb);
      bet(gameState.player, gameState.bigBlind);
    }
  }

  function bet(playerObj, amount) {
    amount = Math.min(amount, playerObj.stack);
    playerObj.stack -= amount;
    playerObj.currentBet += amount;
    gameState.pot += amount;
  }

  function updateDisplay() {
    // Update stacks and pot
    potAmountSpan.textContent = gameState.pot.toString();
    playerStackDiv.textContent = `${gameState.player.stack} chips (${((gameState.player.stack / (gameState.player.stack + gameState.opponent.stack)) * 100).toFixed(1)}% | ${(gameState.player.stack / gameState.bigBlind).toFixed(1)} BB)`;
    opponentStackDiv.textContent = `${gameState.opponent.stack} chips (${((gameState.opponent.stack / (gameState.player.stack + gameState.opponent.stack)) * 100).toFixed(1)}% | ${(gameState.opponent.stack / gameState.bigBlind).toFixed(1)} BB)`;
    // Show player's cards
    playerCardsDiv.innerHTML = '';
    gameState.player.cards.forEach(c => {
      const div = document.createElement('div');
      div.className = 'cardItem';
      div.textContent = c.toString();
      playerCardsDiv.appendChild(div);
    });
    // Opponent cards hidden unless showdown
    opponentCardsDiv.innerHTML = '';
    if (gameState.stage === 'showdown' || gameState.opponent.folded) {
      gameState.opponent.cards.forEach(c => {
        const div = document.createElement('div');
        div.className = 'cardItem';
        div.textContent = c.toString();
        opponentCardsDiv.appendChild(div);
      });
      opponentCardsDiv.classList.remove('hidden');
    } else {
      // show card backs
      for (let i = 0; i < 2; i++) {
        const div = document.createElement('div');
        div.className = 'cardItem';
        div.textContent = '🂠';
        opponentCardsDiv.appendChild(div);
      }
      opponentCardsDiv.classList.remove('hidden');
    }
    // Community cards
    communityDiv.innerHTML = '';
    gameState.board.forEach(c => {
      const div = document.createElement('div');
      div.className = 'cardItem';
      div.textContent = c.toString();
      communityDiv.appendChild(div);
    });
    // Show/hide controls based on whose turn and stage
    foldBtn.disabled = !gameState.awaitingUser;
    checkBtn.disabled = !gameState.awaitingUser;
    allInBtn.disabled = !gameState.awaitingUser;
    confirmRaiseBtn.disabled = !gameState.awaitingUser;
    raiseRange.disabled = !gameState.awaitingUser;
    // Update raise slider max to player's remaining stack
    if (gameState.awaitingUser) {
      const maxRaise = gameState.player.stack;
      raiseRange.max = maxRaise.toString();
      raiseRange.min = '0';
      // Set default to min raise (to call difference)
      const callAmount = gameState.opponent.currentBet - gameState.player.currentBet;
      const minRaise = callAmount + gameState.bigBlind;
      raiseRange.value = Math.min(minRaise, maxRaise);
      raiseValueSpan.textContent = raiseRange.value;
    }
  }

  function nextAction() {
    // If someone has folded, go to showdown early
    if (gameState.player.folded || gameState.opponent.folded) {
      goToShowdown();
      return;
    }
    // If both players have matched bets and bets are equal, advance stage or switch action
    // Determine whose turn
    if (gameState.turn === 'player') {
      // player's turn
      gameState.awaitingUser = true;
      messageSpan.textContent = 'Your turn';
      updateDisplay();
    } else {
      // AI's turn
      gameState.awaitingUser = false;
      messageSpan.textContent = 'Opponent thinking...';
      updateDisplay();
      setTimeout(() => {
        aiAction();
      }, 500); // brief delay to simulate thinking
    }
  }

  function userAction(action, raiseAmount = 0) {
    gameState.awaitingUser = false;
    // Determine call amount difference
    const oppBet = gameState.opponent.currentBet;
    const myBet = gameState.player.currentBet;
    const toCall = Math.max(0, oppBet - myBet);
    let logEntry = { stage: gameState.stage, actor: 'player', action, bet: 0, pot: gameState.pot, board: gameState.board.slice(), cards: gameState.player.cards.slice() };
    if (action === 'fold') {
      gameState.player.folded = true;
      logEntry.bet = 0;
      gameState.actionLog.push(logEntry);
      goToShowdown();
      return;
    }
    if (action === 'check') {
      if (toCall > 0) {
        // call
        bet(gameState.player, toCall);
        logEntry.action = 'call';
        logEntry.bet = toCall;
      } else {
        logEntry.bet = 0;
      }
      gameState.actionLog.push(logEntry);
      advanceOrSwitch();
      return;
    }
    if (action === 'allin') {
      // Put all chips in; this is a raise if toCall>0
      const amount = gameState.player.stack;
      bet(gameState.player, amount);
      logEntry.bet = amount;
      logEntry.action = 'allin';
      gameState.actionLog.push(logEntry);
      if (toCall === 0) {
        gameState.turn = 'opponent';
        nextAction();
      } else {
        // Already call portion included in player's bet, we treat as raise
        gameState.turn = 'opponent';
        nextAction();
      }
      return;
    }
    if (action === 'raise') {
      // raiseAmount is total chips added in this action
      const callPart = toCall;
      const raisePart = raiseAmount;
      const totalBet = callPart + raisePart;
      bet(gameState.player, totalBet);
      logEntry.bet = totalBet;
      logEntry.action = 'raise';
      gameState.actionLog.push(logEntry);
      gameState.turn = 'opponent';
      nextAction();
      return;
    }
  }

  function advanceOrSwitch() {
    // After a call/check, if both bets equal, advance stage or switch turn
    if (gameState.player.currentBet === gameState.opponent.currentBet) {
      // Reset current bets
      gameState.player.currentBet = 0;
      gameState.opponent.currentBet = 0;
      // Advance stage
      if (gameState.stage === 'preflop') {
        dealFlop();
      } else if (gameState.stage === 'flop') {
        dealTurn();
      } else if (gameState.stage === 'turn') {
        dealRiver();
      } else if (gameState.stage === 'river') {
        goToShowdown();
      }
      // The first to act after flop is big blind (opposite of button)
      gameState.turn = (gameState.button === 'player') ? 'player' : 'opponent';
      nextAction();
    } else {
      // Switch turn to other player
      gameState.turn = gameState.turn === 'player' ? 'opponent' : 'player';
      nextAction();
    }
  }

  function dealFlop() {
    // Burn one card (ignored)
    gameState.deck.deal();
    gameState.board.push(gameState.deck.deal());
    gameState.board.push(gameState.deck.deal());
    gameState.board.push(gameState.deck.deal());
    gameState.stage = 'flop';
    messageSpan.textContent = 'Flop';
    updateDisplay();
  }
  function dealTurn() {
    gameState.deck.deal();
    gameState.board.push(gameState.deck.deal());
    gameState.stage = 'turn';
    messageSpan.textContent = 'Turn';
    updateDisplay();
  }
  function dealRiver() {
    gameState.deck.deal();
    gameState.board.push(gameState.deck.deal());
    gameState.stage = 'river';
    messageSpan.textContent = 'River';
    updateDisplay();
  }

  function goToShowdown() {
    gameState.stage = 'showdown';
    // Show cards
    updateDisplay();
    // Determine winner or early fold winner
    let playerWins;
    if (gameState.player.folded) {
      playerWins = false;
    } else if (gameState.opponent.folded) {
      playerWins = true;
    } else {
      const cmp = compareHands(gameState.player.cards, gameState.opponent.cards, gameState.board);
      if (cmp > 0) playerWins = true;
      else if (cmp < 0) playerWins = false;
      else playerWins = null; // tie
    }
    // Award pot
    if (playerWins === true) {
      gameState.player.stack += gameState.pot;
      messageSpan.textContent = 'You win the pot!';
    } else if (playerWins === false) {
      gameState.opponent.stack += gameState.pot;
      messageSpan.textContent = 'Opponent wins the pot.';
    } else {
      // split pot
      const half = gameState.pot / 2;
      gameState.player.stack += half;
      gameState.opponent.stack += half;
      messageSpan.textContent = 'Split pot.';
    }
    // Save showdown result
    gameState.actionLog.push({ stage: 'showdown', actor: 'system', result: playerWins });
    // Show analysis
    setTimeout(() => {
      performAnalysis();
    }, 500);
  }

  /**
   * AI decision logic based on opponent type. Uses simple heuristics and equity estimation.
   */
  function aiAction() {
    const opp = gameState.opponent;
    const hero = gameState.player;
    const toCall = Math.max(0, hero.currentBet - opp.currentBet);
    // Pre‑compute equity vs random range
    let equity = 0;
    const knownBoard = gameState.board.slice();
    equity = computeEquity(opp.cards, knownBoard, gameState.deck, 150);
    // Determine pot odds for calling
    const callCost = toCall;
    const potAfterCall = gameState.pot + callCost;
    const potOdds = callCost > 0 ? callCost / potAfterCall : 0;
    // Determine action based on stage and opponent type
    let action = 'check';
    let raiseAmount = 0;
    // Basic opponent strategy templates
    const style = gameState.opponentType;
    // Pre‑flop
    if (gameState.stage === 'preflop') {
      const randomFactor = Math.random();
      // Determine relative strength of starting hand (approx using ranking)
      const strength = startingHandStrength(opp.cards);
      if (toCall === 0) {
        // Option to raise or check
        if (style === 'tamayo') {
          // raise wide with strong or medium hand
          if (strength >= 0.4 && randomFactor < 0.7) {
            action = 'raise';
            raiseAmount = gameState.bigBlind * (2 + Math.floor(Math.random() * 2));
          } else {
            action = 'check';
          }
        } else if (style === 'weinman') {
          if (strength >= 0.5 && randomFactor < 0.5) {
            action = 'raise';
            raiseAmount = gameState.bigBlind * 2;
          } else {
            action = 'check';
          }
        } else if (style === 'jorstad') {
          if (strength >= 0.6 && randomFactor < 0.6) {
            action = 'raise';
            raiseAmount = gameState.bigBlind * 3;
          } else {
            action = 'check';
          }
        } else if (style === 'aldemir') {
          if (strength >= 0.55 && randomFactor < 0.7) {
            action = 'raise';
            raiseAmount = gameState.bigBlind * 3;
          } else {
            action = 'check';
          }
        } else if (style === 'salas') {
          // push‑fold for short stacks
          if (gameState.opponent.stack < 10 * gameState.bigBlind) {
            // shove wide if decent equity
            if (equity > 0.48) {
              action = 'allin';
            } else {
              action = 'check';
            }
          } else {
            if (strength >= 0.55 && randomFactor < 0.6) {
              action = 'raise';
              raiseAmount = gameState.bigBlind * 3;
            } else {
              action = 'check';
            }
          }
        }
      } else {
        // Facing a raise; decide to call, fold or reraise
        if (style === 'salas' && gameState.opponent.stack < 10 * gameState.bigBlind) {
          if (equity > potOdds + 0.1) {
            action = 'allin';
          } else {
            action = 'fold';
          }
        } else {
          if (equity > potOdds + 0.1) {
            // Call or sometimes raise
            if (style === 'tamayo' && randomFactor < 0.2) {
              action = 'raise';
              raiseAmount = (hero.currentBet - opp.currentBet) + gameState.bigBlind * 2;
            } else {
              action = 'check';
            }
          } else {
            action = 'fold';
          }
        }
      }
    } else {
      // Post‑flop logic: use equity and pot odds
      if (toCall > 0) {
        if (equity > potOdds + 0.05) {
          // call
          action = 'check';
        } else {
          // occasional bluff raise with draws
          if (style === 'tamayo' && equity > 0.25 && Math.random() < 0.3) {
            action = 'raise';
            raiseAmount = (hero.currentBet - opp.currentBet) + Math.floor(gameState.bigBlind * 2 * Math.random());
          } else {
            action = 'fold';
          }
        }
      } else {
        // Option to bet or check
        if (equity > 0.6) {
          // value bet
          action = 'raise';
          raiseAmount = Math.floor(gameState.bigBlind * (1 + Math.random()));
        } else if (equity > 0.3 && Math.random() < 0.4) {
          // semi‑bluff occasionally
          action = 'raise';
          raiseAmount = Math.floor(gameState.bigBlind * (1 + Math.random()));
        } else {
          action = 'check';
        }
      }
    }
    // Execute action
    const logEntry = { stage: gameState.stage, actor: 'opponent', action: action, bet: 0, pot: gameState.pot, board: gameState.board.slice(), cards: gameState.opponent.cards.slice() };
    if (action === 'fold') {
      gameState.opponent.folded = true;
    } else if (action === 'check') {
      if (toCall > 0) {
        // call
        bet(opp, toCall);
        logEntry.bet = toCall;
        logEntry.action = 'call';
      }
    } else if (action === 'allin') {
      const amount = opp.stack;
      bet(opp, amount);
      logEntry.bet = amount;
    } else if (action === 'raise') {
      const callPart = toCall;
      const total = callPart + raiseAmount;
      bet(opp, total);
      logEntry.bet = total;
    }
    gameState.actionLog.push(logEntry);
    if (action === 'fold') {
      goToShowdown();
    } else {
      // Switch or advance
      if (gameState.player.currentBet === gameState.opponent.currentBet) {
        // Reset bets and advance stage
        gameState.player.currentBet = 0;
        gameState.opponent.currentBet = 0;
        if (gameState.stage === 'preflop') dealFlop();
        else if (gameState.stage === 'flop') dealTurn();
        else if (gameState.stage === 'turn') dealRiver();
        else if (gameState.stage === 'river') {
          goToShowdown();
          return;
        }
        // After flop, big blind acts first
        gameState.turn = (gameState.button === 'player') ? 'player' : 'opponent';
        nextAction();
      } else {
        // Switch turn
        gameState.turn = 'player';
        nextAction();
      }
    }
  }

  /**
   * Rough ranking for starting hands: returns a score between 0 and 1 (higher = better).
   */
  function startingHandStrength(cards) {
    // Use simple heuristics: pairs strong, high cards strong, suited connectors moderate
    const r1 = RANK_VALUES[cards[0].rank];
    const r2 = RANK_VALUES[cards[1].rank];
    const suited = cards[0].suit === cards[1].suit;
    if (r1 === r2) {
      // pair
      return (r1 / 14) * 0.8 + 0.2;
    }
    const highCard = Math.max(r1, r2);
    const lowCard = Math.min(r1, r2);
    let score = 0;
    score += highCard / 14 * 0.5;
    score += (lowCard / 14) * 0.1;
    if (suited) score += 0.1;
    // connectors (difference of 1 or 2)
    const diff = Math.abs(r1 - r2);
    if (diff === 1) score += 0.1;
    else if (diff === 2) score += 0.05;
    return Math.min(score, 1);
  }

  /**
   * Perform analysis of the hand and display results.
   */
  function performAnalysis() {
    // Build analysis text
    let analysisText = '';
    for (const entry of gameState.actionLog) {
      if (entry.actor === 'player') {
        // Estimate equity at decision point
        const equity = computeEquity(entry.cards, entry.board, gameState.deck, 100);
        let advice = '';
        if (entry.action === 'fold') {
          advice = equity > 0.25 ? 'Folding may be too tight; your equity was decent.' : 'Folding is reasonable with low equity.';
        } else if (entry.action === 'call' || entry.action === 'check') {
          // Determine pot odds
          const callCost = entry.action === 'call' ? entry.bet : 0;
          const potAfter = entry.pot + callCost;
          const potOdds = callCost > 0 ? callCost / potAfter : 0;
          if (equity > potOdds + 0.05) {
            advice = 'Good call based on equity.';
          } else if (callCost === 0) {
            advice = 'Checking is fine.';
          } else {
            advice = 'Calling may be unprofitable based on pot odds.';
          }
        } else if (entry.action === 'raise' || entry.action === 'allin') {
          advice = equity > 0.5 ? 'Aggressive play with strong equity.' : 'Bluff/semi‑bluff; ensure you have fold equity.';
        }
        // Disguise analysis
        const evalRes = evaluateHand(entry.cards.concat(entry.board));
        const category = evalRes.category;
        let disguise = '';
        if (category >= 5 && (entry.action === 'check' || entry.action === 'call')) {
          disguise = 'You under‑represented a strong hand (good for trapping).';
        } else if (category <= 1 && (entry.action === 'raise' || entry.action === 'allin')) {
          disguise = 'You represented strength while weak (bluffing).';
        } else if (category >= 5 && (entry.action === 'raise' || entry.action === 'allin')) {
          disguise = 'Your strong hand was evident; consider mixing in checks to disguise.';
        } else {
          disguise = 'Normal play.';
        }
        analysisText += `Stage: ${entry.stage.toUpperCase()}\nAction: ${entry.action.toUpperCase()} for ${entry.bet} chips\nEquity (approx.): ${(equity * 100).toFixed(1)}%\nAdvice: ${advice}\nDisguise: ${disguise}\n\n`;
      }
    }
    analysisContent.textContent = analysisText;
    analysisArea.classList.remove('hidden');
  }

  function showEnd() {
    gameArea.classList.add('hidden');
    analysisArea.classList.add('hidden');
    endScreen.classList.remove('hidden');
    if (gameState.player.stack > gameState.opponent.stack) {
      endTitle.textContent = 'Victory!';
      endMsg.textContent = 'You have won all of the opponent\'s chips.';
    } else {
      endTitle.textContent = 'Defeat';
      endMsg.textContent = 'Your opponent has taken all of your chips.';
    }
  }
})();