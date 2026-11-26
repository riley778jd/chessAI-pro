import type { EndgameExercise, TrainingPuzzle } from '../types/chess';

export const TRAINING_PUZZLES: TrainingPuzzle[] = [
  {
    id: 'tp-1',
    title: 'Back-Rank Execution',
    category: 'checkmate',
    difficulty: 'beginner',
    rating: 920,
    fen: '6k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1',
    solutionUci: ['e2e8'],
    theme: 'Back Rank Mate in 1',
    hint: 'Your rook supports e8. Attack the back rank with your queen.',
    explanation: '1. Qe8# is immediate checkmate because Black’s pawns trap the king on the 8th rank.',
  },
  {
    id: 'tp-2',
    title: 'Arabian Checkmate',
    category: 'checkmate',
    difficulty: 'beginner',
    rating: 1080,
    fen: '7k/8/5N2/8/8/8/6R1/6K1 w - - 0 1',
    solutionUci: ['g2g8'],
    theme: 'Rook & Knight Synergy',
    hint: 'Your f6 knight defends g8 and takes away h7.',
    explanation: '1. Rg8# is the classic Arabian Mate, combining rook and knight on the corner.',
  },
  {
    id: 'tp-3',
    title: 'Royal Knight Fork',
    category: 'tactics',
    difficulty: 'beginner',
    rating: 1140,
    fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1',
    solutionUci: ['d5c7'],
    theme: 'Knight Fork',
    hint: 'Check the king and attack the rook on a8 at the same time.',
    explanation: '1. Nc7+ forks the king and rook, winning material cleanly.',
  },
  {
    id: 'tp-4',
    title: "Légal's Opening Trap",
    category: 'opening',
    difficulty: 'beginner',
    rating: 1180,
    fen: 'r2qkbnr/ppp2ppp/2np4/4N3/2B1P1b1/2N5/PPPP1PPP/R1BQK2R w KQkq - 0 5',
    solutionUci: ['c4f7', 'e8e7', 'c3d5'],
    theme: 'Opening Trap & Checkmate',
    hint: 'Sacrifice the bishop on f7, then jump in with your c3 knight.',
    explanation: '5. Bxf7+! Ke7 6. Nd5# completes Légal’s Mate against an uncastled king.',
  },
  {
    id: 'tp-5',
    title: 'Fried Liver Attack',
    category: 'opening',
    difficulty: 'intermediate',
    rating: 1360,
    fen: 'r1bqkb1r/ppp2ppp/2n5/3np1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 6',
    solutionUci: ['g5f7', 'e8f7', 'd1f3'],
    theme: 'f7 Sacrifice & Double Attack',
    hint: 'Sacrifice the g5 knight on f7 to expose the king.',
    explanation: '6. Nxf7! Kxf7 7. Qf3+ creates a winning double attack on the king and d5 knight.',
  },
  {
    id: 'tp-6',
    title: "Morphy's Opera Sacrifice",
    category: 'checkmate',
    difficulty: 'intermediate',
    rating: 1420,
    fen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 15',
    solutionUci: ['b3b8', 'd7b8', 'd1d8'],
    theme: 'Queen Sacrifice & Deflection',
    hint: 'Sacrifice your queen on b8 to deflect the d7 knight away from d8.',
    explanation: '15. Qb8+! Nxb8 16. Rd8# is Paul Morphy’s famous 1858 Paris Opera finish.',
  },
  {
    id: 'tp-7',
    title: "Boden's Criss-Cross Mate",
    category: 'checkmate',
    difficulty: 'intermediate',
    rating: 1490,
    fen: '2kr4/pp1n1ppp/2p5/8/5B2/2Q5/PPP2PPP/R4BK1 w - - 0 1',
    solutionUci: ['c3c6', 'b7c6', 'f1a6'],
    theme: 'Intersecting Bishop Mate',
    hint: 'Sacrifice the queen on c6 to open the a6-c8 diagonal.',
    explanation: '1. Qxc6+! bxc6 2. Ba6# delivers Boden’s Mate with intersecting bishop diagonals.',
  },
  {
    id: 'tp-8',
    title: 'Double Attack on Queen',
    category: 'tactics',
    difficulty: 'advanced',
    rating: 1620,
    fen: '3q2k1/5p2/8/8/8/8/1B6/4K3 w - - 0 1',
    solutionUci: ['b2f6'],
    theme: 'Pin & Diagonal Threat',
    hint: 'Step your bishop onto f6 to threaten both the queen and mate on g7.',
    explanation: '1. Bf6 attacks the queen on d8 while threatening Qg7/mate motifs along the long diagonal.',
  },
  {
    id: 'tp-9',
    title: 'Philidor Smothered Mate',
    category: 'checkmate',
    difficulty: 'advanced',
    rating: 1740,
    fen: '5r1k/6pp/7N/3Q4/8/8/5PPP/6K1 w - - 0 1',
    solutionUci: ['d5g8', 'f8g8', 'h6f7'],
    theme: 'Queen Sacrifice & Smothered Mate',
    hint: 'Force the Black rook onto g8 so it blocks its own king.',
    explanation: '1. Qg8+! Rxg8 2. Nf7# delivers classic smothered checkmate.',
  },
  {
    id: 'tp-10',
    title: 'Anastasia Mate Finish',
    category: 'checkmate',
    difficulty: 'master',
    rating: 1920,
    fen: '5rk1/4N1pp/8/8/8/8/4Q2R/6K1 w - - 0 1',
    solutionUci: ['e2c4', 'g8h8', 'h2h7', 'h8h7', 'c4h4'],
    theme: 'Rook Sacrifice & Queen Mate',
    hint: 'Check on the a2-g8 diagonal first to push the king into the corner!',
    explanation: '1. Qc4+ Kh8 2. Rxh7+ Kxh7 3. Qh4# delivers a devastating corner checkmate.',
  },
];

