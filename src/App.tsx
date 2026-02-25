/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  RotateCcw, 
  Trophy, 
  Clock, 
  Settings, 
  ChevronLeft,
  Info,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Constants ---
const GRID_COLS = 6;
const GRID_ROWS = 10;
const INITIAL_ROWS = 4;
const TARGET_MIN = 10;
const TARGET_MAX = 30;
const TIME_MODE_SECONDS = 10;

type GameMode = 'classic' | 'time';
type GameState = 'menu' | 'playing' | 'gameover';
type Language = 'en' | 'zh' | 'zh-tw';

const translations = {
  en: {
    score: 'Score',
    target: 'Target',
    timeLeft: 'Time Left',
    currentSum: 'Current Sum',
    classicMode: 'Classic Mode',
    timeRush: 'Time Rush',
    howToPlay: 'How to Play',
    step1: 'Select numbers that add up to the target.',
    step2: "Numbers don't need to be adjacent.",
    step3: 'Clear blocks before they reach the top!',
    best: 'Best',
    gameOver: 'Game Over',
    reachedTop: 'The blocks reached the top!',
    finalScore: 'Final Score',
    bestScore: 'Best Score',
    tryAgain: 'Try Again',
    mainMenu: 'Main Menu',
    tapToSelect: 'Tap to select',
    clearSelection: 'Clear selection',
    settings: 'Settings',
    language: 'Language',
    description: "Combine numbers to reach the target.\nDon't let them reach the top!",
    bestPlayed: 'Best played in portrait',
    creator: 'Creator',
    creatorName: 'Yinfeng',
    version: 'Version',
    themeColor: 'Theme Color',
    music: 'Music',
    testSound: 'Test Sound',
    on: 'On',
    off: 'Off'
  },
  zh: {
    score: '分数',
    target: '目标',
    timeLeft: '剩余时间',
    currentSum: '当前总和',
    classicMode: '经典模式',
    timeRush: '计时模式',
    howToPlay: '玩法介绍',
    step1: '选择数字，使其总和等于目标数字。',
    step2: '数字无需相邻，可任意组合。',
    step3: '在方块到达顶部前将其消除！',
    best: '最高',
    gameOver: '游戏结束',
    reachedTop: '方块已触顶！',
    finalScore: '最终得分',
    bestScore: '最高得分',
    tryAgain: '再试一次',
    mainMenu: '主菜单',
    tapToSelect: '点击选择数字',
    clearSelection: '清除选择',
    settings: '设置',
    language: '语言',
    description: '组合数字以达到目标。\n不要让它们到达顶部！',
    bestPlayed: '竖屏体验更佳',
    creator: '游戏设置者',
    creatorName: '尹锋',
    version: '版本号',
    themeColor: '主题颜色',
    music: '背景音乐',
    testSound: '测试音效',
    on: '开启',
    off: '关闭'
  },
  'zh-tw': {
    score: '分數',
    target: '目標',
    timeLeft: '剩餘時間',
    currentSum: '當前總和',
    classicMode: '經典模式',
    timeRush: '計時模式',
    howToPlay: '玩法介紹',
    step1: '選擇數字，使其總和等於目標數字。',
    step2: '數字無需相鄰，可任意組合。',
    step3: '在方塊到達頂部前將其消除！',
    best: '最高',
    gameOver: '遊戲結束',
    reachedTop: '方塊已觸頂！',
    finalScore: '最終得分',
    bestScore: '最高得分',
    tryAgain: '再試一次',
    mainMenu: '主菜單',
    tapToSelect: '點擊選擇數字',
    clearSelection: '清除選擇',
    settings: '設置',
    language: '語言',
    description: '組合數字以達到目標。\n不要讓它們到達頂部！',
    bestPlayed: '豎屏體驗更佳',
    creator: '遊戲設置者',
    creatorName: '尹鋒',
    version: '版本號',
    themeColor: '主題顏色',
    music: '背景音樂',
    testSound: '測試音效',
    on: '開啟',
    off: '關閉'
  }
};

const THEME_COLORS = [
  { name: 'Dark', value: '#121214' },
  { name: 'Midnight', value: '#0f172a' },
  { name: 'Forest', value: '#064e3b' },
  { name: 'Deep Purple', value: '#2e1065' },
  { name: 'Slate', value: '#1e293b' }
];

