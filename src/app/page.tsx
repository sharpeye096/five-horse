'use client';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../i18n'; // Initialize i18n
import { getInitialState, checkWinCondition } from '../game/utils';
import { getValidMoves } from '../game/rules';
import { GameState, Move, NodeId } from '../game/types';
import { getBestMove } from '../game/ai';
import Board from '../components/Board';
import { AnimationState } from '../components/animation-types';

type GameMode = 'PvP' | 'PvE';

export default function FiveHorseGame() {
  const { t, i18n } = useTranslation();
  const [gameState, setGameState] = useState<GameState>(getInitialState());
  const [selectedNode, setSelectedNode] = useState<NodeId | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>('PvP');
  const [aiThinking, setAiThinking] = useState(false);
  const [animation, setAnimation] = useState<AnimationState | null>(null);

  // AI Turn Effect
  useEffect(() => {
    if (gameMode === 'PvE' && gameState.currentPlayer === 'white' && !gameState.winner && !aiThinking) {
      const runAi = async () => {
        setAiThinking(true);

        // 1. Calculate Move (fast)
        await new Promise(r => setTimeout(r, 500)); // Initial think time
        const move = getBestMove(gameState, 3, 'white');

        if (move) {
          const piece = gameState.pieces[move.from];

          // Phase 1: Highlight (Show "I choose this")
          setAnimation({
            step: 'highlight',
            from: move.from,
            to: move.to,
            piece
          });
          await new Promise(r => setTimeout(r, 800)); // Stay highlighted

          // Phase 2: Move Animation
          setAnimation({
            step: 'moving',
            from: move.from,
            to: move.to,
            piece
          });
          await new Promise(r => setTimeout(r, 1200)); // Wait for SVG transition (1s) + buffer

          // Phase 3: Landed (Pause before eating)
          setAnimation({
            step: 'landed',
            from: move.from,
            to: move.to,
            piece
          });
          await new Promise(r => setTimeout(r, 800)); // Pause to see the land

          // Phase 4: Execute & Effect
          await executeMove(move);
          setAnimation(null);
        } else {
          // No moves?
        }
        setAiThinking(false);
      };

      runAi();
    }
  }, [gameState, gameMode, aiThinking]); // Added aiThinking to dependency to prevent re-entry, but logic above guards it.

  // Reset Game
  const handleReset = () => {
    setGameState(getInitialState());
    setSelectedNode(null);
    setValidMoves([]);
    setAnimation(null);
    setAiThinking(false);
  };

  // Undo (naive)
  const handleUndo = () => {
    if (gameState.history.length === 0 || aiThinking) return;

    // If PvE, undo 2 steps (Human + AI)
    if (gameMode === 'PvE') {
      if (gameState.history.length < 2) {
        handleReset();
        return;
      }
      const prev = gameState.history[gameState.history.length - 2];
      setGameState({
        ...gameState,
        pieces: prev.pieces,
        currentPlayer: prev.currentPlayer,
        history: gameState.history.slice(0, -2),
        winner: null
      });
    } else {
      const prev = gameState.history[gameState.history.length - 1];
      setGameState({
        ...gameState,
        pieces: prev.pieces,
        currentPlayer: prev.currentPlayer,
        history: gameState.history.slice(0, -1),
        winner: null
      });
    }

    setSelectedNode(null);
    setValidMoves([]);
  };

  // Interaction
  const handleNodeClick = (nodeId: NodeId) => {
    // If winner or AI thinking, do nothing
    if (gameState.winner || aiThinking) return;

    // If PvE and it's AI turn (White), ignore clicks
    if (gameMode === 'PvE' && gameState.currentPlayer === 'white') return;

    const piece = gameState.pieces[nodeId];

    // Select own piece
    if (piece && piece.player === gameState.currentPlayer) {
      setSelectedNode(nodeId);
      const moves = getValidMoves(gameState, nodeId);
      setValidMoves(moves);
      return;
    }

    // Move to target?
    if (selectedNode) {
      const move = validMoves.find(m => m.to === nodeId);
      if (move) {
        executeMove(move);
      } else {
        // Clicked invalid empty or enemy -> Deselect
        setSelectedNode(null);
        setValidMoves([]);
      }
    }
  };

  // Async Execution of Move and Effect sequence
  const executeMove = async (move: Move) => {
    // 1. Move the Piece
    const nextPlayer = gameState.currentPlayer === 'black' ? 'white' : 'black';
    let currentPieces = { ...gameState.pieces }; // Local mutable state for sequence
    const movingPiece = currentPieces[move.from];
    delete currentPieces[move.from];
    currentPieces[move.to] = movingPiece;

    // Determine initial next state (just the move)
    let currentHistory = [
      ...gameState.history,
      { pieces: gameState.pieces, currentPlayer: gameState.currentPlayer } // Snapshot before move
    ];

    // Optimistic Update: Move piece immediately
    setGameState(prev => ({
      ...prev,
      pieces: currentPieces,
      history: currentHistory, // History updated once at start of move
      // Don't switch player yet or checking win condition, allow animation
    }));

    // If there are capture steps, play them sequentially
    if (move.captureSteps && move.captureSteps.length > 0) {
      // Iterate steps
      for (const step of move.captureSteps) {
        await new Promise(r => setTimeout(r, 1200)); // Delay between steps (1.2s)

        // Apply this step's captures
        step.forEach(capId => {
          if (currentPieces[capId]) {
            currentPieces[capId] = {
              ...currentPieces[capId],
              player: gameState.currentPlayer
            };
          }
        });

        // Update View
        // We need to use functional update to ensure we don't clobber concurrent updates (though single threaded game)
        // But here we rely on the local 'currentPieces' accumulator
        setGameState(prev => ({
          ...prev,
          pieces: { ...currentPieces } // New object ref
        }));
      }
      // Wait after last effect before turn switch?
      await new Promise(r => setTimeout(r, 500));
    }

    // Finalize Turn
    const winner = checkWinCondition({ ...gameState, pieces: currentPieces, currentPlayer: gameState.currentPlayer });

    setGameState(prev => ({
      ...prev,
      pieces: currentPieces,
      currentPlayer: nextPlayer,
      winner,
      turnCount: prev.turnCount + 1,
      // History was already added at start? 
      // Actually standard is history stores state BEFORE turn.
    }));

    setSelectedNode(null);
    setValidMoves([]);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-stone-100 p-8 font-sans">
      <div className="flex w-full max-w-4xl justify-between items-center mb-4">
        <h1 className="text-4xl font-bold text-stone-800">{t('title')}</h1>
        <div className="flex gap-2">
          <button onClick={() => changeLanguage('en')} className={`px-2 py-1 rounded ${i18n.language === 'en' ? 'bg-stone-600 text-white' : 'bg-stone-200'}`}>EN</button>
          <button onClick={() => changeLanguage('zh')} className={`px-2 py-1 rounded ${i18n.language === 'zh' ? 'bg-stone-600 text-white' : 'bg-stone-200'}`}>中文</button>
        </div>
      </div>

      <div className="flex gap-4 mb-4 items-center">
        <div className="bg-white p-1 rounded shadow flex">
          <button
            className={`px-3 py-1 rounded ${gameMode === 'PvP' ? 'bg-amber-600 text-white' : 'text-gray-600'}`}
            onClick={() => { setGameMode('PvP'); handleReset(); }}
          >
            {t('modes.pvp')}
          </button>
          <button
            className={`px-3 py-1 rounded ${gameMode === 'PvE' ? 'bg-amber-600 text-white' : 'text-gray-600'}`}
            onClick={() => { setGameMode('PvE'); handleReset(); }}
          >
            {t('modes.pve')}
          </button>
        </div>
        <div className="border-l h-8 border-gray-300 mx-2"></div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700" onClick={handleReset}>{t('actions.restart')}</button>
        <button className="px-4 py-2 bg-gray-500 text-white rounded shadow hover:bg-gray-600" onClick={handleUndo} disabled={gameState.history.length === 0 || aiThinking}>{t('actions.undo')}</button>
      </div>

      <div className="flex gap-8 items-start">
        <div className="relative">
          <Board
            gameState={gameState}
            validMoves={validMoves}
            selectedNode={selectedNode}
            onNodeClick={handleNodeClick}
            animation={animation}
          />
          {aiThinking && !animation && (
            <div className="absolute top-4 right-4 bg-white/80 px-2 py-1 rounded shadow text-xs font-bold animate-pulse text-stone-600">
              {t('actions.thinking')}
            </div>
          )}
        </div>

        <div className="w-64 p-4 bg-white rounded-xl shadow-lg">
          <h2 className="text-xl font-bold mb-2">{t('status.title')}</h2>
          <div className="mb-2">{t('status.mode', { mode: gameMode })}</div>
          <div className="mb-2">{t('status.turn', { player: gameState.currentPlayer === 'black' ? t('players.black') : t('players.white') })}</div>
          {gameState.winner && (
            <div className="p-2 bg-green-100 text-green-800 rounded font-bold text-center">
              {t('status.winner', { winner: gameState.winner === 'black' ? t('players.black') : t('players.white') })}
            </div>
          )}

          <div className="mt-4 text-sm text-gray-600">
            <p className="mb-1"><strong>{t('status.counts')}</strong></p>
            <div className="flex justify-between">
              <span>{t('players.black')}: {Object.values(gameState.pieces).filter(p => p.player === 'black').length}</span>
              <span>{t('players.white')}: {Object.values(gameState.pieces).filter(p => p.player === 'white').length}</span>
            </div>
          </div>

          <div className="mt-8 text-xs text-stone-500">
            <p><strong>{t('rules.title')}</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li>{t('rules.lineMovement')}</li>
              <li>{t('rules.shoulderPole')}</li>
              <li>{t('rules.clamp')}</li>
              <li>{t('rules.priority')}</li>
              <li>{t('rules.win')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