export const ENDGAME_EXERCISES: EndgameExercise[] = [
  {
    id: 'end-lucena',
    title: 'The Lucena Position (Bridge Building)',
    difficulty: 'intermediate',
    fen: '1K1k4/1P6/8/8/8/8/r7/3R4 w - - 0 1',
    goal: 'win',
    sideToPlay: 'w',
    keyConcept: 'Building a Rook Bridge on the 4th Rank',
    instructions: 'Drive the Black king away, free your king from b8, and shield against checks on the 4th rank to promote the b7 pawn.',
  },
  {
    id: 'end-philidor',
    title: 'The Philidor Defense (Drawing Technique)',
    difficulty: 'intermediate',
    fen: '4k3/8/8/4PK2/8/8/4r3/4R3 b - - 0 1',
    goal: 'draw',
    sideToPlay: 'b',
    keyConcept: '3rd/6th Rank Cutoff & Back-Rank Checks',
    instructions: 'Hold the 3rd rank until White pushes e6, then switch behind the pawn to deliver endless vertical checks.',
  },
  {
    id: 'end-opposition',
    title: 'King & Pawn Opposition',
    difficulty: 'beginner',
    fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1',
    goal: 'win',
    sideToPlay: 'w',
    keyConcept: 'Key Squares & Direct Opposition',
    instructions: 'Use outflanking (Kd6 or Kf6) to seize key squares in front of your pawn and shepherd it safely to e8.',
  },
  {
    id: 'end-queen-vs-pawn',
    title: 'Queen vs Pawn on 7th Rank',
    difficulty: 'advanced',
    fen: '8/8/8/8/8/4Q3/2p5/1K1k4 w - - 0 1',
    goal: 'win',
    sideToPlay: 'w',
    keyConcept: 'Staircase Checks & King Approach',
    instructions: 'Force the Black king onto c1 in front of its pawn using checks, freeing a tempo to bring your own king closer.',
  },
  {
    id: 'end-outside-passer',
    title: 'Outside Passed Pawn Breakthrough',
    difficulty: 'beginner',
    fen: '8/pp3k2/8/P7/8/8/5PPP/6K1 w - - 0 1',
    goal: 'win',
    sideToPlay: 'w',
    keyConcept: 'Decoy & Kingside Invasion',
    instructions: 'Use the a-pawn to lure the Black king to the queenside, then march your king to capture Black’s kingside pawns.',
  },
  {
    id: 'end-knight-bishop',
    title: 'Bishop & Knight Checkmate',
    difficulty: 'master',
    fen: '8/8/8/4k3/8/4K3/3BN3/8 w - - 0 1',
    goal: 'win',
    sideToPlay: 'w',
    keyConcept: 'The W-Maneuver to the Matching Corner',
    instructions: 'Drive the lone Black king into the a8 or h1 corner (matching your dark-squared bishop) using the W-maneuver.',
  },
];