interface BlockData {
  id: string;
  value: number;
  isNew?: boolean;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [mode, setMode] = useState<GameMode>('classic');
  const [lang, setLang] = useState<Language>('en');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [themeColor, setThemeColor] = useState(THEME_COLORS[0].value);
  const [isMusicOn, setIsMusicOn] = useState(true);
  const [grid, setGrid] = useState<(BlockData | null)[][]>([]);
  const [target, setTarget] = useState<number>(0);
  const [selected, setSelected] = useState<{ r: number; c: number }[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_MODE_SECONDS);
  const [highScore, setHighScore] = useState(0);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const selectSoundRef = useRef<HTMLAudioElement | null>(null);
  const successSoundRef = useRef<HTMLAudioElement | null>(null);
  const errorSoundRef = useRef<HTMLAudioElement | null>(null);

  const t = (key: keyof typeof translations['en']) => translations[lang][key];

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Audio Logic ---
  useEffect(() => {
    // Initialize BGM
    if (!audioRef.current) {
      // Using a more stable URL
      audioRef.current = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = 0.1;
    }

    // Initialize SFX
    if (!selectSoundRef.current) {
      selectSoundRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-modern-technology-select-3124.mp3');
      selectSoundRef.current.volume = 0.4;
      selectSoundRef.current.load();
    }
    if (!successSoundRef.current) {
      successSoundRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3');
      successSoundRef.current.volume = 0.4;
      successSoundRef.current.load();
    }
    if (!errorSoundRef.current) {
      errorSoundRef.current = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3');
      errorSoundRef.current.volume = 0.2;
      errorSoundRef.current.load();
    }

    const playBGM = () => {
      if (isMusicOn && audioRef.current) {
        const promise = audioRef.current.play();
        if (promise !== undefined) {
          promise.then(() => {
            setIsAudioBlocked(false);
          }).catch(e => {
            console.log("Autoplay prevented. Waiting for interaction.", e);
            setIsAudioBlocked(true);
          });
        }
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
    };

    playBGM();

    // Global click listener to unlock audio
    const handleGlobalClick = () => {
      console.log("Global click detected, unlocking audio...");
      setIsAudioBlocked(false);
      
      // Resume Web Audio API context if it exists
      try {
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        const tempCtx = new AudioContextClass();
        if (tempCtx.state === 'suspended') {
          tempCtx.resume();
        }
      } catch (e) {}

      if (isMusicOn && audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
      // Pre-play SFX to unlock them as well
      [selectSoundRef, successSoundRef, errorSoundRef].forEach(ref => {
        if (ref.current) {
          ref.current.play().then(() => {
            ref.current!.pause();
            ref.current!.currentTime = 0;
          }).catch(() => {});
        }
      });
      window.removeEventListener('click', handleGlobalClick);
    };
    window.addEventListener('click', handleGlobalClick);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [isMusicOn]);

  const playSFX = (sound: 'select' | 'success' | 'error') => {
    if (!isMusicOn) {
      console.log("SFX skipped because music is off");
      return;
    }
    
    // Fallback Synthesizer using Web Audio API
    const playSynth = (type: 'select' | 'success' | 'error') => {
      try {
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;

        if (type === 'select') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
        } else if (type === 'success') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
          osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
        } else if (type === 'error') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        }
      } catch (e) {
        console.error("Synth failed", e);
      }
    };

    let audio: HTMLAudioElement | null = null;
    if (sound === 'select') audio = selectSoundRef.current;
    if (sound === 'success') audio = successSoundRef.current;
    if (sound === 'error') audio = errorSoundRef.current;

    if (audio) {
      console.log(`Attempting to play SFX: ${sound}`);
      audio.currentTime = 0;
      audio.play().catch(e => {
        console.warn(`External SFX ${sound} failed, using synth fallback`, e);
        playSynth(sound);
      });
    } else {
      console.log(`Audio object for ${sound} not found, using synth`);
      playSynth(sound);
    }
  };

