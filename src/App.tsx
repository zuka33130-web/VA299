/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  Check,
  ChevronRight,
  Gamepad2,
  KeyRound,
  Layers,
  Palette,
  Save,
  Settings,
  Sparkles,
  Unlock,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { retroAudio } from './audio/retroAudio';
import { bgmEngine } from './audio/bgmEngine';
import { KeybindingsSettingsPanel } from './controls/KeybindingsSettingsPanel';
import { Breakout1976Stage } from './stages/Breakout1976Stage';
import { Asteroids1979Stage } from './stages/Asteroids1979Stage';
import { SeaWolf1976Stage } from './stages/SeaWolf1976Stage';
import { Tank1974Stage } from './stages/Tank1974Stage';
import { LunarLander1979Stage } from './stages/LunarLander1979Stage';
import { HD2DDonkeyKongStage } from './stages/DonkeyKongStage';
import { HD2DSpaceInvadersStage } from './stages/SpaceInvadersStage';
import { EpicCinematicStage } from './stages/EpicCinematicStage';
import { GlitchTrailStage } from './stages/GlitchTrailStage';
import { Pong1972Stage } from './stages/Pong1972Stage';
import { NightDriver1976Stage } from './stages/NightDriver1976Stage';
import { Galaxian1979Stage } from './stages/Galaxian1979Stage';
import { CircuitoAnfibio1979Stage } from './stages/CircuitoAnfibio1979Stage';
import { IslaNatalStage } from './stages/IslaNatalStage';
import { Origin70sIsland, Island70sArrivalMode } from './island/Origin70sIsland';
import { ISLA_NATAL_FLAGS } from './island/islaNatalData';
import { MainMenu, NewGameConfirmDialog } from './menu/MainMenu';
import { drawPixelAvatar4Dir } from './island/island70sRenderer';
import type { FacingDirection } from './rpg/rpgContent';
import {
  ACCESSORIES,
  AvatarAppearance,
  AvatarChoice,
  BOOT_SWATCHES,
  DEFAULT_AVATAR_APPEARANCE,
  HAIR_SWATCHES,
  OUTFITS,
  SHIRT_SWATCHES,
  SKIN_SWATCHES,
  TRANSFORMATIONS,
} from './avatar/avatarOptions';
import {
  BREAKOUT_UNLOCK_SCORE,
  calmGuardianCreature,
  collectUniqueMemoryDiamond,
  discoverInvestigationClue,
  discoverRpgSecret,
  grantPongBoardAbility,
  grantInventoryItems,
  consumeInventoryItems,
  loadProgressState,
  markCeremonyCompleted,
  markGameStarted,
  markTransitionFinished,
  openRpgChest,
  PixelverseProgressState,
  purchasePowerUpgrade,
  rechargeAllPowers,
  recordEchoDiscovered,
  recordGameVictory,
  recordGlobalManualSave,
  recordIslandSwitchActivated,
  recordIslandZoneVisited,
  recordManualSave80sCheckpoint,
  recordManualSaveCheckpoint,
  recordMuseumExhibitInspected,
  recordNarrativeEvent,
  recordNpcTalked,
  repairRpgMechanism,
  resetProgressState,
  restoreCuatroCaminosState,
  saveLast80sCoordinates,
  saveLastIslandCoordinates,
  savePlayerOptions,
  saveStageCheckpoint,
  setEquippedCosmetic,
  setRpgFlag,
  solveInvestigationCase,
  solveRpgPuzzle,
  togglePhosphorLanternState,
  updatePowerEnergy,
  updateQuestStatus,
} from './memories/progressionState';

type IslandArrivalMode = Island70sArrivalMode;

type ViewStateId =
  | 'state-cinematic'
  | 'state-title'
  | 'state-avatar'
  | 'state-isla-natal'
  | 'state-pong'
  | 'state-breakout'
  | 'state-asteroids'
  | 'state-seawolf'
  | 'state-tank'
  | 'state-lunar-lander'
  | 'state-archipelago'
  | 'state-platformer'
  | 'state-invaders'
  | 'state-dk-classic'
  | 'state-night-driver'
  | 'state-galaxian'
  | 'state-frogger';

const MASTER_SERIAL = 'zudoka26';
const SECRET_KEY_SEQUENCE = ['w', 's', 'a', 'd', 'w', 's', 'a', 'd', 'w', 's', 'd', 'a'];
const CODE_BUTTON_REVEAL_KEY = 'pixelverse_code_button_revealed_v2';

const UNLOCKABLE_LEVELS: {
  id: ViewStateId;
  code: string;
  title: string;
  subtitle: string;
}[] = [
  {
    id: 'state-cinematic',
    code: 'EST-01',
    title: 'Cinemática 64-Bit SEGA',
    subtitle: '«Cuando el mundo olvidó jugar»',
  },
  {
    id: 'state-avatar',
    code: 'EST-03',
    title: 'Creador de Arquitecto',
    subtitle: 'Personalizar Avatar',
  },
  {
    id: 'state-isla-natal',
    code: 'ISL-00',
    title: 'Isla Natal · El arcade que esperó su momento',
    subtitle: 'Zona inicial: la cabaña, la arboleda y el viejo gabinete',
  },
  {
    id: 'state-archipelago',
    code: 'MAP-70',
    title: 'Isla del Origen · Aventura HD-2D (70s y 80s)',
    subtitle: 'Museo Viviente, Laberinto 1976, Cuevas e Isla Neón',
  },
  {
    id: 'state-pong',
    code: 'NIV-01',
    title: 'Pong (1972)',
    subtitle: 'Santuario Clásico Atari · Meta 3 Goles',
  },
  {
    id: 'state-breakout',
    code: 'ARC-76',
    title: 'Breakout (1976) · Secreto',
    subtitle: 'Sala Secreta de las Cuatro Bandas · Meta 400 PTS',
  },
  {
    id: 'state-seawolf',
    code: 'NAV-76',
    title: 'Sea Wolf (1976)',
    subtitle: 'Simulación Naval Periscopio · Meta 400 PTS',
  },
  {
    id: 'state-tank',
    code: 'TAK-74',
    title: 'Tank (1974)',
    subtitle: 'Duelo de Laberinto y Orugas · Meta 500 PTS',
  },
  {
    id: 'state-asteroids',
    code: 'AST-79',
    title: 'Asteroids (1979)',
    subtitle: 'Inercia Vectorial QuadraScan · Meta 600 PTS',
  },
  {
    id: 'state-lunar-lander',
    code: 'LND-79',
    title: 'Lunar Lander (1979)',
    subtitle: 'Alunizaje de Precisión · Meta 500 PTS',
  },
  {
    id: 'state-platformer',
    code: 'NIV-02',
    title: 'El Sendero del Glitch Perdido',
    subtitle: 'Aventura, Prismas y Cartógrafo',
  },
  {
    id: 'state-invaders',
    code: 'NIV-03',
    title: 'Space Invaders (1978)',
    subtitle: 'Fortaleza Taito · Meta 1000 PTS',
  },
  {
    id: 'state-dk-classic',
    code: 'ARC-81',
    title: 'Isla Neón 1980s · Donkey Kong',
    subtitle: 'Gabinete Vertical 1981 · Vigas Rojas',
  },
  {
    id: 'state-night-driver',
    code: 'DRV-76',
    title: 'Night Driver (1976)',
    subtitle: 'Conducción Nocturna · 3 Transistores de Germanio',
  },
  {
    id: 'state-galaxian',
    code: 'GLX-79',
    title: 'Galaxian (1979)',
    subtitle: 'Enjambre Espacial RGB · Meta 500 PTS',
  },
  {
    id: 'state-frogger',
    code: 'CRC-79',
    title: 'Cruce de Circuitos (1979) · Prototipo',
    subtitle: 'Bosque de las Señales · 3 pads · Pieza del Generador',
  },
];


/* =========================================
   GESTOR PRINCIPAL DE ESTADOS (GAME MANAGER)
   Controla las secciones mediante .view-state / .active
   ========================================= */
class GameManager {
  private currentState: ViewStateId = 'state-cinematic';
  private allStates: ViewStateId[] = [
    'state-cinematic',
    'state-title',
    'state-avatar',
    'state-isla-natal',
    'state-pong',
    'state-breakout',
    'state-asteroids',
    'state-seawolf',
    'state-tank',
    'state-lunar-lander',
    'state-archipelago',
    'state-platformer',
    'state-invaders',
    'state-dk-classic',
    'state-night-driver',
    'state-galaxian',
    'state-frogger',
  ];
  private listener?: (state: ViewStateId) => void;
  private swapTimer: number | null = null;
  private endTimer: number | null = null;

  private static readonly SWAP_DELAY_MS = 275;
  private static readonly TOTAL_DURATION_MS = 565;

  constructor(listener?: (state: ViewStateId) => void) {
    this.listener = listener;
  }

  public getState(): ViewStateId {
    return this.currentState;
  }

  private applyState(nextState: ViewStateId): void {
    this.currentState = nextState;

    for (const id of this.allStates) {
      const el = document.getElementById(id);
      if (el) {
        if (id === nextState) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    }

    if (this.listener) {
      this.listener(nextState);
    }
  }

  public transitionTo(
    nextState: ViewStateId,
    options?: { immediate?: boolean }
  ): void {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (options?.immediate || prefersReducedMotion || typeof document === 'undefined') {
      this.clearTimers();
      const overlay =
        typeof document !== 'undefined'
          ? document.getElementById('iris-wipe-overlay')
          : null;
      overlay?.classList.remove('iris-wipe-active');
      this.applyState(nextState);
      return;
    }

    const overlay = document.getElementById('iris-wipe-overlay');
    if (!overlay) {
      this.applyState(nextState);
      return;
    }

    this.clearTimers();

    // Reiniciar animación CSS de Iris Out / Pixel Wipe de forma determinista
    overlay.classList.remove('iris-wipe-active');
    void overlay.offsetWidth;
    overlay.classList.add('iris-wipe-active');

    // Conmutar vista exactamente en el cierre total del iris (pantalla cubierta)
    this.swapTimer = window.setTimeout(() => {
      this.swapTimer = null;
      this.applyState(nextState);
    }, GameManager.SWAP_DELAY_MS);

    // Liberar cortina al concluir la apertura escalonada (Iris In)
    this.endTimer = window.setTimeout(() => {
      this.endTimer = null;
      overlay.classList.remove('iris-wipe-active');
    }, GameManager.TOTAL_DURATION_MS);
  }

  public clearTimers(): void {
    if (typeof window === 'undefined') return;
    if (this.swapTimer !== null) {
      window.clearTimeout(this.swapTimer);
      this.swapTimer = null;
    }
    if (this.endTimer !== null) {
      window.clearTimeout(this.endTimer);
      this.endTimer = null;
    }
  }
}

/* =========================================
   GUARDA DE ESCENA: evita que un fallo de render deje la pantalla en blanco
   ========================================= */
class SceneGuard extends React.Component<
  { children: React.ReactNode; sceneLabel: string; onRecover: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[PIXELVERSE] La escena se interrumpió:', error);
  }

  private handleRecover = () => {
    this.setState({ failed: false });
    this.props.onRecover();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#020614] p-6 text-center">
        <p className="font-mono text-sm font-bold text-cyan-100">
          La escena se interrumpió, pero tu partida sigue intacta.
        </p>
        <p className="font-mono text-xs text-slate-300">{this.props.sceneLabel}</p>
        <button
          type="button"
          onClick={this.handleRecover}
          className="btn-ui cursor-pointer rounded px-5 py-2 text-xs font-bold"
        >
          Volver a la isla
        </button>
      </div>
    );
  }
}

/* =========================================
   CONSTANTES DE AVATAR 2D Y SPRITES PIXEL-ART
   ========================================= */
