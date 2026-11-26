import type { EngineLine } from '../types/chess';
import { formatEvalScore, normalizeEvalForBar, uciLineToSan } from '../utils/chessHelpers';

type AnalysisCallback = (lines: EngineLine[], bestMove: string | null, done: boolean) => void;

interface AnalyzeOptions {
  depth: number;
  multiPv: number;
  hashMb?: number;
  skillLevel?: number;
}

class StockfishEngineService {
  private worker: Worker | null = null;
  private isReady = false;
  private initPromise: Promise<void> | null = null;
  private listeners: Set<(line: string) => void> = new Set();
  private currentJobId = 0;
  private queue: Promise<void> = Promise.resolve();
  private lastHash = -1;
  private lastMultiPv = -1;
  private lastSkill = -1;

  public async ensureReady(): Promise<void> {
    if (this.worker && this.isReady) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      try {
        const worker = new Worker('/engine/stockfish-19-lite-single.js');
        this.worker = worker;

        const timeout = setTimeout(() => {
          reject(new Error('Stockfish UCI initialization timed out.'));
        }, 12000);

        const handleInitMsg = (ev: MessageEvent<string>) => {
          const line = typeof ev.data === 'string' ? ev.data : String(ev.data);
          if (line.includes('uciok')) {
            worker.postMessage('isready');
          } else if (line.includes('readyok')) {
            clearTimeout(timeout);
            worker.removeEventListener('message', handleInitMsg);
            this.isReady = true;
            worker.addEventListener('message', (e: MessageEvent<string>) => {
              const msg = typeof e.data === 'string' ? e.data : String(e.data);
              this.listeners.forEach((cb) => cb(msg));
            });
            resolve();
          }
        };

        worker.addEventListener('message', handleInitMsg);
        worker.addEventListener('error', (err) => {
          clearTimeout(timeout);
          this.initPromise = null;
          reject(new Error(err.message || 'Stockfish Web Worker failed to start.'));
        });

        worker.postMessage('uci');
      } catch (error) {
        this.initPromise = null;
        reject(error);
      }
    });

    return this.initPromise;
  }

  private send(cmd: string): void {
    this.worker?.postMessage(cmd);
  }

  private async configureOptions(multiPv: number, hashMb: number, skillLevel: number): Promise<void> {
    let changed = false;
    if (this.lastMultiPv !== multiPv) {
      this.send(`setoption name MultiPV value ${multiPv}`);
      this.lastMultiPv = multiPv;
      changed = true;
    }
    if (this.lastHash !== hashMb) {
      this.send(`setoption name Hash value ${hashMb}`);
      this.lastHash = hashMb;
      changed = true;
    }
    if (this.lastSkill !== skillLevel) {
      this.send(`setoption name Skill Level value ${skillLevel}`);
      this.lastSkill = skillLevel;
      changed = true;
    }
    if (changed) {
      await this.waitReady();
    }
  }

  private waitReady(): Promise<void> {
    return new Promise((resolve) => {
      const listener = (line: string) => {
        if (line.trim() === 'readyok') {
          this.listeners.delete(listener);
          resolve();
        }
      };
      this.listeners.add(listener);
      this.send('isready');
    });
  }

  public stopCurrent(): void {
    this.currentJobId += 1;
    if (this.worker && this.isReady) {
      this.send('stop');
    }
  }

  public analyzePosition(
    fen: string,
    options: AnalyzeOptions,
    onUpdate: AnalysisCallback
  ): () => void {
    const jobId = ++this.currentJobId;
    let cancelled = false;

    if (this.worker && this.isReady) {
      this.send('stop');
    }

    this.queue = this.queue.then(async () => {
      if (cancelled || jobId !== this.currentJobId) return;
      await this.ensureReady();
      if (cancelled || jobId !== this.currentJobId) return;

      const multiPv = Math.max(1, Math.min(5, options.multiPv));
      const depth = Math.max(1, Math.min(26, options.depth));
      const hashMb = Math.max(16, Math.min(128, options.hashMb ?? 32));
      const skill = Math.max(0, Math.min(20, options.skillLevel ?? 20));

      await this.configureOptions(multiPv, hashMb, skill);
      if (cancelled || jobId !== this.currentJobId) return;

      const sideToMove = fen.split(' ')[1] === 'b' ? 'b' : 'w';
      const linesMap = new Map<number, EngineLine>();

      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          this.listeners.delete(onLine);
          resolve();
        };

        const onLine = (raw: string) => {
          if (cancelled || jobId !== this.currentJobId) {
            this.send('stop');
            finish();
            return;
          }

          if (raw.startsWith('info ') && raw.includes(' pv ')) {
            const parsed = parseUciInfoLine(raw, fen, sideToMove);
            if (parsed) {
              linesMap.set(parsed.multipv, parsed);
              const sorted = Array.from(linesMap.values()).sort((a, b) => a.multipv - b.multipv);
              onUpdate(sorted, sorted[0]?.pvUci[0] ?? null, false);
            }
          } else if (raw.startsWith('bestmove ')) {
            const parts = raw.trim().split(/\s+/);
            const best = parts[1] && parts[1] !== '(none)' ? parts[1] : null;
            const sorted = Array.from(linesMap.values()).sort((a, b) => a.multipv - b.multipv);
            onUpdate(sorted, best, true);
            finish();
          }
        };

        this.listeners.add(onLine);
        this.send(`position fen ${fen}`);
        this.send(`go depth ${depth}`);
      });
    }).catch((err) => {
      console.error('Stockfish analysis error:', err);
    });

    return () => {
      cancelled = true;
      if (jobId === this.currentJobId && this.worker && this.isReady) {
        this.send('stop');
      }
    };
  }

  public evaluateSinglePosition(
    fen: string,
    options: { depth?: number; movetime?: number; skillLevel?: number }
  ): Promise<{ bestMove: string | null; line: EngineLine | null }> {
    const jobId = ++this.currentJobId;
    if (this.worker && this.isReady) {
      this.send('stop');
    }

    return new Promise((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        if (jobId !== this.currentJobId) {
          resolve({ bestMove: null, line: null });
          return;
        }
        await this.ensureReady();
        const skill = Math.max(0, Math.min(20, options.skillLevel ?? 20));
        await this.configureOptions(1, 32, skill);

        const sideToMove = fen.split(' ')[1] === 'b' ? 'b' : 'w';
        let latestLine: EngineLine | null = null;

        await new Promise<void>((doneResolve) => {
          const onLine = (raw: string) => {
            if (jobId !== this.currentJobId) {
              this.send('stop');
              this.listeners.delete(onLine);
              resolve({ bestMove: null, line: latestLine });
              doneResolve();
              return;
            }
            if (raw.startsWith('info ') && raw.includes(' pv ')) {
              const parsed = parseUciInfoLine(raw, fen, sideToMove);
              if (parsed) latestLine = parsed;
            } else if (raw.startsWith('bestmove ')) {
              this.listeners.delete(onLine);
              const parts = raw.trim().split(/\s+/);
              const best = parts[1] && parts[1] !== '(none)' ? parts[1] : null;
              resolve({ bestMove: best, line: latestLine });
              doneResolve();
            }
          };
          this.listeners.add(onLine);
          this.send(`position fen ${fen}`);
          if (options.movetime) {
            this.send(`go movetime ${options.movetime}`);
          } else {
            this.send(`go depth ${options.depth ?? 10}`);
          }
        });
      }).catch((err) => {
        reject(err);
      });
    });
  }
}