  // --- Initialization ---
  const generateTarget = useCallback(() => {
    return Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1)) + TARGET_MIN;
  }, []);

  const generateRow = useCallback(() => {
    const row: (BlockData | null)[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      row.push({
        id: Math.random().toString(36).substr(2, 9),
        value: Math.floor(Math.random() * 9) + 1,
        isNew: true
      });
    }
    return row;
  }, []);

  const startGame = (selectedMode: GameMode) => {
    // Resume audio context or play on first interaction
    if (isMusicOn && audioRef.current) {
      audioRef.current.play().catch(e => console.log("Audio play blocked", e));
    }

    const initialGrid: (BlockData | null)[][] = Array.from({ length: GRID_ROWS }, () => 
      Array.from({ length: GRID_COLS }, () => null)
    );
    
    // Fill initial rows at the bottom
    for (let r = GRID_ROWS - INITIAL_ROWS; r < GRID_ROWS; r++) {
      initialGrid[r] = generateRow();
    }

    setGrid(initialGrid);
    setTarget(generateTarget());
    setScore(0);
    setMode(selectedMode);
    setGameState('playing');
    setSelected([]);
    setTimeLeft(TIME_MODE_SECONDS);
  };

  const checkGameOver = (currentGrid: (BlockData | null)[][]) => {
    // If any block is in the top row, it's game over
    return currentGrid[0].some(cell => cell !== null);
  };

  const addRow = useCallback(() => {
    setGrid(prev => {
      const newGrid = prev.map((row, r) => {
        if (r === 0) return row; // Top row will be checked for game over
        return prev[r];
      });

      // Shift everything up
      const shiftedGrid = prev.slice(1);
      shiftedGrid.push(generateRow());

      if (checkGameOver(prev)) {
        setGameState('gameover');
        return prev;
      }

      return shiftedGrid;
    });
    
    if (mode === 'time') {
      setTimeLeft(TIME_MODE_SECONDS);
    }
  }, [generateRow, mode]);

  // --- Game Logic ---
  const handleBlockClick = (r: number, c: number) => {
    if (gameState !== 'playing') return;
    const block = grid[r][c];
    if (!block) return;

    playSFX('select');

    const isAlreadySelected = selected.some(s => s.r === r && s.c === c);
    let newSelected;

    if (isAlreadySelected) {
      newSelected = selected.filter(s => !(s.r === r && s.c === c));
    } else {
      newSelected = [...selected, { r, c }];
    }

    const currentSum = newSelected.reduce((sum, s) => sum + (grid[s.r][s.c]?.value || 0), 0);

    if (currentSum === target) {
      // Success!
      playSFX('success');
      const points = newSelected.length * 10;
      setScore(s => s + points);
      
      // Remove blocks
      const nextGrid = grid.map((row, ri) => 
        row.map((cell, ci) => 
          newSelected.some(s => s.r === ri && s.c === ci) ? null : cell
        )
      );

      // Apply gravity (optional, but Blokmatik usually doesn't have gravity, 
      // blocks just stay where they are until a new row pushes them up)
      // However, we need to handle the "Classic Mode" rule: "add row after success"
      
      setGrid(nextGrid);
      setSelected([]);
      setTarget(generateTarget());
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#f59e0b']
      });

      if (mode === 'classic') {
        // In classic mode, adding a row happens after each successful sum
        // We delay it slightly for visual feedback
        setTimeout(() => {
          addRow();
        }, 300);
      } else {
        // In time mode, we reset the timer
        setTimeLeft(TIME_MODE_SECONDS);
      }
    } else if (currentSum > target) {
      // Exceeded target, clear selection
      playSFX('error');
      setSelected([]);
    } else {
      setSelected(newSelected);
    }
  };

  // --- Timers ---
  useEffect(() => {
    if (gameState === 'playing' && mode === 'time') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            addRow();
            return TIME_MODE_SECONDS;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, mode, addRow]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
    }
  }, [score, highScore]);

  // --- Render Helpers ---
  const currentSum = selected.reduce((sum, s) => sum + (grid[s.r][s.c]?.value || 0), 0);

  return (
    <div 
      className="min-h-screen text-white font-sans selection:bg-emerald-500/30 flex flex-col items-center justify-center p-4 overflow-hidden transition-colors duration-700"
      style={{ backgroundColor: themeColor }}
    >
      
      {/* Background Decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6">
        
        {/* Header Section */}
        {gameState === 'playing' && (
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setGameState('menu')}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">{t('score')}</span>
                <span className="text-3xl font-black font-mono tracking-tighter">{score}</span>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-1">{t('target')}</span>
                <motion.span 
                  key={target}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-black text-emerald-400"
                >
                  {target}
                </motion.span>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 mb-1">
                  {mode === 'time' ? t('timeLeft') : t('currentSum')}
                </span>
                {mode === 'time' ? (
                  <motion.div 
                    key={timeLeft}
                    className={cn(
                      "text-4xl font-black font-mono",
                      timeLeft <= 3 ? "text-red-500 animate-pulse" : "text-blue-400"
                    )}
                  >
                    {timeLeft}s
                  </motion.div>
                ) : (
                  <motion.span 
                    key={currentSum}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "text-4xl font-black",
                      currentSum > target ? "text-red-500" : "text-blue-400"
                    )}
                  >
                    {currentSum}
                  </motion.span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Game Board */}
        <div className="relative aspect-[6/10] w-full bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
          <AnimatePresence mode="popLayout">
            {gameState === 'menu' && (
              <motion.div 
                key="menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="absolute top-4 right-4">
                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <Settings className="w-6 h-6 text-white/40" />
                  </button>
                </div>

                <div className="mb-8">
                  <motion.div 
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mx-auto mb-4"
                  >
                    <Zap className="w-10 h-10 text-white fill-white" />
                  </motion.div>
                  <h1 className="text-4xl font-black tracking-tighter mb-2">SumBlock</h1>
                  <p className="text-white/50 text-sm leading-relaxed whitespace-pre-line">
                    {t('description')}
                  </p>
                </div>

                {isAudioBlocked && (
                  <motion.button
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={() => {
                      setIsAudioBlocked(false);
                      if (audioRef.current) audioRef.current.play().catch(() => {});
                    }}
                    className="mb-6 flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/50 rounded-full text-amber-400 text-xs font-bold uppercase tracking-widest animate-pulse"
                  >
                    <Info className="w-4 h-4" />
                    Click to Enable Sound
                  </motion.button>
                )}

                <div className="flex flex-col w-full gap-3">
                  <button 
                    onClick={() => startGame('classic')}
                    className="group relative w-full bg-white text-black font-bold py-4 rounded-2xl overflow-hidden transition-transform active:scale-95"
                  >
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      <Play className="w-5 h-5 fill-current" />
                      {t('classicMode')}
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => startGame('time')}
                    className="group relative w-full bg-white/10 border border-white/10 hover:bg-white/20 font-bold py-4 rounded-2xl transition-all active:scale-95"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="w-5 h-5" />
                      {t('timeRush')}
                    </div>
                  </button>
                </div>

                <div className="mt-8 p-4 bg-white/5 border border-white/5 rounded-2xl w-full">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3 flex items-center gap-2">
                    <Info className="w-3 h-3" />
                    {t('howToPlay')}
                  </h3>
                  <ul className="text-left text-[11px] text-white/60 space-y-2">
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">01</span>
                      {t('step1')}
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">02</span>
                      {t('step2')}
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">03</span>
                      {t('step3')}
                    </li>
                  </ul>
                </div>

                {highScore > 0 && (
                  <div className="mt-8 flex items-center gap-2 text-white/40">
                    <Trophy className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">{t('best')}: {highScore}</span>
                  </div>
                )}
              </motion.div>
            )}

            {gameState === 'playing' && (
              <motion.div 
                key="playing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-6 grid-rows-10 h-full w-full p-2 gap-1"
              >
                {grid.map((row, r) => 
                  row.map((block, c) => (
                    <div key={`${r}-${c}`} className="relative">
                      <AnimatePresence>
                        {block && (
                          <motion.button
                            layoutId={block.id}
                            onClick={() => handleBlockClick(r, c)}
                            initial={block.isNew ? { y: 40, opacity: 0 } : { scale: 0.8, opacity: 0 }}
                            animate={{ 
                              y: 0, 
                              opacity: 1,
                              scale: selected.some(s => s.r === r && s.c === c) ? 0.9 : 1
                            }}
                            exit={{ 
                              scale: 1.5, 
                              opacity: 0,
                              filter: 'brightness(2)',
                              transition: { duration: 0.2 }
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={cn(
                              "w-full h-full rounded-lg flex items-center justify-center text-lg font-black transition-all",
                              selected.some(s => s.r === r && s.c === c)
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-2 ring-white/50"
                                : "bg-white/10 text-white/90 hover:bg-white/20 border border-white/5"
                            )}
                          >
                            {block.value}
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {gameState === 'gameover' && (
              <motion.div 
                key="gameover"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/60 backdrop-blur-md"
              >
                <div className="mb-6">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <RotateCcw className="w-8 h-8 text-red-500" />
                  </div>
                  <h2 className="text-3xl font-black mb-1">{t('gameOver')}</h2>
                  <p className="text-white/50 text-sm">{t('reachedTop')}</p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-white/40 text-xs font-bold uppercase tracking-widest">{t('finalScore')}</span>
                    <span className="text-2xl font-black">{score}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/40 text-xs font-bold uppercase tracking-widest">{t('bestScore')}</span>
                    <span className="text-2xl font-black text-emerald-400">{highScore}</span>
                  </div>
                </div>

                <button 
                  onClick={() => startGame(mode)}
                  className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  <RotateCcw className="w-5 h-5" />
                  {t('tryAgain')}
                </button>
                
                <button 
                  onClick={() => setGameState('menu')}
                  className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl transition-all"
                >
                  {t('mainMenu')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer / Instructions */}
        {gameState === 'playing' && (
          <div className="flex items-center justify-center gap-6 text-white/30">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{t('tapToSelect')}</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 cursor-pointer hover:text-white transition-colors" onClick={() => setSelected([])} />
              <span className="text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:text-white transition-colors" onClick={() => setSelected([])}>{t('clearSelection')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1a1a1e] border border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tight">{t('settings')}</h2>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 rotate-180" />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-3 block">
                    {t('language')}
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button 
                      onClick={() => setLang('en')}
                      className={cn(
                        "py-3 rounded-xl font-bold transition-all",
                        lang === 'en' ? "bg-white text-black" : "bg-white/5 border border-white/10 hover:bg-white/10"
                      )}
                    >
                      English
                    </button>
                    <button 
                      onClick={() => setLang('zh')}
                      className={cn(
                        "py-3 rounded-xl font-bold transition-all",
                        lang === 'zh' ? "bg-white text-black" : "bg-white/5 border border-white/10 hover:bg-white/10"
                      )}
                    >
                      简体中文
                    </button>
                    <button 
                      onClick={() => setLang('zh-tw')}
                      className={cn(
                        "py-3 rounded-xl font-bold transition-all",
                        lang === 'zh-tw' ? "bg-white text-black" : "bg-white/5 border border-white/10 hover:bg-white/10"
                      )}
                    >
                      繁體中文
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-3 block">
                    {t('music')}
                  </label>
                  <button 
                    onClick={() => setIsMusicOn(!isMusicOn)}
                    className={cn(
                      "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                      isMusicOn ? "bg-emerald-500 text-white" : "bg-white/5 border border-white/10 hover:bg-white/10"
                    )}
                  >
                    {isMusicOn ? t('on') : t('off')}
                  </button>
                  <button 
                    onClick={() => {
                      playSFX('select');
                      confetti({ particleCount: 10, spread: 20, origin: { y: 0.8 } });
                    }}
                    className="w-full mt-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                  >
                    {t('testSound')}
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-3 block">
                    {t('themeColor')}
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {THEME_COLORS.map(color => (
                      <button 
                        key={color.value}
                        onClick={() => setThemeColor(color.value)}
                        className={cn(
                          "aspect-square rounded-full border-2 transition-all",
                          themeColor === color.value ? "border-white scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-white/40 uppercase tracking-widest">{t('creator')}</span>
                    <span className="font-bold">{t('creatorName')}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-white/40 uppercase tracking-widest">{t('version')}</span>
                    <span className="font-bold">V1.0</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="mt-10 w-full bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/20 transition-transform active:scale-95"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Hint */}
      <div className="fixed bottom-4 left-0 right-0 text-center lg:hidden pointer-events-none">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">{t('bestPlayed')}</p>
      </div>
    </div>
  );
}