function PixelCharacterPreview({ skinColor, hairColor, shirtColor, appearance }: {
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  appearance: AvatarAppearance;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [facing, setFacing] = useState<FacingDirection>('down');
  const [walking, setWalking] = useState(false);
  const walkTimerRef = useRef<number | null>(null);

  const previewDirection = useCallback((direction: FacingDirection) => {
    setFacing(direction);
    setWalking(true);
    if (walkTimerRef.current !== null) window.clearTimeout(walkTimerRef.current);
    walkTimerRef.current = window.setTimeout(() => {
      walkTimerRef.current = null;
      setWalking(false);
    }, 520);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let animationId = 0;
    const render = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawPixelAvatar4Dir(ctx, 24, 49, facing, walking, false, now / 1000, skinColor, hairColor, shirtColor, { appearance });
      animationId = window.requestAnimationFrame(render);
    };
    animationId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [facing, walking, hairColor, shirtColor, skinColor, appearance]);

  useEffect(() => () => {
    if (walkTimerRef.current !== null) window.clearTimeout(walkTimerRef.current);
  }, []);

  const handleDirectionKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const directionByKey: Record<string, FacingDirection> = {
      ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right',
    };
    const direction = directionByKey[event.key];
    if (!direction) return;
    event.preventDefault();
    previewDirection(direction);
  };

  const directions: { direction: FacingDirection; label: string }[] = [
    { direction: 'up', label: 'Atras' },
    { direction: 'left', label: 'Izquierda' },
    { direction: 'down', label: 'Frente' },
    { direction: 'right', label: 'Derecha' },
  ];

  return (
    <div className="flex flex-col items-center" tabIndex={0} onKeyDown={handleDirectionKey} aria-label="Vista previa. Usa las flechas para mover a Pixel">
      <canvas
        ref={canvasRef}
        width={48}
        height={56}
        className="h-[min(46vh,22rem)] w-auto max-w-full [image-rendering:pixelated] drop-shadow-[0_14px_14px_rgba(0,0,0,0.65)]"
        aria-label={`Pixel, personaje explorador, vista ${directions.find((item) => item.direction === facing)?.label}`}
        role="img"
      />
      <div className="mt-3 grid grid-cols-4 gap-1" aria-label="Vista del personaje">
        {directions.map(({ direction, label }) => (
          <button
            key={direction}
            type="button"
            onClick={() => previewDirection(direction)}
            aria-pressed={facing === direction}
            aria-label={`Ver a Pixel de ${label.toLowerCase()}`}
            className={`border px-2 py-1 text-[9px] font-mono uppercase transition-colors ${facing === direction ? 'border-amber-300 bg-amber-300/15 text-amber-100' : 'border-cyan-100/15 text-slate-400 hover:border-cyan-200/60 hover:text-white'}`}
          >{label}</button>
        ))}
      </div>
      <span className="mt-2 text-[9px] font-mono tracking-[0.25em] text-cyan-100/55">PIXEL · EXPLORADOR</span>
    </div>
  );
}

function AvatarPaletteRow({ title, value, options, onSelect }: { title: string; value: string; options: { label: string; hex: string; bgClass: string }[]; onSelect: (hex: string) => void }) {
  const selected = options.find((option) => option.hex === value);
  return <fieldset className="border border-cyan-100/15 bg-[#06111d]/80 p-3 sm:p-4"><legend className="px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100">{title}</legend><div className="mb-3 flex items-center justify-between gap-2 font-mono text-[10px]"><span className="text-slate-500">ACTIVE SHADE</span><span className="text-amber-200">{selected?.label}</span></div><div className="grid grid-cols-6 gap-2 sm:grid-cols-8">{options.map((option) => { const active=option.hex===value; return <button key={option.hex} type="button" onClick={()=>{retroAudio.uiClick();onSelect(option.hex);}} aria-pressed={active} aria-label={title+': '+option.label} title={option.label} style={{borderColor:active?option.hex:undefined,boxShadow:active?'0 0 0 2px '+option.hex+'66, 0 0 12px '+option.hex+'55':undefined}} className={'aspect-square border-2 p-1 transition-transform hover:scale-110 '+(active?'scale-110':'border-white/20')}><span className={'block h-full w-full border border-black/35 '+option.bgClass}/></button>;})}</div></fieldset>;
}

function AvatarChoiceSprite({ choice, category, skinColor, hairColor, shirtColor, appearance }: { choice: AvatarChoice; category: 'outfit'|'accessory'|'transformation'; skinColor: string; hairColor: string; shirtColor: string; appearance: AvatarAppearance }) {
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  useEffect(()=>{const ctx=canvasRef.current?.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,48,56);const sample:AvatarAppearance={...appearance,outfitId:category==='outfit'?choice.id:appearance.outfitId,accessories:category==='accessory'?Array.from(new Set([...appearance.accessories,choice.id])):appearance.accessories,transformationId:category==='transformation'?choice.id:appearance.transformationId};drawPixelAvatar4Dir(ctx,24,49,'down',false,false,1.2,skinColor,hairColor,shirtColor,{appearance:sample,reducedMotion:true});},[appearance,category,choice.id,hairColor,shirtColor,skinColor]);
  return <canvas ref={canvasRef} width={48} height={56} className="h-16 w-[3.4rem] [image-rendering:pixelated]" aria-hidden="true"/>;
}

function AvatarChoiceGrid({ title, options, selected, category, onSelect, skinColor, hairColor, shirtColor, appearance }: { title: string; options: AvatarChoice[]; selected: string|null; category: 'outfit'|'accessory'|'transformation'; onSelect:(id:string)=>void; skinColor:string; hairColor:string; shirtColor:string; appearance:AvatarAppearance }) {
  return <div className="space-y-3"><div className="flex items-center justify-between font-mono text-[10px] tracking-[0.18em] text-cyan-100"><span>{title}</span><span className="text-slate-500">{options.length} DESIGNS</span></div><div className="grid grid-cols-2 gap-2 xl:grid-cols-3">{options.map(choice=>{const active=category==='accessory'?appearance.accessories.includes(choice.id):selected===choice.id;return <button key={choice.id} type="button" onClick={()=>onSelect(choice.id)} aria-pressed={active} className={'flex min-h-24 items-center gap-2 border p-2 text-left transition-colors '+(active?'border-amber-200 bg-amber-200/10 text-white':'border-white/10 bg-black/25 text-slate-300 hover:border-cyan-100/40')}><AvatarChoiceSprite choice={choice} category={category} skinColor={skinColor} hairColor={hairColor} shirtColor={shirtColor} appearance={appearance}/><span className="min-w-0"><span className="block truncate font-mono text-[10px] font-bold" style={{color:active?'#fde68a':choice.accent}}>{choice.name}</span><span className="mt-1 block text-[9px] leading-snug text-slate-500">{choice.description}</span></span></button>;})}</div></div>;
}