export interface SampleGame {
  id: string;
  title: string;
  subtitle: string;
  pgn: string;
}

export const SAMPLE_GAMES: SampleGame[] = [
  {
    id: 'opera-1858',
    title: 'Morphy vs Duke of Brunswick (1858)',
    subtitle: 'C41 Philidor Defense · The Opera Game',
    pgn: `[Event "Paris Opera"]
[Site "Paris FRA"]
[Date "1858.11.02"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]
[ECO "C41"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`,
  },
  {
    id: 'byrne-fischer-1956',
    title: 'Byrne vs Bobby Fischer (1956)',
    subtitle: 'D92 Grünfeld · Game of the Century',
    pgn: `[Event "Rosenwald Memorial"]
[Site "New York, NY USA"]
[Date "1956.10.17"]
[White "Donald Byrne"]
[Black "Robert James Fischer"]
[Result "0-1"]
[ECO "D92"]

1. Nf3 Nf6 2. c4 g6 3. Nc3 Bg7 4. d4 O-O 5. Bf4 d5 6. Qb3 dxc4 7. Qxc4 c6 8. e4 Nbd7 9. Rd1 Nb6 10. Qc5 Bg4 11. Bg5 Na4 12. Qa3 Nxc3 13. bxc3 Nxe4 14. Bxe7 Qb6 15. Bc4 Nxc3 16. Bc5 Rfe8+ 17. Kf1 Be6 18. Bxb6 Bxc4+ 19. Kg1 Ne2+ 20. Kf1 Nxd4+ 21. Kg1 Ne2+ 22. Kf1 Nc3+ 23. Kg1 axb6 24. Qb4 Ra4 25. Qxb6 Nxd1 26. h3 Rxa2 27. Kh2 Nxf2 28. Re1 Rxe1 29. Qd8+ Bf8 30. Nxe1 Bd5 31. Nf3 Ne4 32. Qb8 b5 33. h4 h5 34. Ne5 Kg7 35. Kg1 Bc5+ 36. Kf1 Ng3+ 37. Ke1 Bb4+ 38. Kd1 Bb3+ 39. Kc1 Ne2+ 40. Kb1 Nc3+ 41. Kc1 Rc2# 0-1`,
  },
  {
    id: 'kasparov-topalov-1999',
    title: 'Kasparov vs Topalov (1999)',
    subtitle: 'B07 Pirc Defense · Kasparov’s Immortal',
    pgn: `[Event "Hoogovens"]
[Site "Wijk aan Zee NED"]
[Date "1999.01.20"]
[White "Garry Kasparov"]
[Black "Veselin Topalov"]
[Result "1-0"]
[ECO "B07"]

1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Be3 Bg7 5. Qd2 c6 6. f3 b5 7. Nge2 Nbd7 8. Bh6 Bxh6 9. Qxh6 Bb7 10. a3 e5 11. O-O-O Qe7 12. Kb1 a6 13. Nc1 O-O-O 14. Nb3 exd4 15. Rxd4 c5 16. Rd1 Nb6 17. g3 Kb8 18. Na5 Ba8 19. Bh3 d5 20. Qf4+ Ka7 21. Rhe1 d4 22. Nd5 Nbxd5 23. exd5 Qd6 24. Rxd4 cxd4 25. Re7+ Kb6 26. Qxd4+ Kxa5 27. b4+ Ka4 28. Qc3 Qxd5 29. Ra7 Bb7 30. Rxb7 Qc4 31. Qxf6 Kxa3 32. Qxa6+ Kxb4 33. c3+ Kxc3 34. Qa1+ Kd2 35. Qb2+ Kd1 36. Bf1 Rd2 37. Rd7 Rxd7 38. Bxc4 bxc4 39. Qxh8 Rd3 40. Qa8 c3 41. Qa4+ Ke1 42. f4 f5 43. Kc1 Rd2 44. Qa7 1-0`,
  },
];
