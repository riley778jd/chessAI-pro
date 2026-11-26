import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleGeminiRouteError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  const lower = message.toLowerCase();
  if (lower.includes('api_key') || lower.includes('permission_denied') || lower.includes('403') || lower.includes('not configured')) {
    res.status(403).json({
      error: 'Gemini API key is missing or invalid. Please configure GEMINI_API_KEY in Settings > Secrets.',
    });
    return;
  }
  if (lower.includes('resource_exhausted') || lower.includes('429')) {
    res.status(429).json({
      error: 'Gemini API quota exceeded. Please wait a moment or check your quota in Settings > Secrets.',
    });
    return;
  }
  res.status(500).json({ error: message });
}

interface EngineLinePayload {
  multipv: number;
  depth: number;
  evalLabel: string;
  cp?: number;
  mate?: number;
  pvSan: string[];
}

interface CoachMessage {
  role: 'user' | 'coach';
  text: string;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, engine: 'stockfish-19-lite-single', geminiConfigured: Boolean(process.env.GEMINI_API_KEY) });
  });

  app.post('/api/coach/explain-position', async (req: Request, res: Response) => {
    try {
      const {
        fen,
        turn,
        stockfishLines,
        materialSummary,
        lastMoveSan,
        gamePhase,
        question,
        history,
        focusArea,
      } = req.body as {
        fen?: unknown;
        turn?: unknown;
        stockfishLines?: unknown;
        materialSummary?: unknown;
        lastMoveSan?: unknown;
        gamePhase?: unknown;
        question?: unknown;
        history?: unknown;
        focusArea?: unknown;
      };

      if (typeof fen !== 'string' || fen.length < 10 || fen.length > 140) {
        res.status(400).json({ error: 'A valid FEN string is required.' });
        return;
      }

      const safeLines: EngineLinePayload[] = Array.isArray(stockfishLines)
        ? stockfishLines.slice(0, 5).map((line) => ({
            multipv: Number(line?.multipv) || 1,
            depth: Number(line?.depth) || 0,
            evalLabel: typeof line?.evalLabel === 'string' ? line.evalLabel.slice(0, 24) : '0.00',
            cp: typeof line?.cp === 'number' ? line.cp : undefined,
            mate: typeof line?.mate === 'number' ? line.mate : undefined,
            pvSan: Array.isArray(line?.pvSan)
              ? line.pvSan.slice(0, 10).filter((m: unknown): m is string => typeof m === 'string')
              : [],
          }))
        : [];

      if (safeLines.length === 0) {
        res.status(400).json({
          error: 'Run Stockfish analysis first so the AI coach has verified engine lines to explain.',
        });
        return;
      }

      const safeHistory: CoachMessage[] = Array.isArray(history)
        ? history
            .slice(-6)
            .filter(
              (item): item is CoachMessage =>
                Boolean(item) &&
                (item.role === 'user' || item.role === 'coach') &&
                typeof item.text === 'string'
            )
            .map((item) => ({ role: item.role, text: item.text.slice(0, 1200) }))
        : [];

      const safeQuestion =
        typeof question === 'string' && question.trim().length > 0
          ? question.trim().slice(0, 800)
          : 'Explain the current position, the best Stockfish recommendation, key tactical threats, positional plans, and what the player should watch out for.';

      const safeFocus = typeof focusArea === 'string' ? focusArea.slice(0, 40) : 'general';

      const engineContext = safeLines
        .map(
          (l) =>
            `Line ${l.multipv} (depth ${l.depth}, eval ${l.evalLabel}): ${l.pvSan.join(' ') || 'N/A'}`
        )
        .join('\n');

      const systemInstruction = `You are a Grandmaster Chess Coach inside ChessAI Pro.
CRITICAL GROUNDING RULES:
1. NEVER invent, guess, or contradict Stockfish evaluations or principal variations. Base every evaluation claim strictly on the Stockfish UCI lines provided below.
2. Refer to concrete moves in SAN notation from the Stockfish lines and the actual FEN board state.
3. Explain chess concepts clearly in human terms: tactical motifs (pins, forks, skewers, discovered attacks, back-rank), positional factors (pawn structure, king safety, piece activity, outposts, space), opening principles, or endgame technique.
4. Keep your response concise, structured, and actionable (around 150-260 words unless asked for deeper detail). Do not use markdown code blocks or raw JSON.`;

      const prompt = `Position FEN: ${fen}
Side to Move: ${turn === 'b' ? 'Black' : 'White'}
Game Phase: ${typeof gamePhase === 'string' ? gamePhase.slice(0, 32) : 'Middlegame'}
Last Move: ${typeof lastMoveSan === 'string' && lastMoveSan ? lastMoveSan.slice(0, 20) : 'None'}
Material Balance: ${typeof materialSummary === 'string' ? materialSummary.slice(0, 140) : 'Equal'}
Focus Area: ${safeFocus}

Verified Stockfish Multi-PV Output:
${engineContext}

Recent Conversation:
${safeHistory.map((m) => `${m.role === 'user' ? 'Student' : 'Coach'}: ${m.text}`).join('\n') || 'None'}

Student Request: ${safeQuestion}`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const answer = response.text?.trim();
      if (!answer) {
        res.status(502).json({ error: 'Gemini returned an empty coaching response.' });
        return;
      }

      res.json({ answer });
    } catch (error) {
      handleGeminiRouteError(res, error);
    }
  });

  app.post('/api/coach/review-game', async (req: Request, res: Response) => {
    try {
      const {
        pgn,
        white,
        black,
        result,
        whiteAccuracy,
        blackAccuracy,
        criticalMoments,
      } = req.body as {
        pgn?: unknown;
        white?: unknown;
        black?: unknown;
        result?: unknown;
        whiteAccuracy?: unknown;
        blackAccuracy?: unknown;
        criticalMoments?: unknown;
      };

      if (typeof pgn !== 'string' || pgn.trim().length === 0 || pgn.length > 25000) {
        res.status(400).json({ error: 'Valid PGN game text is required.' });
        return;
      }

      const safeMoments = Array.isArray(criticalMoments)
        ? criticalMoments.slice(0, 14).map((m) => ({
            moveNumber: Number(m?.moveNumber) || 1,
            color: m?.color === 'b' ? 'Black' : 'White',
            playedSan: typeof m?.playedSan === 'string' ? m.playedSan.slice(0, 16) : '',
            bestSan: typeof m?.bestSan === 'string' ? m.bestSan.slice(0, 16) : '',
            classification: typeof m?.classification === 'string' ? m.classification.slice(0, 24) : '',
            evalBefore: typeof m?.evalBefore === 'string' ? m.evalBefore.slice(0, 16) : '',
            evalAfter: typeof m?.evalAfter === 'string' ? m.evalAfter.slice(0, 16) : '',
            cpLoss: Number(m?.cpLoss) || 0,
          }))
        : [];

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Generate a structured post-game coaching report grounded strictly in these Stockfish move evaluations.

White: ${typeof white === 'string' ? white.slice(0, 80) : 'White'} (Accuracy: ${Number(whiteAccuracy) || 0}%)
Black: ${typeof black === 'string' ? black.slice(0, 80) : 'Black'} (Accuracy: ${Number(blackAccuracy) || 0}%)
Result: ${typeof result === 'string' ? result.slice(0, 12) : '*'}

Critical Moments from Stockfish Analysis:
${safeMoments.map((m) => `Move ${m.moveNumber} (${m.color}): Played ${m.playedSan} [${m.classification}], Best was ${m.bestSan}. Eval ${m.evalBefore} -> ${m.evalAfter} (${m.cpLoss} cp loss)`).join('\n') || 'Balanced game with few major swings.'}

PGN:
${pgn.slice(0, 6000)}`,
        config: {
          systemInstruction:
            'You are a Grandmaster Chess Coach. Never invent Stockfish evaluations or claim moves happened that are not in the PGN. Use the exact critical moments and accuracies provided.',
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'A 2-3 sentence executive summary of the game narrative.',
              },
              whiteStrengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 specific strengths demonstrated by White.',
              },
              whiteWeaknesses: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 specific mistakes or recurring weaknesses for White.',
              },
              blackStrengths: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 specific strengths demonstrated by Black.',
              },
              blackWeaknesses: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 specific mistakes or recurring weaknesses for Black.',
              },
              keyTurningPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Concise explanations of the critical turning points and why the Stockfish best moves were stronger.',
              },
              trainingRecommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 concrete personalized training exercises or study focuses.',
              },
            },
            required: [
              'summary',
              'whiteStrengths',
              'whiteWeaknesses',
              'blackStrengths',
              'blackWeaknesses',
              'keyTurningPoints',
              'trainingRecommendations',
            ],
          },
        },
      });

      const jsonText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(jsonText);
      res.json({ report: parsed });
    } catch (error) {
      handleGeminiRouteError(res, error);
    }
  });

  app.get('/api/openings/lichess', async (req: Request, res: Response) => {
    const fen = typeof req.query.fen === 'string' ? req.query.fen.trim() : '';
    const db = req.query.db === 'lichess' ? 'lichess' : 'masters';
    if (!fen || fen.length < 10 || fen.length > 140) {
      res.status(400).json({ error: 'Invalid FEN parameter.' });
      return;
    }

    try {
      const targetUrl = new URL(`https://explorer.lichess.ovh/${db}`);
      targetUrl.searchParams.set('fen', fen);
      targetUrl.searchParams.set('moves', '10');
      if (db === 'lichess') {
        targetUrl.searchParams.set('ratings', '2000,2200,2500');
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const upstream = await fetch(targetUrl.toString(), {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ChessAIPro/1.0',
        },
      });
      clearTimeout(timeout);

      if (!upstream.ok) {
        res.status(502).json({ error: `Opening database returned status ${upstream.status}` });
        return;
      }

      const data = await upstream.json();
      res.json({ source: db === 'lichess' ? 'lichess-global' : 'lichess-masters', data });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach Lichess explorer';
      res.status(503).json({ error: message });
    }
  });

  if (IS_PROD) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ChessAI Pro server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ChessAI Pro server:', err);
  process.exit(1);
});