export default function App() {
  const managerRef = useRef<GameManager | null>(null);
  const breakoutReturnToNorthRef = useRef(false);
  const [windowReady, setWindowReady] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.readyState === 'complete' : false
  );
  const [activeState, setActiveState] = useState<ViewStateId>('state-cinematic');
  const [cinematicRunKey, setCinematicRunKey] = useState<number>(1);
  // La cinemática tiene dos actos: el prólogo cósmico (antes del avatar) y el
  // descenso a la cabaña (después de crear la identidad).
  const [cinematicSegment, setCinematicSegment] = useState<{ start: number; end: number }>({
    start: 0,
    end: 94,
  });
  const pendingEncounterIntroRef = useRef(false);
  // Estado persistente de aventura e historial
  const [progressState, setProgressState] = useState<PixelverseProgressState>(() =>
    loadProgressState()
  );

  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() =>
    Boolean(progressState.rpg.savedOptions?.audioMuted)
  );

  const [isGbGreenMode, setIsGbGreenMode] = useState<boolean>(
    () => Boolean(progressState.rpg.savedOptions?.gbGreenMode)
  );

  // Estado 3: Variables CSS de identidad del Arquitecto (persistidas en el guardado)
  const [playerName, setPlayerName] = useState<string>(
    () => progressState.rpg.savedOptions?.playerName || 'Pixel'
  );
  const [skinColor, setSkinColor] = useState<string>(
    () => progressState.rpg.savedOptions?.skinColor || SKIN_SWATCHES[0].hex
  );
  const [hairColor, setHairColor] = useState<string>(
    () => progressState.rpg.savedOptions?.hairColor || HAIR_SWATCHES[0].hex
  );
  const [shirtColor, setShirtColor] = useState<string>(
    () => progressState.rpg.savedOptions?.shirtColor || SHIRT_SWATCHES[0].hex
  );
  const [bootColor, setBootColor] = useState<string>(
    () => progressState.rpg.savedOptions?.bootColor || DEFAULT_AVATAR_APPEARANCE.bootColor
  );
  const [outfitId, setOutfitId] = useState<string>(
    () => progressState.rpg.savedOptions?.outfitId || DEFAULT_AVATAR_APPEARANCE.outfitId
  );
  const [accessories, setAccessories] = useState<string[]>(
    () => progressState.rpg.savedOptions?.accessories || DEFAULT_AVATAR_APPEARANCE.accessories
  );
  const [transformationId, setTransformationId] = useState<string | null>(
    () => progressState.rpg.savedOptions?.transformationId ?? DEFAULT_AVATAR_APPEARANCE.transformationId
  );
  const [avatarTab, setAvatarTab] = useState<'skin' | 'hair' | 'clothes' | 'boots' | 'outfits' | 'accessories' | 'rare'>('skin');
  const compatibleAccessories = useMemo(() => {
    const blocked = transformationId
      ? ['cap', 'hat', 'bandana', 'headphones', 'mask']
      : ['mage', 'pirate', 'cowboy', 'detective'].includes(outfitId)
        ? ['cap', 'hat', 'bandana', 'headphones']
        : [];
    return accessories.filter((id) => !blocked.includes(id));
  }, [accessories, outfitId, transformationId]);
  const avatarAppearance = useMemo<AvatarAppearance>(() => ({
    bootColor, outfitId, accessories: compatibleAccessories, transformationId,
  }), [bootColor, compatibleAccessories, outfitId, transformationId]);

  // Modo de entrada a Pong (con o sin intro de pelota blanca)
  const [pongSkipIntro, setPongSkipIntro] = useState<boolean>(false);

  const [islandArrivalMode, setIslandArrivalMode] =
    useState<IslandArrivalMode>('awakening');
  // Aviso de llegada al muelle norte de Isla Natal tras volver de Isla Origen.
  const [natalArrivalFromOrigen, setNatalArrivalFromOrigen] = useState<boolean>(false);
  const [achievementToast, setAchievementToast] = useState<string | null>(null);

  // Panel de Configuración (Sonido y Guardado de Partida)
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    locationLabel: string;
    timeLabel: string;
  } | null>(null);
  const saveFeedbackTimerRef = useRef<number | null>(null);
  const islandManualSaveRef = useRef<(() => string) | null>(null);

  // Desbloqueo maestro de niveles mediante serial y código secreto
  const [serialInput, setSerialInput] = useState<string>('');
  const [masterUnlocked, setMasterUnlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('pixelverse_master_unlocked') === 'true';
    } catch {
      return false;
    }
  });
  const [serialStatus, setSerialStatus] = useState<'idle' | 'error' | 'unlocked'>('idle');
  const [levelMenuOpen, setLevelMenuOpen] = useState<boolean>(false);
  const [codeModalOpen, setCodeModalOpen] = useState<boolean>(false);
  const [newGameConfirmOpen, setNewGameConfirmOpen] = useState<boolean>(false);

  // Estado para revelar el botón CODE en el menú inicial tras la secuencia WSADWSADWSDA
  const [codeButtonRevealed, setCodeButtonRevealed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(CODE_BUTTON_REVEAL_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [codeGlitchEffect, setCodeGlitchEffect] = useState<boolean>(false);
  const [pixelCeremonyActive, setPixelCeremonyActive] = useState<boolean>(false);
  const secretSequenceIndexRef = useRef<number>(0);

  useEffect(() => {
    if (document.readyState === 'complete') {
      setWindowReady(true);
      return;
    }
    const onWindowLoad = () => setWindowReady(true);
    window.addEventListener('load', onWindowLoad);
    return () => window.removeEventListener('load', onWindowLoad);
  }, []);

  useEffect(() => {
    if (!windowReady) return;

    if (progressState.rpg.savedOptions?.audioMuted) {
      bgmEngine.setMuted(true);
    } else {
      bgmEngine.initAndStart();
    }
    const unsubscribeBgm = bgmEngine.subscribe((muted) => {
      setIsAudioMuted(muted);
    });

    const gm = new GameManager((state) => {
      setActiveState(state);
    });
    managerRef.current = gm;
    gm.transitionTo('state-cinematic', { immediate: true });

    return () => {
      gm.clearTimers();
      unsubscribeBgm();
    };
  }, [windowReady]);

  // Registrar inicio de cada videojuego histórico sin duplicar recompensas
  useEffect(() => {
    if (activeState === 'state-pong') {
      setProgressState((prev) => markGameStarted(prev, 'pong'));
    } else if (activeState === 'state-breakout') {
      setProgressState((prev) => markGameStarted(prev, 'breakout'));
    } else if (activeState === 'state-platformer') {
      setProgressState((prev) => markGameStarted(prev, 'glitch-trail'));
    } else if (activeState === 'state-dk-classic') {
      setProgressState((prev) => markGameStarted(prev, 'donkey-kong'));
    } else if (activeState === 'state-invaders') {
      setProgressState((prev) => markGameStarted(prev, 'space-invaders'));
    } else if (activeState === 'state-night-driver') {
      setProgressState((prev) => markGameStarted(prev, 'night-driver'));
    } else if (activeState === 'state-galaxian') {
      setProgressState((prev) => markGameStarted(prev, 'galaxian'));
    }
  }, [activeState]);

  useEffect(() => {
    document.documentElement.style.setProperty('--avatar-skin', skinColor);
  }, [skinColor]);

  useEffect(() => {
    document.documentElement.style.setProperty('--avatar-hair', hairColor);
  }, [hairColor]);

  useEffect(() => {
    document.documentElement.style.setProperty('--avatar-shirt', shirtColor);
  }, [shirtColor]);

  // Persistir opciones visuales, audio y paleta del jugador en el sistema de guardado
  useEffect(() => {
    setProgressState((prev) =>
      savePlayerOptions(prev, {
        skinColor,
        hairColor,
        shirtColor,
        playerName,
        bootColor,
        outfitId,
        accessories,
        transformationId,
        gbGreenMode: isGbGreenMode,
        audioMuted: isAudioMuted,
      })
    );
  }, [playerName, skinColor, hairColor, shirtColor, bootColor, outfitId, accessories, transformationId, isGbGreenMode, isAudioMuted]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable ||
        Boolean(target.closest('[contenteditable="true"]'))
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.code === 'Escape') {
        setSettingsOpen((wasOpen) => {
          if (wasOpen) {
            e.preventDefault();
            return false;
          }
          return false;
        });
        setLevelMenuOpen(false);
        setNewGameConfirmOpen(false);
        return;
      }
      if (
        activeState !== 'state-archipelago' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        e.key.toLowerCase() === 'm'
      ) {
        const nextMuted = bgmEngine.toggleMute();
        if (!nextMuted) {
          retroAudio.uiClick();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeState]);

  // Detector de la secuencia secreta WSADWSADBA en la pantalla inicial
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable ||
        Boolean(target.closest('[contenteditable="true"]'))
      );
    };

    const onSecretKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      // Activo únicamente cuando se encuentra en la pantalla inicial ('state-title') y sin modales ni inputs
      if (activeState !== 'state-title') {
        secretSequenceIndexRef.current = 0;
        return;
      }
      if (codeModalOpen || settingsOpen || levelMenuOpen || newGameConfirmOpen) {
        secretSequenceIndexRef.current = 0;
        return;
      }
      if (isEditableTarget(e.target)) {
        secretSequenceIndexRef.current = 0;
        return;
      }

      const key = e.key.toLowerCase();
      const expectedKey = SECRET_KEY_SEQUENCE[secretSequenceIndexRef.current];

      if (key === expectedKey) {
        secretSequenceIndexRef.current += 1;
        if (secretSequenceIndexRef.current === SECRET_KEY_SEQUENCE.length) {
          secretSequenceIndexRef.current = 0;
          setCodeButtonRevealed(true);
          try {
            window.localStorage.setItem(CODE_BUTTON_REVEAL_KEY, 'true');
          } catch {}
          setCodeGlitchEffect(true);
          retroAudio.portalVictory();
          window.dispatchEvent(new CustomEvent('pixelverse-shake'));
          window.setTimeout(() => setCodeGlitchEffect(false), 2000);
        }
      } else {
        if (key === SECRET_KEY_SEQUENCE[0]) {
          secretSequenceIndexRef.current = 1;
        } else {
          secretSequenceIndexRef.current = 0;
        }
      }
    };

    window.addEventListener('keydown', onSecretKeyDown);
    return () => window.removeEventListener('keydown', onSecretKeyDown);
  }, [activeState, codeModalOpen, settingsOpen, levelMenuOpen, newGameConfirmOpen]);

  useEffect(() => {
    return () => {
      if (saveFeedbackTimerRef.current !== null) {
        window.clearTimeout(saveFeedbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onShake = () => {
      const crtEl = document.getElementById('crt-overlay');
      if (crtEl) {
        crtEl.classList.add('screen-shake');
        window.setTimeout(() => {
          crtEl.classList.remove('screen-shake');
        }, 500);
      }
    };
    window.addEventListener('pixelverse-shake', onShake);
    return () => window.removeEventListener('pixelverse-shake', onShake);
  }, []);

  const handleCinematicComplete = useCallback(() => {
    // El segundo acto desembarca directamente en la cabaña de Isla Natal.
    if (cinematicSegment.start > 0) {
      setIslandArrivalMode('awakening');
      managerRef.current?.transitionTo('state-isla-natal');
      return;
    }
    managerRef.current?.transitionTo('state-title');
  }, [cinematicSegment.start]);

  const handleReplayCinematic = useCallback(() => {
    retroAudio.uiClick();
    pendingEncounterIntroRef.current = false;
    setCinematicSegment({ start: 0, end: 128 });
    setCinematicRunKey((k) => k + 1);
    managerRef.current?.transitionTo('state-cinematic');
  }, []);

  const handleEnterPongCabinet = useCallback((skipIntro = false) => {
    retroAudio.uiClick();
    setPongSkipIntro(skipIntro);
    managerRef.current?.transitionTo('state-pong');
  }, []);

  const handleConfirmAvatar = useCallback(() => {
    retroAudio.uiClick();
    if (pendingEncounterIntroRef.current) {
      pendingEncounterIntroRef.current = false;
      // Acto II: descenso a la isla y entrada a la cabaña.
      setCinematicSegment({ start: 94, end: 128 });
      setCinematicRunKey((k) => k + 1);
      managerRef.current?.transitionTo('state-cinematic');
      return;
    }
    const natalEvents = progressState.island70s.narrativeEvents;
    if (!natalEvents.includes(ISLA_NATAL_FLAGS.departed)) {
      managerRef.current?.transitionTo('state-isla-natal');
      return;
    }
    setIslandArrivalMode(
      progressState.island70s.lastIslandPos ? 'standard' : 'awakening'
    );
    managerRef.current?.transitionTo('state-archipelago');
  }, [progressState.island70s.lastIslandPos, progressState.island70s.narrativeEvents]);

  const handleRandomizeAvatar = useCallback(() => {
    const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
    setSkinColor(pick(SKIN_SWATCHES).hex);
    setHairColor(pick(HAIR_SWATCHES).hex);
    setShirtColor(pick(SHIRT_SWATCHES).hex);
    setBootColor(pick(BOOT_SWATCHES).hex);
    setOutfitId(pick(OUTFITS).id);
    setAccessories(ACCESSORIES.filter(() => Math.random() < 0.2).map((item) => item.id));
    setTransformationId(Math.random() < 0.25 ? pick(TRANSFORMATIONS).id : null);
    retroAudio.uiClick();
  }, []);

  const toggleAvatarAccessory = useCallback((id: string) => {
    const headwear = ['cap', 'hat', 'bandana', 'headphones'];
    setAccessories((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      const conflicts = headwear.includes(id) ? headwear : id === 'mask' || id === 'scarf' ? ['mask', 'scarf'] : [];
      return [...current.filter((item) => !conflicts.includes(item)), id];
    });
  }, []);

  const chooseAvatarOutfit = useCallback((id: string) => {
    setOutfitId(id);
    if (['mage', 'pirate', 'cowboy', 'detective'].includes(id)) {
      setAccessories((current) => current.filter((item) => !['cap', 'hat', 'bandana', 'headphones'].includes(item)));
    }
  }, []);

  const chooseTransformation = useCallback((id: string) => {
    if (transformationId === id) {
      setTransformationId(null);
      return;
    }
    setTransformationId(id);
    setAccessories((items) => items.filter((item) => !['cap', 'hat', 'bandana', 'headphones', 'mask'].includes(item)));
  }, [transformationId]);

  const handleValidateSerial = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const normalized = serialInput.trim().toUpperCase();
      if (
        normalized === 'ZUKA' ||
        normalized === 'PIXEL' ||
        normalized === MASTER_SERIAL.toUpperCase()
      ) {
        setMasterUnlocked(true);
        try {
          window.localStorage.setItem('pixelverse_master_unlocked', 'true');
          window.localStorage.setItem(CODE_BUTTON_REVEAL_KEY, 'true');
          setCodeButtonRevealed(true);
        } catch {}
        setSerialStatus('unlocked');
        setPixelCeremonyActive(true);
        retroAudio.portalVictory();
        window.dispatchEvent(new CustomEvent('pixelverse-shake'));
      } else {
        setSerialStatus('error');
        retroAudio.pongScore(false);
      }
    },
    [serialInput]
  );


  const handleJumpToLevel = useCallback((targetState: ViewStateId) => {
    retroAudio.uiClick();
    setLevelMenuOpen(false);
    setCodeModalOpen(false);

    if (targetState === 'state-cinematic') {
      pendingEncounterIntroRef.current = false;
      setCinematicSegment({ start: 0, end: 128 });
      setCinematicRunKey((k) => k + 1);
    } else if (targetState === 'state-pong') {
      setPongSkipIntro(true);
    } else if (targetState === 'state-archipelago') {
      setIslandArrivalMode('standard');
    }

    managerRef.current?.transitionTo(targetState);
  }, []);

  const handleToggleGlobalSound = useCallback(() => {
    const nextMuted = bgmEngine.toggleMute();
    if (!nextMuted) {
      retroAudio.uiClick();
    }
  }, []);

  const handleManualSaveFromSettings = useCallback(() => {
    let savedLocationLabel = 'Progreso general';
    if (activeState === 'state-archipelago' && islandManualSaveRef.current) {
      savedLocationLabel = islandManualSaveRef.current();
    } else {
      setProgressState((prev) => recordGlobalManualSave(prev));
      if (activeState === 'state-pong') savedLocationLabel = 'Pong (1972)';
      else if (activeState === 'state-breakout') savedLocationLabel = 'Breakout (1976)';
      else if (activeState === 'state-platformer')
        savedLocationLabel = 'El Sendero del Glitch Perdido';
      else if (activeState === 'state-invaders') savedLocationLabel = 'Space Invaders (1978)';
      else if (activeState === 'state-dk-classic') savedLocationLabel = 'Donkey Kong (1981)';
      else if (activeState === 'state-night-driver') savedLocationLabel = 'Night Driver (1976)';
      else if (activeState === 'state-galaxian') savedLocationLabel = 'Galaxian (1979)';
      else if (activeState === 'state-avatar') savedLocationLabel = 'Identidad del Arquitecto';
    }

    retroAudio.saveJingle();
    const nowTimeLabel = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setSaveFeedback({
      locationLabel: savedLocationLabel,
      timeLabel: nowTimeLabel,
    });
    if (saveFeedbackTimerRef.current !== null) {
      window.clearTimeout(saveFeedbackTimerRef.current);
    }
    saveFeedbackTimerRef.current = window.setTimeout(() => {
      setSaveFeedback(null);
      saveFeedbackTimerRef.current = null;
    }, 4500);
  }, [activeState]);

  const hasSavedProgress =
    progressState.restoredCount > 0 ||
    progressState.island70s.visitedZones.length > 1 ||
    progressState.island70s.narrativeEvents.length > 1 ||
    progressState.island70s.collectedDiamondIds.length > 0 ||
    progressState.rpg.openedChestIds.length > 0 ||
    Boolean(progressState.rpg.lastManualSaveIso);

  const islaNatalCompleted = progressState.island70s.narrativeEvents.includes(
    ISLA_NATAL_FLAGS.departed
  );

  const handleConfirmNewGame = useCallback(() => {
    retroAudio.uiClick();
    setNewGameConfirmOpen(false);
    setCodeModalOpen(false);
    setSettingsOpen(false);
    setLevelMenuOpen(false);
    setProgressState(resetProgressState());
    setPlayerName('Pixel');
    setSkinColor('#ffccaa');
    setHairColor('#331100');
    setShirtColor('#00f3ff');
    setBootColor(DEFAULT_AVATAR_APPEARANCE.bootColor);
    setOutfitId(DEFAULT_AVATAR_APPEARANCE.outfitId);
    setAccessories([]);
    setTransformationId(null);
    setSaveFeedback(null);
    if (saveFeedbackTimerRef.current !== null) {
      window.clearTimeout(saveFeedbackTimerRef.current);
      saveFeedbackTimerRef.current = null;
    }
    setIslandArrivalMode('awakening');
    // Partida nueva: al confirmar el avatar se reproduce el acto de la isla.
    pendingEncounterIntroRef.current = true;
    managerRef.current?.transitionTo('state-avatar');
  }, []);

  const handleStartNewGame = useCallback(() => {
    if (hasSavedProgress) {
      retroAudio.uiClick();
      setNewGameConfirmOpen(true);
      return;
    }
    handleConfirmNewGame();
  }, [hasSavedProgress, handleConfirmNewGame]);

  const handleCancelNewGame = useCallback(() => {
    retroAudio.uiClick();
    setNewGameConfirmOpen(false);
  }, []);

  const handleContinueSavedGame = useCallback(() => {
    if (!hasSavedProgress) return;
    retroAudio.uiClick();
    if (!islaNatalCompleted) {
      managerRef.current?.transitionTo('state-isla-natal');
      return;
    }
    setIslandArrivalMode('standard');
    managerRef.current?.transitionTo('state-archipelago');
  }, [hasSavedProgress, islaNatalCompleted]);

  const handleRecordIslaNatalEvent = useCallback((eventId: string) => {
    setProgressState((prev) => {
      const next = recordNarrativeEvent(prev, eventId);
      // Recoger la paleta del viejo viajero otorga la habilidad Barra de Pong.
      return eventId === ISLA_NATAL_FLAGS.paddle ? grantPongBoardAbility(next) : next;
    });
  }, []);

  const handleDepartIslaNatal = useCallback(() => {
    // Llegada a la Isla del Origen surcando la Barra de Pong: descenso y bajada de la tabla.
    setIslandArrivalMode('pong-board');
    managerRef.current?.transitionTo('state-archipelago');
  }, []);

  const handleTravelOrigenToNatal = useCallback(() => {
    // Regreso por mar al puerto norte de Isla Natal. La posición de Origen ya
    // quedó guardada por la escena y todo el inventario/banderas se conserva.
    setIslandArrivalMode('standard');
    setNatalArrivalFromOrigen(true);
    managerRef.current?.transitionTo('state-isla-natal');
  }, []);

  const handleGrantIslaNatalItems = useCallback((itemIds: string[]) => {
    setProgressState((prev) => grantInventoryItems(prev, itemIds));
  }, []);

  const handleConsumeIslaNatalItems = useCallback((itemIds: string[]) => {
    setProgressState((prev) => consumeInventoryItems(prev, itemIds));
  }, []);

  const handleOpenMenuOptions = useCallback(() => {
    retroAudio.uiClick();
    setCodeModalOpen(false);
    setNewGameConfirmOpen(false);
    setLevelMenuOpen(false);
    setSettingsOpen(true);
  }, []);

  const handleOpenMenuCode = useCallback(() => {
    retroAudio.uiClick();
    setSettingsOpen(false);
    setNewGameConfirmOpen(false);
    setCodeModalOpen(true);
  }, []);

  const hasInvaders1000Achievement =
    progressState.rpg.achievementsUnlocked.includes('invaders-1000-pts') ||
    Boolean(progressState.games['space-invaders']?.memoryUnlocked);

  const restoredMemoriesSummaryCount =
    (progressState.games['pong']?.memoryUnlocked ? 1 : 0) +
    (progressState.games['breakout']?.memoryUnlocked ? 1 : 0) +
    (progressState.island70s.glitchTrailCompleted || progressState.games['glitch-trail']?.completed
      ? 1
      : 0) +
    (progressState.games['space-invaders']?.memoryUnlocked ? 1 : 0) +
    (progressState.games['donkey-kong']?.memoryUnlocked ? 1 : 0);

  const formattedLastSaveLabel = progressState.rpg.lastManualSaveIso
    ? new Date(progressState.rpg.lastManualSaveIso).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const showAmbientBackdrop =
    activeState === 'state-title' || activeState === 'state-avatar';

  return (
    <div id="game-container" className={`relative w-screen h-screen overflow-hidden bg-[#020207] ${isGbGreenMode ? 'gbc-green-filter' : ''}`}>
      {showAmbientBackdrop && (
        <div
          className="absolute inset-0 hd2d-ambient-orbs pointer-events-none z-0"
          aria-hidden="true"
        />
      )}

      <div
        className={`cyber-grid z-0 ${
          showAmbientBackdrop ? 'opacity-45' : 'opacity-0'
        }`}
        aria-hidden="true"
      />

      {/* Cortina de transición retro Iris Out + Pixel Wipe controlada por GameManager */}
      <div
        id="iris-wipe-overlay"
        aria-hidden="true"
        className="iris-wipe-overlay"
      >
        <div className="iris-wipe-aperture" />
        <div className="iris-pixel-matrix" />
      </div>

      <div
        id="crt-overlay"
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-50 crt-scanlines-global opacity-75"
      />

      {/* Insignia de Logro Visual: Arquitecto Legendario (oculta durante la exploración del mapa para mantener la vista despejada) */}
      {masterUnlocked &&
        activeState !== 'state-archipelago' &&
        activeState !== 'state-cinematic' && (
          <div className="fixed top-4 left-4 z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-md glass-panel border border-[#00f3ff] shadow-[0_0_24px_rgba(0,243,255,0.75)] animate-pulse">
            <Sparkles
              className="w-4 h-4 text-amber-300 animate-spin"
              style={{ animationDuration: '4s' }}
            />
            <span className="text-xs font-mono-tabular font-bold tracking-widest text-[#00f3ff] uppercase drop-shadow-[0_0_8px_rgba(0,243,255,0.9)]">
              ★ ARQUITECTO LEGENDARIO ★
            </span>
          </div>
        )}

      {/* Notificación de Logro Permanente Desbloqueado */}
      {achievementToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 gbc-hud-frame px-5 py-2.5 flex items-center gap-2.5 text-xs font-mono font-bold text-[#fde047]">
          <Award className="w-4 h-4 text-[#86efac] shrink-0" />
          <span>{achievementToast}</span>
        </div>
      )}

      {/* Botón compacto de Configuración en esquina superior derecha (vista limpia y despejada) */}
      {activeState !== 'state-cinematic' && (
        <div className="fixed top-3.5 right-3.5 z-40 flex items-center gap-2">
          {hasInvaders1000Achievement && activeState !== 'state-archipelago' && (
            <div
              title="Logro Especial Permanente: 1.000 PTS en Space Invaders"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-mono-tabular font-bold gbc-hud-frame text-[#fde047] whitespace-nowrap shrink-0"
            >
              <Award className="w-3.5 h-3.5 text-[#86efac] shrink-0" />
              <span>1000 PTS INVADERS</span>
            </div>
          )}

          {masterUnlocked && activeState !== 'state-title' && activeState !== 'state-archipelago' && (
            <button
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                setSettingsOpen(false);
                setLevelMenuOpen((open) => !open);
              }}
              className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-mono-tabular gbc-hud-frame text-[#00f3ff] hover:text-[#fde047] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Layers className="w-3.5 h-3.5 text-[#00f3ff] shrink-0" />
              <span>Elegir nivel</span>
            </button>
          )}

          {activeState !== 'state-title' && (
            <button
              id="btn-open-settings"
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                setLevelMenuOpen(false);
                setSettingsOpen((prev) => !prev);
              }}
              aria-expanded={settingsOpen}
              aria-haspopup="dialog"
              aria-label="Configuración"
              title="Configuración"
              className="relative inline-flex items-center justify-center w-9 h-9 p-2 gbc-hud-frame text-slate-100 hover:text-[#fde047] transition-colors cursor-pointer shrink-0"
            >
              <Settings className="w-4 h-4 text-[#fde047] shrink-0" />
              {isAudioMuted && (
                <VolumeX
                  className="w-3 h-3 text-rose-400 absolute -top-1 -right-1 bg-black rounded-full border border-rose-500/60"
                  aria-label="Sonido silenciado"
                />
              )}
            </button>
          )}
        </div>
      )}

      {/* Modal de Configuración (Teclas, Sonido, Partida) */}
      {settingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          onClick={() => setSettingsOpen(false)}
          className="settings-overlay fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="settings-modal"
          >
            <div className="settings-modal__grid" aria-hidden="true" />
            <div className="settings-motes" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((mote) => (
                <span
                  key={mote}
                  style={{
                    left: `${12 + mote * 15}%`,
                    bottom: `${8 + (mote % 3) * 22}%`,
                    animationDelay: `${-mote * 1.7}s`,
                    animationDuration: `${9 + (mote % 4) * 2}s`,
                  }}
                />
              ))}
            </div>
            <span className="settings-corner settings-corner--tl" aria-hidden="true" />
            <span className="settings-corner settings-corner--tr" aria-hidden="true" />
            <span className="settings-corner settings-corner--bl" aria-hidden="true" />
            <span className="settings-corner settings-corner--br" aria-hidden="true" />

            <header className="settings-header">
              <div className="settings-header__badge">
                <Settings className="settings-header__gear" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="settings-eyebrow">PIXELVERSE · SISTEMA</p>
                <h2 id="settings-modal-title" className="settings-title">
                  Configuración del Juego
                </h2>
                <p className="settings-subtitle">
                  Controles, audio y progreso de tu aventura
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  retroAudio.uiClick();
                  setSettingsOpen(false);
                }}
                aria-label="Cerrar configuración"
                className="settings-close"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="settings-body">

            {/* Controles y teclas */}
            <section className="settings-card settings-card--controls">
              <div className="settings-card__head">
                <span className="settings-chip-icon settings-chip-icon--controls">
                  <Gamepad2 />
                </span>
                <div className="min-w-0">
                  <h3 className="settings-card__title">Controles</h3>
                  <p className="settings-card__sub">Teclas y reasignación</p>
                </div>
                <span className="settings-card__badge">INPUT</span>
              </div>
              <div className="settings-controls">
                <KeybindingsSettingsPanel embedded />
              </div>
            </section>

            <div className="settings-grid">
              {/* Audio */}
              <section className="settings-card">
                <div className="settings-card__head">
                  <span className="settings-chip-icon settings-chip-icon--audio">
                    {isAudioMuted ? <VolumeX /> : <Volume2 />}
                  </span>
                  <div className="min-w-0">
                    <h3 className="settings-card__title">Audio</h3>
                    <p className="settings-card__sub">Sonido del juego</p>
                  </div>
                  <span className={`settings-pill ${isAudioMuted ? 'is-off' : 'is-on'}`}>
                    <span className="settings-pill__dot" aria-hidden="true" />
                    {isAudioMuted ? 'OFF' : 'ON'}
                  </span>
                </div>
                <button
                  id="btn-toggle-sound"
                  type="button"
                  onClick={handleToggleGlobalSound}
                  className={`settings-toggle ${isAudioMuted ? 'is-muted' : 'is-live'}`}
                >
                  <span className="settings-toggle__icon">
                    {isAudioMuted ? <Volume2 /> : <VolumeX />}
                  </span>
                  <span className="settings-toggle__copy">
                    <span className="settings-toggle__label">
                      {isAudioMuted ? 'Activar sonido' : 'Silenciar audio'}
                    </span>
                    <span className="settings-toggle__hint">
                      {isAudioMuted ? 'Audio desactivado' : 'Música y efectos activos'} · Tecla M
                    </span>
                  </span>
                  <span className="settings-toggle__switch" aria-hidden="true">
                    <span />
                  </span>
                </button>
              </section>

              {/* Partida */}
              <section className="settings-card">
                <div className="settings-card__head">
                  <span className="settings-chip-icon settings-chip-icon--save">
                    <Save />
                  </span>
                  <div className="min-w-0">
                    <h3 className="settings-card__title">Partida</h3>
                    <p className="settings-card__sub">Progreso y guardado</p>
                  </div>
                  <span className="settings-pill is-neutral">
                    <span className="settings-pill__dot" aria-hidden="true" />
                    {formattedLastSaveLabel ? 'MANUAL' : 'AUTO'}
                  </span>
                </div>
                <div className="settings-stats">
                  <div className="settings-stat">
                    <span className="settings-stat__value">
                      {progressState.island70s.collectedDiamondIds.length}
                      <span className="settings-stat__cap">/9</span>
                    </span>
                    <span className="settings-stat__label">Diamantes</span>
                  </div>
                  <div className="settings-stat">
                    <span className="settings-stat__value">
                      {restoredMemoriesSummaryCount}
                      <span className="settings-stat__cap">/5</span>
                    </span>
                    <span className="settings-stat__label">Memorias</span>
                  </div>
                  <div className="settings-stat">
                    <span className="settings-stat__value">
                      {progressState.rpg.openedChestIds.length}
                    </span>
                    <span className="settings-stat__label">Cofres</span>
                  </div>
                </div>
                <p className="settings-save-note">
                  {formattedLastSaveLabel
                    ? `Último guardado: ${formattedLastSaveLabel}`
                    : 'Autoguardado activo'}
                </p>
                <button
                  id="btn-save-game"
                  type="button"
                  onClick={handleManualSaveFromSettings}
                  className="settings-save-btn"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>Guardar partida</span>
                </button>

                {saveFeedback && (
                  <div role="status" className="settings-feedback">
                    <Check className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      Partida guardada ({saveFeedback.timeLabel}) · {saveFeedback.locationLabel}
                    </span>
                  </div>
                )}
              </section>
            </div>

            {/* Presentación */}
            <section className="settings-card">
              <div className="settings-card__head">
                <span className="settings-chip-icon settings-chip-icon--display">
                  <Palette />
                </span>
                <div className="min-w-0">
                  <h3 className="settings-card__title">Presentación</h3>
                  <p className="settings-card__sub">Filtro visual y atajos</p>
                </div>
                <span className="settings-card__badge">VISUAL</span>
              </div>

              <div className="settings-row">
                <div className="settings-row__copy">
                  <span className="settings-row__label">Filtro Game Boy Verde</span>
                  <span className="settings-row__hint">Paleta monocroma retro</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isGbGreenMode}
                  onClick={() => {
                    retroAudio.uiClick();
                    setIsGbGreenMode((prev) => !prev);
                  }}
                  className={`settings-switch ${isGbGreenMode ? 'is-on' : ''}`}
                >
                  <span className="settings-switch__track" aria-hidden="true">
                    <span className="settings-switch__thumb" />
                  </span>
                  <span>{isGbGreenMode ? 'Activado' : 'Desactivado'}</span>
                </button>
              </div>

              {masterUnlocked && activeState !== 'state-title' && (
                <div className="settings-row">
                  <div className="settings-row__copy">
                    <span className="settings-row__label">Selector maestro de niveles</span>
                    <span className="settings-row__hint">Salto rápido entre escenas</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.uiClick();
                      setSettingsOpen(false);
                      setLevelMenuOpen(true);
                    }}
                    className="settings-mini-btn"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Abrir selector</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="settings-keys">
                <span className="settings-keys__hint">
                  {activeState === 'state-archipelago'
                    ? '[ENTER] Inventario · [K] Poderes · [ESC] Cerrar'
                    : '[ESC] Cerrar'}
                </span>
                <span className="settings-keys__brand">
                  <Sparkles className="w-3 h-3" />
                  Ajustes guardados al instante
                </span>
              </div>
            </section>
            </div>

            <footer className="settings-footer">
              <span className="settings-footer__brand">
                <Sparkles />
                PIXELVERSE · SISTEMA
              </span>
              <button
                type="button"
                onClick={() => {
                  retroAudio.uiClick();
                  setSettingsOpen(false);
                }}
                className="settings-done"
              >
                Listo
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Menú flotante del Selector Maestro (zudoka26) */}
      {masterUnlocked && levelMenuOpen && activeState !== 'state-title' && (
        <div className="fixed top-14 right-4 z-40 w-80 glass-panel rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-mono-tabular tracking-wider text-emerald-300 uppercase">
                Selector Maestro
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLevelMenuOpen(false)}
              aria-label="Cerrar selector de niveles"
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            <button
              type="button"
              onClick={() => handleJumpToLevel('state-title')}
              className="w-full text-left px-3 py-2 rounded border border-white/15 bg-black/45 hover:border-[#00f3ff]/70 text-xs font-mono-tabular text-slate-200 hover:text-white flex items-center justify-between cursor-pointer transition-colors"
            >
              <span>EST-02 · Pantalla de Inicio</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#00f3ff]" />
            </button>

            {UNLOCKABLE_LEVELS.map((lvl) => {
              const isCurrent = activeState === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => handleJumpToLevel(lvl.id)}
                  className={`w-full text-left px-3 py-2 rounded border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                    isCurrent
                      ? 'border-[#00f3ff] bg-cyan-950/60 text-white'
                      : 'border-white/12 bg-black/45 hover:border-[#00f3ff]/65 text-slate-200 hover:text-white'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-mono-tabular text-[11px] font-bold text-[#00f3ff]">
                      {lvl.code} · {lvl.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{lvl.subtitle}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#00f3ff] shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================
          ESTADO 1: CINEMÁTICA INICIAL (UNIVERSO PIXEL → CABAÑA)
         ========================================================= */}
      <section id="state-cinematic" className="view-state active z-10">
        {windowReady && activeState === 'state-cinematic' && (
          <EpicCinematicStage
            runKey={cinematicRunKey}
            onComplete={handleCinematicComplete}
            startAtSec={cinematicSegment.start}
            endAtSec={cinematicSegment.end}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO 2: PANTALLA DE TÍTULO (ISLA MULTIVERSO + START, CONTINUAR, CÓDIGO)
         ========================================================= */}
      <section
        id="state-title"
        className="view-state z-10 w-full h-full relative overflow-hidden bg-[#050614]"
      >
        <MainMenu
          hasSavedProgress={hasSavedProgress}
          savedAtLabel={formattedLastSaveLabel}
          codeGlitchEffect={codeGlitchEffect}
          codeRevealed={codeButtonRevealed}
          onNewGame={handleStartNewGame}
          onContinue={handleContinueSavedGame}
          onOptions={handleOpenMenuOptions}
          onCode={handleOpenMenuCode}
        />

        {newGameConfirmOpen && (
          <NewGameConfirmDialog
            onCancel={handleCancelNewGame}
            onConfirm={handleConfirmNewGame}
          />
        )}

        {/* Modal de Ingreso de Código CODE */}
        {codeModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/82 backdrop-blur-sm p-4">
            <div className="glass-panel rounded-xl p-6 sm:p-8 max-w-md w-full space-y-5 border border-[#00f3ff]/60 shadow-[0_0_35px_rgba(0,243,255,0.4)] relative">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#00f3ff]" />
                  <span className="text-sm font-display font-bold tracking-wider text-[#00f3ff] uppercase">
                    PIXELVERSE CODE
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCodeModalOpen(false);
                    setSerialStatus('idle');
                  }}
                  aria-label="Cerrar modal de código"
                  className="text-slate-400 hover:text-white cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Banner / Estado de activación "CODE UNLOCKED" */}
              {masterUnlocked ? (
                <div className="p-4 rounded-lg bg-emerald-950/90 border-2 border-emerald-400 space-y-2 text-center">
                  <div className="flex items-center justify-center gap-2 text-amber-300 font-mono-tabular font-bold text-xs tracking-wider uppercase">
                    <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                    <span>CODE UNLOCKED ACTIVADO</span>
                    <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                  </div>
                  <p className="text-xs font-mono-tabular text-[#00f3ff] font-bold tracking-widest uppercase">
                    MODO NAVEGACIÓN LIBRE HABILITADO
                  </p>
                  <p className="text-[11px] font-mono-tabular text-slate-300">
                    Todos los mundos, islas y niveles están accesibles sin reiniciar tu partida.
                  </p>
                </div>
              ) : null}

              <form onSubmit={handleValidateSerial} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono-tabular text-slate-200 block">
                    Introduce el código secreto
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#00f3ff]/80 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={serialInput}
                      onChange={(e) => {
                        setSerialInput(e.target.value);
                        if (serialStatus === 'error') setSerialStatus('idle');
                      }}
                      placeholder="Escribe aquí"
                      autoComplete="off"
                      autoFocus
                      spellCheck={false}
                      className="w-full pl-9 pr-3 py-2.5 rounded-md bg-[#040715]/90 border border-[#00f3ff]/40 text-sm font-mono-tabular text-white uppercase tracking-wider placeholder:text-slate-500 placeholder:normal-case focus:outline-none focus:border-[#00f3ff] focus:shadow-[0_0_15px_rgba(0,243,255,0.3)]"
                    />
                  </div>

                  {/* Mensaje de error si el código es incorrecto */}
                  {serialStatus === 'error' && (
                    <p className="text-xs font-mono-tabular text-red-400 font-bold uppercase tracking-wide flex items-center gap-1.5 pt-1">
                      <span>⚠</span> CÓDIGO INCORRECTO
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCodeModalOpen(false);
                      setSerialStatus('idle');
                    }}
                    className="px-4 py-2 rounded border border-white/20 bg-black/40 text-xs font-mono-tabular text-slate-300 hover:text-white cursor-pointer"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded border border-[#00f3ff]/70 bg-cyan-950/90 hover:bg-cyan-900 text-xs font-mono-tabular font-bold tracking-wider text-[#00f3ff] hover:text-white cursor-pointer transition-colors shadow-[0_0_12px_rgba(0,243,255,0.2)]"
                  >
                    DESBLOQUEAR
                  </button>
                </div>
              </form>

              {/* Acceso rápido a niveles cuando está desbloqueado */}
              {masterUnlocked && (
                <div className="space-y-3 pt-3 border-t border-white/15">
                  <div className="flex items-center justify-center gap-2 text-xs font-mono-tabular text-emerald-300 font-bold uppercase">
                    <Unlock className="w-4 h-4 text-emerald-400" />
                    <span>NIVELES Y MUNDOS DESBLOQUEADOS:</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                    {UNLOCKABLE_LEVELS.map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          setCodeModalOpen(false);
                          handleJumpToLevel(lvl.id);
                        }}
                        className="text-left px-3 py-2 rounded border border-[#00f3ff]/40 bg-black/60 hover:bg-cyan-950/60 text-xs font-mono-tabular flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <span className="text-[#00f3ff] font-bold">{lvl.code} · </span>
                          <span className="text-white font-bold">{lvl.title}</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-[#00f3ff]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* RPG character creation */}
      <section id="state-avatar" className="view-state isolate z-10 overflow-y-auto bg-[#071018] px-3 py-4 sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[radial-gradient(ellipse_at_50%_70%,rgba(12,78,91,.52),transparent_48%),linear-gradient(180deg,#101b2b_0%,#152d3c_48%,#071018_100%)]"><div className="absolute inset-x-0 bottom-0 h-[34%] border-t border-cyan-100/10 bg-[linear-gradient(180deg,rgba(11,31,40,.3),rgba(3,11,17,.96))]"/><div className="absolute bottom-[27%] left-[8%] h-20 w-20 border border-cyan-100/10 bg-cyan-100/[0.025] [clip-path:polygon(50%_0,100%_100%,0_100%)] sm:h-32 sm:w-32"/><div className="absolute bottom-[31%] right-[9%] h-28 w-28 border border-amber-100/10 bg-amber-100/[0.025] [clip-path:polygon(50%_0,100%_100%,0_100%)] sm:h-44 sm:w-44"/><div className="absolute inset-0 opacity-[0.1] [background-image:linear-gradient(rgba(163,230,240,.14)_1px,transparent_1px),linear-gradient(90deg,rgba(163,230,240,.14)_1px,transparent_1px)] [background-size:32px_32px]"/></div>
        <div className="relative z-10 mx-auto flex min-h-full w-full max-w-7xl flex-col">
          <header className="mb-3 flex items-end justify-between border-b border-cyan-100/20 pb-3 sm:mb-5"><div><p className="font-mono text-[9px] tracking-[0.35em] text-amber-200/75">PIXELVERSE &middot; CR&Oacute;NICAS DEL ORIGEN</p><h2 className="mt-1 font-display text-xl tracking-[0.13em] text-white sm:text-3xl">ELIGE A TU ARQUITECTO</h2></div><span className="hidden border border-cyan-100/20 px-3 py-1 font-mono text-[9px] tracking-widest text-cyan-100/70 sm:block">CAP&Iacute;TULO 01 &middot; IDENTIDAD</span></header>
          <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(280px,0.72fr)_minmax(520px,1.28fr)] lg:gap-5">
            <section className="relative flex min-h-[330px] flex-col items-center justify-center overflow-hidden border-2 border-[#172c37] bg-[linear-gradient(145deg,rgba(19,44,57,.94),rgba(5,15,23,.98))] px-3 py-4 shadow-[inset_0_0_0_1px_rgba(125,211,224,.12),0_14px_40px_rgba(0,0,0,.35)] sm:min-h-[500px] lg:min-h-[590px]"><div className="pointer-events-none absolute inset-2 border border-cyan-100/10"/><div className="absolute left-5 top-5 font-mono text-[9px] tracking-[0.18em] text-cyan-100/50">VISTA DEL PERSONAJE</div><div className="absolute right-5 top-5 h-2 w-2 animate-pulse bg-emerald-300 shadow-[0_0_10px_#6ee7b7]"/><div className="absolute bottom-[19%] h-5 w-44 rounded-[50%] bg-cyan-300/10 blur-md"/><div className="absolute bottom-4 left-5 font-mono text-[8px] text-slate-500">REPOSO &middot; USA LAS FLECHAS</div><div className="absolute bottom-4 right-5 font-mono text-[8px] text-slate-500">SPRITE PIXEL GBA</div><div className="z-10 mb-2 border-b border-cyan-100/20 px-5 pb-2 font-mono text-xs tracking-[0.3em] text-amber-200">{playerName || 'PIXEL'}</div><PixelCharacterPreview skinColor={skinColor} hairColor={hairColor} shirtColor={shirtColor} appearance={avatarAppearance}/></section>
            <section className="flex min-h-[400px] flex-col border-2 border-[#172c37] bg-[#07121c]/95 p-3 shadow-[inset_0_0_0_1px_rgba(125,211,224,.1),0_14px_40px_rgba(0,0,0,.3)] sm:p-4">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><label className="flex flex-col gap-1 font-mono text-[9px] tracking-[0.18em] text-cyan-100">NOMBRE DEL VIAJERO<input value={playerName} maxLength={16} onChange={event=>setPlayerName(event.target.value)} className="w-48 border border-cyan-100/20 bg-black/40 px-2 py-1.5 text-xs tracking-normal text-white outline-none focus:border-amber-200" aria-label="Nombre del personaje"/></label><span className="font-mono text-[9px] text-slate-500">GUARDADO EN TU PARTIDA</span></div>
              <nav className="mb-3 grid grid-cols-4 gap-1 border-b border-cyan-100/15 pb-3 xl:grid-cols-7" aria-label="Character categories">{([['skin','PIEL'],['hair','PELO'],['clothes','ROPA'],['boots','BOTAS'],['outfits','CONJUNTOS'],['accessories','ACCESORIOS'],['rare','RAROS']] as const).map(([id,label])=><button key={id} type="button" onClick={()=>setAvatarTab(id)} aria-pressed={avatarTab===id} className={'border px-2 py-2 font-mono text-[9px] tracking-wider transition-colors '+(avatarTab===id?'border-amber-200 bg-amber-200/10 text-amber-100':'border-white/10 text-slate-400 hover:border-cyan-100/50 hover:text-white')}>{label}</button>)}</nav>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {avatarTab==='skin'&&(transformationId?<div className="border border-amber-100/20 p-4 font-mono text-xs text-slate-300">Esta forma tiene una paleta de piel propia. Quita la transformacion para personalizarla.<button type="button" onClick={()=>setTransformationId(null)} className="mt-3 block border border-amber-200/50 px-3 py-2 text-amber-100">QUITAR TRANSFORMACI&Oacute;N</button></div>:<AvatarPaletteRow title="Tono de piel" value={skinColor} options={SKIN_SWATCHES} onSelect={setSkinColor}/>)}
                {avatarTab==='hair'&&(transformationId?<div className="border border-amber-100/20 p-4 font-mono text-xs text-slate-300">Esta forma cambia el cabello y la silueta de la cabeza. Quita la transformacion para personalizar el pelo.<button type="button" onClick={()=>setTransformationId(null)} className="mt-3 block border border-amber-200/50 px-3 py-2 text-amber-100">QUITAR TRANSFORMACI&Oacute;N</button></div>:<AvatarPaletteRow title="Color de pelo" value={hairColor} options={HAIR_SWATCHES} onSelect={setHairColor}/>)}
                {avatarTab==='clothes'&&(transformationId?<div className="border border-amber-100/20 p-4 font-mono text-xs text-slate-300">La criatura sustituye la ropa. Quita la transformacion para cambiar su color.<button type="button" onClick={()=>setTransformationId(null)} className="mt-3 block border border-amber-200/50 px-3 py-2 text-amber-100">QUITAR TRANSFORMACI&Oacute;N</button></div>:<AvatarPaletteRow title="Color de ropa" value={shirtColor} options={SHIRT_SWATCHES} onSelect={setShirtColor}/>)}
                {avatarTab==='boots'&&(transformationId?<div className="border border-amber-100/20 p-4 font-mono text-xs text-slate-300">Esta forma tiene sus propios pies. Quita la transformacion para personalizar las botas.<button type="button" onClick={()=>setTransformationId(null)} className="mt-3 block border border-amber-200/50 px-3 py-2 text-amber-100">QUITAR TRANSFORMACI&Oacute;N</button></div>:<AvatarPaletteRow title="Color de botas" value={bootColor} options={BOOT_SWATCHES} onSelect={setBootColor}/>)}
                {avatarTab==='outfits'&&(transformationId?<div className="space-y-3 border border-amber-200/25 bg-amber-100/5 p-4 font-mono text-xs text-slate-300">La apariencia rara sustituye la ropa. Quita la transformacion para elegir otro conjunto.<button type="button" onClick={()=>setTransformationId(null)} className="block border border-amber-200/50 px-3 py-2 text-amber-100">QUITAR TRANSFORMACI&Oacute;N</button></div>:<AvatarChoiceGrid title="20 CONJUNTOS ORIGINALES" options={OUTFITS} selected={outfitId} category="outfit" onSelect={chooseAvatarOutfit} skinColor={skinColor} hairColor={hairColor} shirtColor={shirtColor} appearance={avatarAppearance}/>)}
                {avatarTab==='accessories'&&<div className="space-y-3"><p className="font-mono text-[9px] text-slate-500">Selecciona cada accesorio para ponerlo o quitarlo. Las piezas compatibles se pueden combinar.</p><AvatarChoiceGrid title="10 ACCESORIOS INDEPENDIENTES" options={ACCESSORIES.filter(item=>!(transformationId&&['cap','hat','bandana','headphones','mask'].includes(item.id))&&!('mage pirate cowboy detective'.split(' ').includes(outfitId)&&['cap','hat','bandana','headphones'].includes(item.id)))} selected={null} category="accessory" onSelect={toggleAvatarAccessory} skinColor={skinColor} hairColor={hairColor} shirtColor={shirtColor} appearance={avatarAppearance}/></div>}
                {avatarTab==='rare'&&<div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-mono text-[9px] text-slate-500">LAS TRANSFORMACIONES CAMBIAN LA SILUETA Y LA ROPA.</p>{transformationId&&<button type="button" onClick={()=>setTransformationId(null)} className="border border-cyan-100/30 px-2 py-1 font-mono text-[9px] text-cyan-100">QUITAR TRANSFORMACI&Oacute;N</button>}</div><AvatarChoiceGrid title="10 APARIENCIAS EXTRAORDINARIAS" options={TRANSFORMATIONS} selected={transformationId} category="transformation" onSelect={chooseTransformation} skinColor={skinColor} hairColor={hairColor} shirtColor={shirtColor} appearance={avatarAppearance}/></div>}
              </div>
              <div className="mt-3 border border-cyan-100/15 bg-[#030a10] p-3"><div className="mb-1 font-mono text-[9px] tracking-[0.2em] text-cyan-100">IDENTIDAD ACTUAL</div><p className="font-mono text-[10px] text-slate-300">{transformationId?TRANSFORMATIONS.find(item=>item.id===transformationId)?.description:OUTFITS.find(item=>item.id===outfitId)?.description} {accessories.length>0&&' '+accessories.length+' accesorios seleccionados.'}</p></div>
              <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={()=>{retroAudio.uiClick();managerRef.current?.transitionTo('state-title');}} className="border border-white/20 px-3 py-3 font-mono text-[10px] text-slate-300 hover:border-white/50">VOLVER</button><button type="button" onClick={handleRandomizeAvatar} className="border border-cyan-100/40 px-3 py-3 font-mono text-[10px] text-cyan-100 hover:bg-cyan-100/10">ALEATORIO</button><button id="btn-confirm" type="button" onClick={handleConfirmAvatar} className="group flex min-w-52 flex-1 items-center justify-between border-2 border-amber-200/70 bg-amber-200 px-4 py-3 font-mono text-xs font-bold tracking-[0.12em] text-[#17202a] shadow-[4px_4px_0_#6d5420] transition-transform hover:-translate-y-0.5 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200"><span>CONFIRMAR IDENTIDAD</span><span className="transition-transform group-hover:translate-x-1">-&gt;</span></button></div>
            </section>
          </div>
          <footer className="mt-3 flex items-center justify-between border-t border-cyan-100/15 pt-2 font-mono text-[8px] tracking-[0.12em] text-slate-500"><span>TU APARIENCIA TE ACOMPA&Ntilde;A EN LA AVENTURA</span><span>PIXELVERSE</span></footer>
        </div>
      </section>

      {/* =========================================================
          ESTADO 3B: ISLA NATAL — ZONA INICIAL (EL ARCADE QUE ESPERÓ SU MOMENTO)
         ========================================================= */}
      <section id="state-isla-natal" className="view-state z-10 bg-[#020614]">
        {windowReady && activeState === 'state-isla-natal' && (
          <SceneGuard
            sceneLabel="Isla Natal · tu progreso está guardado."
            onRecover={() => managerRef.current?.transitionTo('state-isla-natal')}
          >
            <IslaNatalStage
              skinColor={skinColor}
              hairColor={hairColor}
              shirtColor={shirtColor}
              appearance={avatarAppearance}
              narrativeEvents={progressState.island70s.narrativeEvents}
              onRecordNarrativeEvent={handleRecordIslaNatalEvent}
              onDepartToOrigin={handleDepartIslaNatal}
              arrivedFromOrigen={natalArrivalFromOrigen}
              onArrivalNoticeShown={() => setNatalArrivalFromOrigen(false)}
              onGrantInventoryItems={handleGrantIslaNatalItems}
              onConsumeInventoryItems={handleConsumeIslaNatalItems}
            />
          </SceneGuard>
        )}
      </section>

      {/* =========================================================
          ESTADO 4: PONG (1972) — GABINETE AMARILLO ATARI Y TABLA VOLADORA
         ========================================================= */}
      <section id="state-pong" className="view-state z-10 px-4 py-6 arcade-hall-backdrop">
        {windowReady && activeState === 'state-pong' && (
          <Pong1972Stage
            skipIntro={pongSkipIntro}
            alreadyRestoredBefore={Boolean(progressState.games['pong']?.memoryUnlocked)}
            onVictoryRecorded={(finalScore) => {
              setProgressState((prev) => recordGameVictory(prev, 'pong', finalScore));
              window.dispatchEvent(new CustomEvent('pixelverse-shake'));
            }}
            onCeremonyCompleted={() => {
              setProgressState((prev) => markCeremonyCompleted(prev, 'pong'));
            }}
            onReturnToIslandOnBoard={() => {
              // El gabinete histórico vive dentro de la Isla del Origen: la tabla
              // desciende sobre la propia isla de los 70 y no repite el primer
              // desafío de Isla Natal ni reescribe sus banderas.
              setProgressState((prev) =>
                grantPongBoardAbility(markTransitionFinished(prev, 'pong', true))
              );
              setIslandArrivalMode('standard');
              managerRef.current?.transitionTo('state-archipelago');
            }}
            onBackToIsland={() => {
              setIslandArrivalMode('standard');
              managerRef.current?.transitionTo('state-archipelago');
            }}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO 5: LA GRAN ISLA DE LOS 70 · EL ORIGEN (9 ZONAS INTERCONECTADAS)
         ========================================================= */}
      <section id="state-archipelago" className="view-state z-10 bg-[#020614]">
        {windowReady && activeState === 'state-archipelago' && (
          <SceneGuard
            sceneLabel="Isla del Origen · tu progreso está guardado."
            onRecover={() => managerRef.current?.transitionTo('state-isla-natal')}
          >
            <Origin70sIsland
            skinColor={skinColor}
            hairColor={hairColor}
            shirtColor={shirtColor}
            appearance={avatarAppearance}
            allUnlocked={masterUnlocked}
            arrivalMode={islandArrivalMode}
            progressState={progressState}
            onEnterPong={() => handleEnterPongCabinet(false)}
            onEnterBreakout={() => {
              managerRef.current?.transitionTo('state-breakout');
            }}
            onEnterBreakoutFromNorth={() => {
              breakoutReturnToNorthRef.current = true;
              managerRef.current?.transitionTo('state-breakout');
            }}
            onEnterGlitchTrail={() => {
              managerRef.current?.transitionTo('state-platformer');
            }}
            onEnterSpaceInvaders={() => {
              managerRef.current?.transitionTo('state-invaders');
            }}
            onEnterDonkeyKong={() => {
              managerRef.current?.transitionTo('state-dk-classic');
            }}
            onEnterAsteroids={() => {
              managerRef.current?.transitionTo('state-asteroids');
            }}
            onEnterSeaWolf={() => {
              managerRef.current?.transitionTo('state-seawolf');
            }}
            onEnterTank={() => {
              managerRef.current?.transitionTo('state-tank');
            }}
            onEnterLunarLander={() => {
              managerRef.current?.transitionTo('state-lunar-lander');
            }}
            onEnterNightDriver={() => {
              managerRef.current?.transitionTo('state-night-driver');
            }}
            onEnterGalaxian={() => {
              managerRef.current?.transitionTo('state-galaxian');
            }}
            onEnterFrogger={() => {
              managerRef.current?.transitionTo('state-frogger');
            }}
            onRecordNarrativeEvent={(eventId) => {
              setProgressState((prev) => recordNarrativeEvent(prev, eventId));
            }}
            onGrantInventoryItems={handleGrantIslaNatalItems}
            onConsumeInventoryItems={handleConsumeIslaNatalItems}
            onSetRpgFlag={(key, val) => {
              setProgressState((prev) => setRpgFlag(prev, key, val));
            }}
            onRestoreCuatroCaminos={() => {
              setProgressState((prev) => restoreCuatroCaminosState(prev));
            }}
            onCollectDiamond={(diamondId) => {
              setProgressState((prev) => collectUniqueMemoryDiamond(prev, diamondId));
            }}
            onVisitZone={(zoneId) => {
              setProgressState((prev) => recordIslandZoneVisited(prev, zoneId));
            }}
            onDiscoverEcho={(echoId) => {
              setProgressState((prev) => recordEchoDiscovered(prev, echoId));
            }}
            onActivateSwitch={(switchId) => {
              setProgressState((prev) => recordIslandSwitchActivated(prev, switchId));
            }}
            onTalkNpc={(npcId) => {
              setProgressState((prev) => recordNpcTalked(prev, npcId));
            }}
            onSavePosition={(x, y) => {
              setProgressState((prev) => saveLastIslandCoordinates(prev, x, y));
            }}
            onSave80sPosition={(x, y) => {
              setProgressState((prev) => saveLast80sCoordinates(prev, x, y));
            }}
            onManualSave={(x, y) => {
              setProgressState((prev) => recordManualSaveCheckpoint(prev, x, y));
            }}
            onManualSave80s={(x, y) => {
              setProgressState((prev) => recordManualSave80sCheckpoint(prev, x, y));
            }}
            onOpenChest={(chestId, rewardItemIds) => {
              setProgressState((prev) => openRpgChest(prev, chestId, rewardItemIds));
            }}
            onDiscoverSecret={(secretId) => {
              setProgressState((prev) => discoverRpgSecret(prev, secretId));
            }}
            onDiscoverClue={(clueId) => {
              setProgressState((prev) => discoverInvestigationClue(prev, clueId));
            }}
            onSolveCase={(caseId, rewardItemIds) => {
              setProgressState((prev) =>
                solveInvestigationCase(prev, caseId, rewardItemIds)
              );
            }}
            onCalmCreature={(creatureId) => {
              setProgressState((prev) => calmGuardianCreature(prev, creatureId));
            }}
            onInspectExhibit={(exhibitId) => {
              setProgressState((prev) => recordMuseumExhibitInspected(prev, exhibitId));
            }}
            onSolvePuzzle={(puzzleId, rewardItemIds) => {
              setProgressState((prev) => solveRpgPuzzle(prev, puzzleId, rewardItemIds));
            }}
            onRepairMechanism={(mechanismId, alsoSwitches) => {
              setProgressState((prev) =>
                repairRpgMechanism(prev, mechanismId, alsoSwitches)
              );
            }}
            onUpdateQuest={(questId, status, rewardItemIds) => {
              setProgressState((prev) =>
                updateQuestStatus(prev, questId, status, rewardItemIds)
              );
            }}
            onEquipCosmetic={(cosmeticId) => {
              setProgressState((prev) => setEquippedCosmetic(prev, cosmeticId));
            }}
            onToggleLantern={(forceValue) => {
              setProgressState((prev) => togglePhosphorLanternState(prev, forceValue));
            }}
            onUpdatePowerEnergy={(key, amount) => {
              setProgressState((prev) => updatePowerEnergy(prev, key, amount));
            }}
            onPurchasePowerUpgrade={(upgradeId, costDiamonds) => {
              setProgressState((prev) => purchasePowerUpgrade(prev, upgradeId, costDiamonds));
            }}
            onRechargePowers={() => {
              setProgressState((prev) => rechargeAllPowers(prev));
            }}
            onArrivalSequenceFinished={() => {
              setIslandArrivalMode('standard');
            }}
            onTravelToNatal={handleTravelOrigenToNatal}
            isGbGreenMode={isGbGreenMode}
            onToggleGbGreenMode={() => {
              setIsGbGreenMode((prev) => !prev);
            }}
            isAudioMuted={isAudioMuted}
            onToggleAudio={handleToggleGlobalSound}
            onOpenLevelSelector={() => {
              setLevelMenuOpen(true);
            }}
            externalModalOpen={settingsOpen}
            manualSaveTriggerRef={islandManualSaveRef}
          />
          </SceneGuard>
        )}
      </section>

      {/* =========================================================
          ESTADO 5B: BREAKOUT (1976) — SALA SECRETA DE LAS CUATRO BANDAS
         ========================================================= */}
      <section id="state-breakout" className="view-state z-10 px-4 py-4 arcade-hall-backdrop">
        {windowReady && activeState === 'state-breakout' && (
          <Breakout1976Stage
            active={activeState === 'state-breakout'}
            alreadyRestored={Boolean(progressState.games['breakout']?.memoryUnlocked)}
            bestSavedScore={progressState.games['breakout']?.bestScore ?? 0}
            onMemoryRestored={(finalScore: number) => {
              const firstTime =
                finalScore >= BREAKOUT_UNLOCK_SCORE &&
                !progressState.rpg.achievementsUnlocked.includes('breakout-secreto-1976');
              setProgressState((prev) =>
                recordGameVictory(prev, 'breakout', finalScore, 2)
              );
              if (firstTime) {
                retroAudio.achievementUnlock();
                setAchievementToast(
                  '★ LOGRO PERMANENTE: MURO CROMÁTICO 1976 RESTAURADO (BREAKOUT) ★'
                );
                window.setTimeout(() => {
                  setAchievementToast(null);
                }, 5200);
              }
              window.dispatchEvent(new CustomEvent('pixelverse-shake'));
            }}
            onCeremonyDone={() => {
              setProgressState((prev) => markCeremonyCompleted(prev, 'breakout'));
            }}
            onExitToSecretRoom={() => {
              setProgressState((prev) => markTransitionFinished(prev, 'breakout', true));
              if (breakoutReturnToNorthRef.current) {
                breakoutReturnToNorthRef.current = false;
                setIslandArrivalMode('standard');
                managerRef.current?.transitionTo('state-archipelago');
                return;
              }
              setIslandArrivalMode('return-breakout');
              managerRef.current?.transitionTo('state-archipelago');
            }}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO ASTEROIDS (1979) — INERCIA VECTORIAL QUADRASCAN
         ========================================================= */}
      <section id="state-asteroids" className="view-state z-10 px-4 py-4 arcade-hall-backdrop">
        {windowReady && activeState === 'state-asteroids' && (
          <Asteroids1979Stage
            active={activeState === 'state-asteroids'}
            alreadyRestored={Boolean(progressState.games['asteroids']?.memoryUnlocked)}
            bestSavedScore={progressState.games['asteroids']?.bestScore ?? 0}
            onVictoryRecorded={(finalScore: number) => {
              setProgressState((prev) => recordGameVictory(prev, 'asteroids', finalScore, 2));
              window.dispatchEvent(new CustomEvent('pixelverse-shake'));
            }}
            onCeremonyDone={() => {
              setProgressState((prev) => markCeremonyCompleted(prev, 'asteroids'));
            }}
            onExitToIsland={() => {
              setIslandArrivalMode('standard');
              managerRef.current?.transitionTo('state-archipelago');
            }}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO SEA WOLF (1976) — SIMULACIÓN NAVAL PERISCOPIO
         ========================================================= */}
      <section id="state-seawolf" className="view-state z-10 px-4 py-4 arcade-hall-backdrop">
        {windowReady && activeState === 'state-seawolf' && (
          <SeaWolf1976Stage
            active={activeState === 'state-seawolf'}
            alreadyRestored={Boolean(progressState.games['sea-wolf']?.memoryUnlocked)}
            bestSavedScore={progressState.games['sea-wolf']?.bestScore ?? 0}
            onVictoryRecorded={(finalScore: number) => {
              setProgressState((prev) => recordGameVictory(prev, 'sea-wolf', finalScore, 2));
              window.dispatchEvent(new CustomEvent('pixelverse-shake'));
            }}
            onCeremonyDone={() => {
              setProgressState((prev) => markCeremonyCompleted(prev, 'sea-wolf'));
            }}
            onExitToIsland={() => {
              setIslandArrivalMode('standard');
              managerRef.current?.transitionTo('state-archipelago');
            }}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO TANK (1974) — COMBATE TÁCTICO DE LABERINTO
         ========================================================= */}
      <section id="state-tank" className="view-state z-10 px-4 py-4 arcade-hall-backdrop">
        {windowReady && activeState === 'state-tank' && (
          <Tank1974Stage
            active={activeState === 'state-tank'}
            alreadyRestored={Boolean(progressState.games['tank']?.memoryUnlocked)}
            bestSavedScore={progressState.games['tank']?.bestScore ?? 0}
            onVictoryRecorded={(finalScore: number) => {
              setProgressState((prev) => recordGameVictory(prev, 'tank', finalScore, 2));
              window.dispatchEvent(new CustomEvent('pixelverse-shake'));
            }}
            onCeremonyDone={() => {
              setProgressState((prev) => markCeremonyCompleted(prev, 'tank'));
            }}
            onExitToIsland={() => {
              setIslandArrivalMode('standard');
              managerRef.current?.transitionTo('state-archipelago');
            }}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO LUNAR LANDER (1979) — ALUNIZAJE VECTORIAL DE PRECISIÓN
         ========================================================= */}
      <section id="state-lunar-lander" className="view-state z-10 px-4 py-4 arcade-hall-backdrop">
        {windowReady && activeState === 'state-lunar-lander' && (
          <LunarLander1979Stage
            active={activeState === 'state-lunar-lander'}
            alreadyRestored={Boolean(progressState.games['lunar-lander']?.memoryUnlocked)}
            bestSavedScore={progressState.games['lunar-lander']?.bestScore ?? 0}
            onVictoryRecorded={(finalScore: number) => {
              setProgressState((prev) => recordGameVictory(prev, 'lunar-lander', finalScore, 2));
              window.dispatchEvent(new CustomEvent('pixelverse-shake'));
            }}
            onCeremonyDone={() => {
              setProgressState((prev) => markCeremonyCompleted(prev, 'lunar-lander'));
            }}
            onExitToIsland={() => {
              setIslandArrivalMode('standard');
              managerRef.current?.transitionTo('state-archipelago');
            }}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO 6: EL SENDERO DEL GLITCH PERDIDO (AVENTURA Y PLATAFORMAS ORIGINAL)
         ========================================================= */}
      <section id="state-platformer" className="view-state z-10 bg-[#030716]">
        {windowReady && activeState === 'state-platformer' && (
          <GlitchTrailStage
            skinColor={skinColor}
            hairColor={hairColor}
            shirtColor={shirtColor}
            appearance={avatarAppearance}
            collectedDiamondIds={progressState.island70s.collectedDiamondIds}
            discoveredEchoIds={progressState.island70s.discoveredEchoIds}
            alreadyRestoredBefore={Boolean(
              progressState.games['glitch-trail']?.ceremonyShown
            )}
            onCheckpointReached={(checkpointId) => {
              setProgressState((prev) =>
                saveStageCheckpoint(prev, 'glitch-trail', checkpointId)
              );
            }}
            onCollectDiamond={(diamondId) => {
              setProgressState((prev) => collectUniqueMemoryDiamond(prev, diamondId));
            }}
            onDiscoverEcho={(echoId) => {
              setProgressState((prev) => recordEchoDiscovered(prev, echoId));
            }}
            onVictoryRecorded={(trailDiamonds) => {
              setProgressState((prev) =>
                recordGameVictory(prev, 'glitch-trail', trailDiamonds * 250, trailDiamonds)
              );
            }}
            onComplete={() => {
              setIslandArrivalMode('glitch-trail-cleared');
              setProgressState((prev) =>
                markTransitionFinished(prev, 'glitch-trail', true)
              );
              managerRef.current?.transitionTo('state-archipelago');
            }}
            onReturnToIsland={() => {
              setIslandArrivalMode('standard');
              managerRef.current?.transitionTo('state-archipelago');
            }}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO 7: SPACE INVADERS (1978) — META >= 1000 PTS Y REGRESO EN NAVE
         ========================================================= */}
      <section id="state-invaders" className="view-state z-10 px-4 py-4 arcade-hall-backdrop">
        {windowReady && activeState === 'state-invaders' && (
          <HD2DSpaceInvadersStage
            skinColor={skinColor}
            hairColor={hairColor}
            shirtColor={shirtColor}
            alreadyRestoredBefore={Boolean(
              progressState.games['space-invaders']?.ceremonyShown
            )}
            onVictoryRecorded={(finalScore) => {
              const firstTime1000 =
                finalScore >= 1000 &&
                !progressState.rpg.achievementsUnlocked.includes('invaders-1000-pts');
              setProgressState((prev) =>
                recordGameVictory(prev, 'space-invaders', finalScore, 3)
              );
              if (firstTime1000) {
                retroAudio.achievementUnlock();
                setAchievementToast(
                  '★ LOGRO PERMANENTE: DEFENSOR DE LOS 1.000 PUNTOS (SPACE INVADERS) ★'
                );
                window.setTimeout(() => {
                  setAchievementToast(null);
                }, 5200);
              }
              window.dispatchEvent(new CustomEvent('pixelverse-shake'));
            }}
            onCeremonyCompleted={() => {
              setProgressState((prev) =>
                markCeremonyCompleted(prev, 'space-invaders')
              );
            }}
            onReturnToIslandWithShip={() => {
              setIslandArrivalMode('invaders-ship');
              setProgressState((prev) =>
                markTransitionFinished(prev, 'space-invaders', true)
              );
              managerRef.current?.transitionTo('state-archipelago');
            }}
            onBackToMap={() => {
              retroAudio.uiClick();
              setIslandArrivalMode('standard');
              managerRef.current?.transitionTo('state-archipelago');
            }}
            onRestartCinematic={handleReplayCinematic}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO 8: GABINETE VERTICAL DE 1981 (ISLA NEÓN 1980s / SELECTOR MAESTRO)
         ========================================================= */}
      <section id="state-dk-classic" className="view-state z-10 px-4 py-4 arcade-hall-backdrop">
        {windowReady && activeState === 'state-dk-classic' && (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                setIslandArrivalMode('return-80s');
                managerRef.current?.transitionTo('state-archipelago');
              }}
              className="fixed bottom-4 left-4 z-30 glass-panel px-3.5 py-1.5 rounded-md text-xs font-mono-tabular text-[#00f3ff] hover:text-white cursor-pointer"
            >
              ← Volver a Isla Neón 1980s
            </button>
            <HD2DDonkeyKongStage
              skinColor={skinColor}
              hairColor={hairColor}
              shirtColor={shirtColor}
              alreadyRestoredBefore={Boolean(
                progressState.games['donkey-kong']?.ceremonyShown
              )}
              onVictoryRecorded={(diamonds) => {
                setProgressState((prev) =>
                  recordGameVictory(prev, 'donkey-kong', diamonds * 250, diamonds)
                );
                window.dispatchEvent(new CustomEvent('pixelverse-shake'));
              }}
              onComplete={() => {
                setIslandArrivalMode('return-80s');
                setProgressState((prev) =>
                  markTransitionFinished(prev, 'donkey-kong', false)
                );
                managerRef.current?.transitionTo('state-archipelago');
              }}
            />
          </div>
        )}
      </section>

      {/* =========================================================
          ESTADO NIGHT DRIVER (1976) — CONDUCCIÓN NOCTURNA Y 3 TRANSISTORES
         ========================================================= */}
      <section id="state-night-driver" className="view-state z-10 px-4 py-4 arcade-hall-backdrop">
        {windowReady && activeState === 'state-night-driver' && (
          <NightDriver1976Stage
            alreadyCompleted={Boolean(progressState.games['night-driver']?.memoryUnlocked)}
            onVictory={(score: number) => {
              setProgressState((prev) => {
                let next = recordGameVictory(prev, 'night-driver', score, 2);
                if (!next.rpg.inventoryItems.includes('item-transistores-germanio')) {
                  next = {
                    ...next,
                    rpg: {
                      ...next.rpg,
                      inventoryItems: [...next.rpg.inventoryItems, 'item-transistores-germanio'],
                    },
                  };
                }
                return next;
              });
              window.dispatchEvent(new CustomEvent('pixelverse-shake'));
            }}
            onReturn={() => {
              setIslandArrivalMode('standard');
              managerRef.current?.transitionTo('state-archipelago');
            }}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO GALAXIAN (1979) — ENJAMBRE ESPACIAL RGB DE LOS CUATRO CAMINOS
         ========================================================= */}
      <section id="state-galaxian" className="view-state z-10 px-4 py-4 arcade-hall-backdrop">
        {windowReady && activeState === 'state-galaxian' && (
          <Galaxian1979Stage
            alreadyRestored={Boolean(progressState.games['galaxian']?.memoryUnlocked)}
            bestSavedScore={progressState.games['galaxian']?.bestScore ?? 0}
            onMemoryRestored={(finalScore: number) => {
              setProgressState((prev) => recordGameVictory(prev, 'galaxian', finalScore, 2));
              window.dispatchEvent(new CustomEvent('pixelverse-shake'));
            }}
            onReturnToRoom={() => {
              setIslandArrivalMode('standard');
              managerRef.current?.transitionTo('state-archipelago');
            }}
          />
        )}
      </section>

      {/* =========================================================
          ESTADO CRUCE DE CIRCUITOS (1979) — PROTOTIPO DEL BOSQUE
         ========================================================= */}
      <section id="state-frogger" className="view-state z-10 px-4 py-4 arcade-hall-backdrop">
        {windowReady && activeState === 'state-frogger' && (
          <CircuitoAnfibio1979Stage
            alreadyRestored={Boolean(progressState.games['frogger']?.memoryUnlocked)}
            bestSavedScore={progressState.games['frogger']?.bestScore ?? 0}
            onVictory={(finalScore: number) => {
              setProgressState((prev) => {
                const next = recordGameVictory(prev, 'frogger', finalScore);
                // La pieza del generador sólo se imprime si Kertz encargó esa
                // misión. En la nueva trama el gabinete es la prueba de Dylan.
                const generatorQuestActive =
                  prev.rpg.questStates['quest-generador-retrostate'] === 'active';
                if (!generatorQuestActive) return next;
                const alreadyHasPart = next.rpg.inventoryItems.includes('item-pieza-generador');
                const partOpened = next.rpg.openedChestIds.includes('origen-frogger-part');
                if (alreadyHasPart || partOpened) return next;
                return openRpgChest(next, 'origen-frogger-part', ['item-pieza-generador']);
              });
              window.dispatchEvent(new CustomEvent('pixelverse-shake'));
            }}
            onReturnToRoom={() => {
              setIslandArrivalMode('standard');
              managerRef.current?.transitionTo('state-archipelago');
            }}
          />
        )}
      </section>

    </div>
  );
}