function parseUciInfoLine(raw: string, fen: string, sideToMove: 'w' | 'b'): EngineLine | null {
  const tokens = raw.trim().split(/\s+/);
  let depth = 0;
  let seldepth = 0;
  let multipv = 1;
  let nodes = 0;
  let nps = 0;
  let time = 0;
  let cp: number | undefined;
  let mate: number | undefined;
  let pvStart = -1;

  for (let i = 1; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === 'depth' && tokens[i + 1]) {
      depth = Number(tokens[++i]) || 0;
    } else if (tok === 'seldepth' && tokens[i + 1]) {
      seldepth = Number(tokens[++i]) || 0;
    } else if (tok === 'multipv' && tokens[i + 1]) {
      multipv = Number(tokens[++i]) || 1;
    } else if (tok === 'nodes' && tokens[i + 1]) {
      nodes = Number(tokens[++i]) || 0;
    } else if (tok === 'nps' && tokens[i + 1]) {
      nps = Number(tokens[++i]) || 0;
    } else if (tok === 'time' && tokens[i + 1]) {
      time = Number(tokens[++i]) || 0;
    } else if (tok === 'score' && tokens[i + 2]) {
      const scoreType = tokens[++i];
      const val = Number(tokens[++i]);
      const sign = sideToMove === 'b' ? -1 : 1; // Normalize to White perspective
      if (scoreType === 'cp' && !Number.isNaN(val)) {
        cp = val * sign;
      } else if (scoreType === 'mate' && !Number.isNaN(val)) {
        mate = val * sign;
      }
    } else if (tok === 'pv') {
      pvStart = i + 1;
      break;
    }
  }

  if (pvStart === -1 || pvStart >= tokens.length) return null;
  const pvUci = tokens.slice(pvStart, pvStart + 12);
  const pvSan = uciLineToSan(fen, pvUci);

  return {
    multipv,
    depth,
    seldepth,
    cp,
    mate,
    nodes,
    nps,
    time,
    pvUci,
    pvSan,
    evalLabel: formatEvalScore(cp, mate),
    normalizedScore: normalizeEvalForBar(cp, mate),
  };
}

export const stockfishService = new StockfishEngineService();
