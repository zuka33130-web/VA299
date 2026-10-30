/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sistema integral de progresión, persistencia y estado histórico de PIXELVERSE.
 * Gestiona de forma coherente y tolerante a fallos:
 * - Zonas visitadas
 * - Gabinetes desbloqueados
 * - Memorias restauradas (con bloqueo ante recompensas duplicadas)
 * - Coleccionables únicos (Diamantes de Memoria)
 * - Objetivos completados
 * - Habilidades obtenidas
 * - Checkpoints activos por nivel
 * - Eventos narrativos importantes
 */

import { HistoricalGameId } from './historicalCatalog';

export type TransitionStageStatus = 'none' | 'pending' | 'completed';

export type PixelAbilityId =
  | 'phase-sprint'
  | 'pong-hoverboard'
  | 'phase-dash'
  | 'star-shuttle'
  | 'phosphor-lantern'
  | 'secret-scanner'
  | 'circuit-welder';

export type QuestProgressStatus = 'inactive' | 'active' | 'completed';

export interface SavedPlayerOptions {
  playerName: string;
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  bootColor: string;
  outfitId: string;
  accessories: string[];
  transformationId: string | null;
  gbGreenMode: boolean;
  audioMuted?: boolean;
}

export interface RpgExplorationState {
  inventoryItems: string[];
  equippedCosmetic: string | null;
  openedChestIds: string[];
  discoveredSecretIds: string[];
  solvedPuzzleIds: string[];
  repairedMechanismIds: string[];
  discoveredClueIds: string[];
  solvedCaseIds: string[];
  calmedCreatureIds: string[];
  inspectedExhibitIds: string[];
  questStates: Record<string, 'active' | 'completed'>;
  unlockedIslands: string[];
  lanternActive: boolean;
  lastSafeArea: 'exterior-70s' | 'island-80s';
  last80sPos: { x: number; y: number } | null;
  achievementsUnlocked: string[];
  lastManualSaveIso: string | null;
  savedOptions: SavedPlayerOptions;
  cuatroCaminosRestored?: boolean;
  dylanEscortActive?: boolean;
  dylanEscortCompleted?: boolean;
  germaniumTransistorsDelivered?: boolean;
  origenMasterStabilized?: boolean;
  cuevaPulseAligned?: boolean;
  cuevaCircuitSolved?: boolean;
  cuevaMemorySolved?: boolean;
  powersState?: RpgPowersState;
}

export interface RpgPowersState {
  flightFuel: number;
  maxFlightFuel: number;
  lanternBattery: number;
  maxLanternBattery: number;
  scannerEnergy: number;
  maxScannerEnergy: number;
  welderEnergy: number;
  maxWelderEnergy: number;
  upgradesPurchased: string[];
}

export interface GameRestorationRecord {
  id: HistoricalGameId;
  started: boolean;
  completed: boolean;
  memoryUnlocked: boolean;
  ceremonyShown: boolean;
  transitionStatus: TransitionStageStatus;
  returnedToIsland: boolean;
  bestScore: number;
  completionsCount: number;
}

export interface Island70sExplorationState {
  visitedZones: string[];
  unlockedCabinets: string[];
  collectedDiamondIds: string[];
  discoveredEchoIds: string[];
  activatedIslandSwitches: string[];
  talkedNpcIds: string[];
  completedObjectives: string[];
  abilitiesUnlocked: PixelAbilityId[];
  checkpoints: Record<string, string>;
  narrativeEvents: string[];
  glitchTrailCompleted: boolean;
  lastIslandPos: { x: number; y: number } | null;
}

export interface PixelverseProgressState {
  schemaVersion: number;
  games: Record<string, GameRestorationRecord>;
  diamondsSaved: number;
  /** Diamantes ya invertidos en mejoras. El saldo disponible es diamondsSaved - diamondsSpent. */
  diamondsSpent: number;
  restoredCount: number;
  island70s: Island70sExplorationState;
  rpg: RpgExplorationState;
}

const STORAGE_KEY_V2 = 'pixelverse_adventure_progress_v2';
const LEGACY_STORAGE_KEY_V1 = 'pixelverse_historical_progress_v1';

export const PONG_UNLOCK_SCORE = 1000;
export const BREAKOUT_UNLOCK_SCORE = 400;
export const SPACE_INVADERS_UNLOCK_SCORE = 1000;

function createDefaultRecord(id: HistoricalGameId): GameRestorationRecord {
  return {
    id,
    started: false,
    completed: false,
    memoryUnlocked: false,
    ceremonyShown: false,
    transitionStatus: 'none',
    returnedToIsland: false,
    bestScore: 0,
    completionsCount: 0,
  };
}

export function createDefaultRpgState(): RpgExplorationState {
  return {
    inventoryItems: ['item-bitacora-cero'],
    equippedCosmetic: null,
    openedChestIds: [],
    discoveredSecretIds: [],
    solvedPuzzleIds: [],
    repairedMechanismIds: [],
    discoveredClueIds: [],
    solvedCaseIds: [],
    calmedCreatureIds: [],
    inspectedExhibitIds: [],
    questStates: {
      'quest-pulso-1972': 'active',
    },
    unlockedIslands: ['island-70s'],
    lanternActive: false,
    lastSafeArea: 'exterior-70s',
    last80sPos: null,
    achievementsUnlocked: [],
    lastManualSaveIso: null,
    cuatroCaminosRestored: false,
    dylanEscortActive: false,
    dylanEscortCompleted: false,
    germaniumTransistorsDelivered: false,
    origenMasterStabilized: false,
    cuevaPulseAligned: false,
    cuevaCircuitSolved: false,
    cuevaMemorySolved: false,
    powersState: {
      flightFuel: 100,
      maxFlightFuel: 100,
      lanternBattery: 100,
      maxLanternBattery: 100,
      scannerEnergy: 100,
      maxScannerEnergy: 100,
      welderEnergy: 100,
      maxWelderEnergy: 100,
      upgradesPurchased: [],
    },
    savedOptions: {
      playerName: 'Pixel',
      skinColor: '#ffccaa',
      hairColor: '#331100',
      shirtColor: '#00f3ff',
      bootColor: '#1e293b',
      outfitId: 'classic',
      accessories: [],
      transformationId: null,
      gbGreenMode: false,
      audioMuted: false,
    },
  };
}

export function createDefaultIsland70sState(): Island70sExplorationState {
  return {
    visitedZones: ['costa-despertar'],
    unlockedCabinets: ['pong'],
    collectedDiamondIds: [],
    discoveredEchoIds: [],
    activatedIslandSwitches: [],
    talkedNpcIds: [],
    completedObjectives: ['awakened-70s'],
    abilitiesUnlocked: ['phase-sprint'],
    checkpoints: {},
    narrativeEvents: ['awakening-coast'],
    glitchTrailCompleted: false,
    lastIslandPos: null,
  };
}

export function createInitialProgressState(): PixelverseProgressState {
  return {
    schemaVersion: 3,
    games: {
      pong: createDefaultRecord('pong'),
      breakout: createDefaultRecord('breakout'),
      asteroids: createDefaultRecord('asteroids'),
      'sea-wolf': createDefaultRecord('sea-wolf'),
      tank: createDefaultRecord('tank'),
      'lunar-lander': createDefaultRecord('lunar-lander'),
      'donkey-kong': createDefaultRecord('donkey-kong'),
      'space-invaders': createDefaultRecord('space-invaders'),
      'glitch-trail': createDefaultRecord('glitch-trail'),
      'night-driver': createDefaultRecord('night-driver'),
      galaxian: createDefaultRecord('galaxian'),
      frogger: createDefaultRecord('frogger'),
    },
    diamondsSaved: 0,
    diamondsSpent: 0,
    restoredCount: 0,
    island70s: createDefaultIsland70sState(),
    rpg: createDefaultRpgState(),
  };
}

function countRestored(games: Record<string, GameRestorationRecord>): number {
  const coreHistoricalIds = [
    'pong',
    'breakout',
    'asteroids',
    'sea-wolf',
    'tank',
    'lunar-lander',
    'space-invaders',
    'glitch-trail',
    'night-driver',
    'galaxian',
  ];
  return coreHistoricalIds.filter((id) => games[id]?.memoryUnlocked).length;
}

function sanitizeStringArray<T extends string = string>(
  arr: unknown,
  fallback: T[] = []
): T[] {
  if (!Array.isArray(arr)) return fallback;
  const cleaned = arr.filter((item): item is T => typeof item === 'string' && item.length > 0);
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : fallback;
}

function clampPowerValue(
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const numeric =
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.max(min, Math.min(max, numeric));
}

function sanitizePowersState(raw: unknown): RpgPowersState {
  const defaults: RpgPowersState = {
    flightFuel: 100,
    maxFlightFuel: 100,
    lanternBattery: 100,
    maxLanternBattery: 100,
    scannerEnergy: 100,
    maxScannerEnergy: 100,
    welderEnergy: 100,
    maxWelderEnergy: 100,
    upgradesPurchased: [],
  };
  if (!raw || typeof raw !== 'object') return defaults;

  const source = raw as Partial<RpgPowersState>;
  const maxFlightFuel = clampPowerValue(
    source.maxFlightFuel,
    defaults.maxFlightFuel,
    50,
    500
  );
  const maxLanternBattery = clampPowerValue(
    source.maxLanternBattery,
    defaults.maxLanternBattery,
    50,
    500
  );
  const maxScannerEnergy = clampPowerValue(
    source.maxScannerEnergy,
    defaults.maxScannerEnergy,
    50,
    500
  );
  const maxWelderEnergy = clampPowerValue(
    source.maxWelderEnergy,
    defaults.maxWelderEnergy,
    50,
    500
  );

  return {
    maxFlightFuel,
    maxLanternBattery,
    maxScannerEnergy,
    maxWelderEnergy,
    flightFuel: clampPowerValue(source.flightFuel, maxFlightFuel, 0, maxFlightFuel),
    lanternBattery: clampPowerValue(
      source.lanternBattery,
      maxLanternBattery,
      0,
      maxLanternBattery
    ),
    scannerEnergy: clampPowerValue(
      source.scannerEnergy,
      maxScannerEnergy,
      0,
      maxScannerEnergy
    ),
    welderEnergy: clampPowerValue(
      source.welderEnergy,
      maxWelderEnergy,
      0,
      maxWelderEnergy
    ),
    upgradesPurchased: sanitizeStringArray(source.upgradesPurchased),
  };
}

function sanitizeCheckpoints(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && v.length > 0) {
      out[k] = v;
    }
  }
  return out;
}

function sanitizeQuestStates(raw: unknown): Record<string, 'active' | 'completed'> {
  const out: Record<string, 'active' | 'completed'> = {
    'quest-pulso-1972': 'active',
  };
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === 'active' || v === 'completed') {
      out[k] = v;
    }
  }
  return out;
}

function deriveCoherentRpgState(
  rpg: RpgExplorationState,
  games: Record<string, GameRestorationRecord>
): RpgExplorationState {
  const pongDone = Boolean(games['pong']?.memoryUnlocked);
  const breakoutDone = Boolean(games['breakout']?.memoryUnlocked);
  const asteroidsDone = Boolean(games['asteroids']?.memoryUnlocked);
  const tankDone = Boolean(games['tank']?.memoryUnlocked);
  const landerDone = Boolean(games['lunar-lander']?.memoryUnlocked);
  const invadersDone = Boolean(games['space-invaders']?.memoryUnlocked);
  const dkDone = Boolean(games['donkey-kong']?.memoryUnlocked);

  const items = new Set<string>(rpg.inventoryItems);
  items.add('item-bitacora-cero');
  if (pongDone) {
    items.add('item-lampara-fosforo');
    items.add('item-polvo-fosforo');
    items.add('item-barra-pong');
  }
  if (breakoutDone) {
    items.add('item-prisma-breakout');
    items.add('item-espada-cambiante');
  }
  if (asteroidsDone) {
    items.add('item-modulo-orbital');
  }
  // El Sonar ya no se obtiene en Sea Wolf: lo entrega el viejo amigo en la cala
  // de Isla del Origen (fuente única, sin duplicar poderes).
  if (tankDone) {
    items.add('item-llave-bunker-militar');
  }
  if (landerDone) {
    items.add('item-lente-cuantica-vectorial');
  }
  if (invadersDone) {
    items.add('item-pase-astral-80s');
  }
  if (dkDone) {
    items.add('item-insignia-vigas-1981');
  }

  const unlockedIslands = new Set<string>(rpg.unlockedIslands);
  unlockedIslands.add('island-70s');
  if (invadersDone || dkDone) {
    unlockedIslands.add('island-80s');
  }

  const quests: Record<string, 'active' | 'completed'> = { ...rpg.questStates };
  if (pongDone) {
    quests['quest-pulso-1972'] = 'completed';
    if (!quests['quest-defensa-1978']) {
      quests['quest-defensa-1978'] = 'active';
    }
  } else if (!quests['quest-pulso-1972']) {
    quests['quest-pulso-1972'] = 'active';
  }

  if (breakoutDone) {
    quests['quest-muro-1976'] = 'completed';
  }

  if (invadersDone) {
    quests['quest-defensa-1978'] = 'completed';
    if (!quests['quest-despertar-1981']) {
      quests['quest-despertar-1981'] = 'active';
    }
  }
  if (dkDone) {
    quests['quest-despertar-1981'] = 'completed';
  }

  const achievements = new Set<string>(rpg.achievementsUnlocked || []);
  if (pongDone) {
    achievements.add('pong-pionero-1972');
  }
  if (
    breakoutDone ||
    (games['breakout']?.bestScore ?? 0) >= BREAKOUT_UNLOCK_SCORE
  ) {
    achievements.add('breakout-secreto-1976');
  }
  if (
    invadersDone ||
    (games['space-invaders']?.bestScore ?? 0) >= SPACE_INVADERS_UNLOCK_SCORE
  ) {
    achievements.add('invaders-1000-pts');
  }
  if (dkDone) {
    achievements.add('vigas-1981');
  }
  if ((rpg.solvedCaseIds || []).length >= 3) {
    achievements.add('investigador-cronista-70s');
  }

  return {
    ...rpg,
    inventoryItems: Array.from(items),
    unlockedIslands: Array.from(unlockedIslands),
    questStates: quests,
    achievementsUnlocked: Array.from(achievements),
  };
}

function deriveCoherentIslandState(
  island: Island70sExplorationState,
  games: Record<string, GameRestorationRecord>,
  rpg?: RpgExplorationState
): Island70sExplorationState {
  const pongDone = Boolean(games['pong']?.memoryUnlocked);
  const breakoutDone = Boolean(games['breakout']?.memoryUnlocked);
  const trailDone =
    island.glitchTrailCompleted || Boolean(games['glitch-trail']?.completed);
  const invadersDone = Boolean(games['space-invaders']?.memoryUnlocked);

  const unlockedCabinets = new Set<string>(island.unlockedCabinets);
  unlockedCabinets.add('pong');
  if (breakoutDone || rpg?.discoveredSecretIds.includes('secret-sala-breakout-1976')) {
    unlockedCabinets.add('breakout');
  }
  if (trailDone || invadersDone) {
    unlockedCabinets.add('space-invaders');
  }

  const abilities = new Set<PixelAbilityId>(island.abilitiesUnlocked);
  abilities.add('phase-sprint');
  if (pongDone) {
    abilities.add('pong-hoverboard');
    abilities.add('phase-dash');
    abilities.add('phosphor-lantern');
  }
  if (invadersDone) {
    abilities.add('star-shuttle');
  }
  if (rpg?.inventoryItems.includes('item-escaner-frecuencias')) {
    abilities.add('secret-scanner');
  }
  if (rpg?.inventoryItems.includes('item-soldador-logico')) {
    abilities.add('circuit-welder');
  }
  if (rpg?.inventoryItems.includes('item-lampara-fosforo')) {
    abilities.add('phosphor-lantern');
  }

  // Migración de partidas anteriores a la nueva llegada por la cala: si el
  // jugador ya estaba en el asentamiento (norte del canal) o visitó otros
  // sectores, el puente se considera abierto para no encerrarlo sin salida.
  const narrativeEvents = new Set<string>(island.narrativeEvents);
  const legacyNorthOfCanal =
    island.lastIslandPos !== null && island.lastIslandPos.y < 1872;
  const legacyProgress =
    legacyNorthOfCanal ||
    island.glitchTrailCompleted ||
    island.visitedZones.some((z) => z !== 'costa-despertar') ||
    island.talkedNpcIds.some((id) => id !== 'npc-viejo-amigo');
  if (legacyProgress) {
    narrativeEvents.add('origen-puente-abierto');
  }

  const objectives = new Set<string>(island.completedObjectives);
  objectives.add('awakened-70s');
  if (pongDone) objectives.add('pong-restored');
  if (
    island.activatedIslandSwitches.includes('sw-bosque-sur') &&
    island.activatedIslandSwitches.includes('sw-ruinas-sur')
  ) {
    objectives.add('south-bridge-rebuilt');
  }
  if (island.activatedIslandSwitches.includes('sw-caverna-cristal')) {
    objectives.add('cavern-unlocked');
  }
  if (trailDone) objectives.add('glitch-trail-completed');
  if (invadersDone) objectives.add('invaders-1000pts-restored');
  if (pongDone && trailDone && invadersDone) {
    objectives.add('decade-70s-stabilized');
  }

  return {
    ...island,
    glitchTrailCompleted: trailDone,
    unlockedCabinets: Array.from(unlockedCabinets),
    abilitiesUnlocked: Array.from(abilities),
    completedObjectives: Array.from(objectives),
    narrativeEvents: Array.from(narrativeEvents),
  };
}

function readRawStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v2 = window.localStorage.getItem(STORAGE_KEY_V2);
    if (v2) return v2;
  } catch {
    // Continúa con sessionStorage
  }
  try {
    return (
      window.sessionStorage.getItem(STORAGE_KEY_V2) ||
      window.sessionStorage.getItem(LEGACY_STORAGE_KEY_V1)
    );
  } catch {
    return null;
  }
}

export function loadProgressState(): PixelverseProgressState {
  const fallback = createInitialProgressState();
  const raw = readRawStorage();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<PixelverseProgressState>;
    if (!parsed || typeof parsed !== 'object' || !parsed.games) return fallback;

    const mergedGames: Record<string, GameRestorationRecord> = {
      ...fallback.games,
    };

    for (const [key, val] of Object.entries(parsed.games)) {
      if (val && typeof val === 'object') {
        const safeTransition: TransitionStageStatus =
          val.transitionStatus === 'pending' && val.completed
            ? 'completed'
            : val.transitionStatus || 'none';
        mergedGames[key] = {
          ...createDefaultRecord(key),
          ...val,
          id: key,
          bestScore: Math.max(0, Number(val.bestScore) || 0),
          completionsCount: Math.max(0, Number(val.completionsCount) || 0),
          transitionStatus: safeTransition,
        };
      }
    }

    const rawRpg = parsed.rpg;
    const baseRpg: RpgExplorationState =
      rawRpg && typeof rawRpg === 'object'
        ? {
            inventoryItems: sanitizeStringArray(rawRpg.inventoryItems, [
              'item-bitacora-cero',
            ]),
            equippedCosmetic:
              typeof rawRpg.equippedCosmetic === 'string' &&
              rawRpg.equippedCosmetic.length > 0
                ? rawRpg.equippedCosmetic
                : null,
            openedChestIds: sanitizeStringArray(rawRpg.openedChestIds),
            discoveredSecretIds: sanitizeStringArray(rawRpg.discoveredSecretIds),
            solvedPuzzleIds: sanitizeStringArray(rawRpg.solvedPuzzleIds),
            repairedMechanismIds: sanitizeStringArray(rawRpg.repairedMechanismIds),
            discoveredClueIds: sanitizeStringArray(rawRpg.discoveredClueIds),
            solvedCaseIds: sanitizeStringArray(rawRpg.solvedCaseIds),
            calmedCreatureIds: sanitizeStringArray(rawRpg.calmedCreatureIds),
            inspectedExhibitIds: sanitizeStringArray(rawRpg.inspectedExhibitIds),
            questStates: sanitizeQuestStates(rawRpg.questStates),
            unlockedIslands: sanitizeStringArray(rawRpg.unlockedIslands, ['island-70s']),
            lanternActive: Boolean(rawRpg.lanternActive),
            lastSafeArea:
              rawRpg.lastSafeArea === 'island-80s' ? 'island-80s' : 'exterior-70s',
            last80sPos:
              rawRpg.last80sPos &&
              typeof rawRpg.last80sPos.x === 'number' &&
              typeof rawRpg.last80sPos.y === 'number' &&
              Number.isFinite(rawRpg.last80sPos.x) &&
              Number.isFinite(rawRpg.last80sPos.y)
                ? { x: rawRpg.last80sPos.x, y: rawRpg.last80sPos.y }
                : null,
            achievementsUnlocked: sanitizeStringArray(rawRpg.achievementsUnlocked),
            lastManualSaveIso:
              typeof rawRpg.lastManualSaveIso === 'string' &&
              rawRpg.lastManualSaveIso.length > 0
                ? rawRpg.lastManualSaveIso
                : null,
            savedOptions:
              rawRpg.savedOptions && typeof rawRpg.savedOptions === 'object'
                ? {
                    playerName:
                      typeof rawRpg.savedOptions.playerName === 'string'
                        ? rawRpg.savedOptions.playerName
                        : 'Pixel',
                    skinColor:
                      typeof rawRpg.savedOptions.skinColor === 'string'
                        ? rawRpg.savedOptions.skinColor
                        : '#ffccaa',
                    hairColor:
                      typeof rawRpg.savedOptions.hairColor === 'string'
                        ? rawRpg.savedOptions.hairColor
                        : '#331100',
                    shirtColor:
                      typeof rawRpg.savedOptions.shirtColor === 'string'
                        ? rawRpg.savedOptions.shirtColor
                        : '#00f3ff',
                    bootColor:
                      typeof rawRpg.savedOptions.bootColor === 'string'
                        ? rawRpg.savedOptions.bootColor
                        : '#1e293b',
                    outfitId:
                      typeof rawRpg.savedOptions.outfitId === 'string'
                        ? rawRpg.savedOptions.outfitId
                        : 'classic',
                    accessories: sanitizeStringArray(rawRpg.savedOptions.accessories),
                    transformationId:
                      typeof rawRpg.savedOptions.transformationId === 'string'
                        ? rawRpg.savedOptions.transformationId
                        : null,
                    gbGreenMode: Boolean(rawRpg.savedOptions.gbGreenMode),
                    audioMuted: Boolean(rawRpg.savedOptions.audioMuted),
                  }
                : {
                    playerName: 'Pixel',
                    skinColor: '#ffccaa',
                    hairColor: '#331100',
                    shirtColor: '#00f3ff',
                    bootColor: '#1e293b',
                    outfitId: 'classic',
                    accessories: [],
                    transformationId: null,
                    gbGreenMode: false,
                    audioMuted: false,
                  },
            powersState: sanitizePowersState(rawRpg.powersState),
          }
        : createDefaultRpgState();

    const coherentRpg = deriveCoherentRpgState(baseRpg, mergedGames);

    const rawIsland = parsed.island70s;
    const baseIsland: Island70sExplorationState =
      rawIsland && typeof rawIsland === 'object'
        ? {
            visitedZones: sanitizeStringArray(rawIsland.visitedZones, ['costa-despertar']),
            unlockedCabinets: sanitizeStringArray(rawIsland.unlockedCabinets, ['pong']),
            collectedDiamondIds: sanitizeStringArray(rawIsland.collectedDiamondIds),
            discoveredEchoIds: sanitizeStringArray(rawIsland.discoveredEchoIds),
            activatedIslandSwitches: sanitizeStringArray(rawIsland.activatedIslandSwitches),
            talkedNpcIds: sanitizeStringArray(rawIsland.talkedNpcIds),
            completedObjectives: sanitizeStringArray(rawIsland.completedObjectives, [
              'awakened-70s',
            ]),
            abilitiesUnlocked: sanitizeStringArray<PixelAbilityId>(
              rawIsland.abilitiesUnlocked,
              ['phase-sprint']
            ),
            checkpoints: sanitizeCheckpoints(rawIsland.checkpoints),
            narrativeEvents: sanitizeStringArray(rawIsland.narrativeEvents, [
              'awakening-coast',
            ]),
            glitchTrailCompleted: Boolean(rawIsland.glitchTrailCompleted),
            lastIslandPos:
              rawIsland.lastIslandPos &&
              typeof rawIsland.lastIslandPos.x === 'number' &&
              typeof rawIsland.lastIslandPos.y === 'number' &&
              Number.isFinite(rawIsland.lastIslandPos.x) &&
              Number.isFinite(rawIsland.lastIslandPos.y)
                ? { x: rawIsland.lastIslandPos.x, y: rawIsland.lastIslandPos.y }
                : null,
          }
        : createDefaultIsland70sState();

    const coherentIsland = deriveCoherentIslandState(baseIsland, mergedGames, coherentRpg);
    const uniqueDiamondCount = coherentIsland.collectedDiamondIds.length;
    const savedDiamonds = Math.max(
      uniqueDiamondCount,
      Math.max(0, Number(parsed.diamondsSaved) || 0)
    );
    const savedSpent = Math.min(
      savedDiamonds,
      Math.max(0, Number(parsed.diamondsSpent) || 0)
    );

    return {
      schemaVersion: 3,
      games: mergedGames,
      diamondsSaved: savedDiamonds,
      diamondsSpent: savedSpent,
      restoredCount: countRestored(mergedGames),
      island70s: coherentIsland,
      rpg: coherentRpg,
    };
  } catch {
    return fallback;
  }
}

export function saveProgressState(state: PixelverseProgressState): void {
  if (typeof window === 'undefined') return;
  const serialized = JSON.stringify(state);
  try {
    window.localStorage.setItem(STORAGE_KEY_V2, serialized);
  } catch {
    // Ignorar si almacenamiento persistente está restringido
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY_V2, serialized);
  } catch {
    // Continúa en memoria
  }
}

export function resetProgressState(): PixelverseProgressState {
  const fresh = createInitialProgressState();
  saveProgressState(fresh);
  return fresh;
}

export function markGameStarted(
  prev: PixelverseProgressState,
  gameId: HistoricalGameId
): PixelverseProgressState {
  const existing = prev.games[gameId] || createDefaultRecord(gameId);
  if (existing.started) return prev;
  const nextGames = {
    ...prev.games,
    [gameId]: {
      ...existing,
      started: true,
    },
  };
  const next: PixelverseProgressState = {
    ...prev,
    games: nextGames,
  };
  saveProgressState(next);
  return next;
}

export function recordGameVictory(
  prev: PixelverseProgressState,
  gameId: HistoricalGameId,
  score = 0,
  diamondsEarned = 0
): PixelverseProgressState {
  const existing = prev.games[gameId] || createDefaultRecord(gameId);
  const qualifiesForMemory =
    gameId === 'space-invaders'
      ? score >= SPACE_INVADERS_UNLOCK_SCORE
      : gameId === 'breakout'
      ? score >= BREAKOUT_UNLOCK_SCORE
      : gameId === 'pong'
      ? score >= PONG_UNLOCK_SCORE || score === 3
      : true;

  const updated: GameRestorationRecord = {
    ...existing,
    started: true,
    completed: existing.completed || qualifiesForMemory,
    memoryUnlocked: existing.memoryUnlocked || qualifiesForMemory,
    transitionStatus: qualifiesForMemory ? 'pending' : existing.transitionStatus,
    bestScore: Math.max(existing.bestScore, score),
    completionsCount: qualifiesForMemory
      ? existing.completionsCount + 1
      : existing.completionsCount,
  };

  const nextGames = {
    ...prev.games,
    [gameId]: updated,
  };

  const nextIslandRaw: Island70sExplorationState =
    gameId === 'glitch-trail'
      ? {
          ...prev.island70s,
          glitchTrailCompleted: true,
          narrativeEvents: Array.from(
            new Set([...prev.island70s.narrativeEvents, 'garganta-bridge-rebuilt'])
          ),
        }
      : prev.island70s;

  const coherentRpg = deriveCoherentRpgState(prev.rpg, nextGames);
  const coherentIsland = deriveCoherentIslandState(nextIslandRaw, nextGames, coherentRpg);

  const next: PixelverseProgressState = {
    schemaVersion: 3,
    games: nextGames,
    diamondsSaved: Math.max(
      prev.diamondsSaved,
      coherentIsland.collectedDiamondIds.length,
      diamondsEarned
    ),
    diamondsSpent: Math.max(0, Number(prev.diamondsSpent) || 0),
    restoredCount: countRestored(nextGames),
    island70s: coherentIsland,
    rpg: coherentRpg,
  };
  saveProgressState(next);
  return next;
}

export function markCeremonyCompleted(
  prev: PixelverseProgressState,
  gameId: HistoricalGameId
): PixelverseProgressState {
  const existing = prev.games[gameId] || createDefaultRecord(gameId);
  const nextGames = {
    ...prev.games,
    [gameId]: {
      ...existing,
      ceremonyShown: true,
    },
  };
  const next: PixelverseProgressState = {
    ...prev,
    games: nextGames,
    restoredCount: countRestored(nextGames),
  };
  saveProgressState(next);
  return next;
}

export function markTransitionFinished(
  prev: PixelverseProgressState,
  gameId: HistoricalGameId,
  returnedToIsland = false
): PixelverseProgressState {
  const existing = prev.games[gameId] || createDefaultRecord(gameId);
  const nextGames = {
    ...prev.games,
    [gameId]: {
      ...existing,
      ceremonyShown: true,
      transitionStatus: 'completed' as const,
      returnedToIsland: existing.returnedToIsland || returnedToIsland,
    },
  };
  const next: PixelverseProgressState = {
    ...prev,
    games: nextGames,
    restoredCount: countRestored(nextGames),
  };
  saveProgressState(next);
  return next;
}

export function collectUniqueMemoryDiamond(
  prev: PixelverseProgressState,
  diamondId: string
): PixelverseProgressState {
  if (prev.island70s.collectedDiamondIds.includes(diamondId)) return prev;
  const collectedDiamondIds = [...prev.island70s.collectedDiamondIds, diamondId];
  const next: PixelverseProgressState = {
    ...prev,
    diamondsSaved: Math.max(prev.diamondsSaved, collectedDiamondIds.length),
    island70s: deriveCoherentIslandState(
      {
        ...prev.island70s,
        collectedDiamondIds,
      },
      prev.games,
      prev.rpg
    ),
  };
  saveProgressState(next);
  return next;
}

export function recordIslandZoneVisited(
  prev: PixelverseProgressState,
  zoneId: string
): PixelverseProgressState {
  if (prev.island70s.visitedZones.includes(zoneId)) return prev;
  const next: PixelverseProgressState = {
    ...prev,
    island70s: {
      ...prev.island70s,
      visitedZones: [...prev.island70s.visitedZones, zoneId],
    },
  };
  saveProgressState(next);
  return next;
}

export function recordEchoDiscovered(
  prev: PixelverseProgressState,
  echoId: string
): PixelverseProgressState {
  if (prev.island70s.discoveredEchoIds.includes(echoId)) return prev;
  const next: PixelverseProgressState = {
    ...prev,
    island70s: {
      ...prev.island70s,
      discoveredEchoIds: [...prev.island70s.discoveredEchoIds, echoId],
    },
  };
  saveProgressState(next);
  return next;
}

export function recordIslandSwitchActivated(
  prev: PixelverseProgressState,
  switchId: string
): PixelverseProgressState {
  if (prev.island70s.activatedIslandSwitches.includes(switchId)) return prev;
  const activatedIslandSwitches = [...prev.island70s.activatedIslandSwitches, switchId];
  const next: PixelverseProgressState = {
    ...prev,
    island70s: deriveCoherentIslandState(
      {
        ...prev.island70s,
        activatedIslandSwitches,
      },
      prev.games,
      prev.rpg
    ),
  };
  saveProgressState(next);
  return next;
}

export function recordNpcTalked(
  prev: PixelverseProgressState,
  npcId: string
): PixelverseProgressState {
  if (prev.island70s.talkedNpcIds.includes(npcId)) return prev;
  const next: PixelverseProgressState = {
    ...prev,
    island70s: {
      ...prev.island70s,
      talkedNpcIds: [...prev.island70s.talkedNpcIds, npcId],
    },
  };
  saveProgressState(next);
  return next;
}

export function saveStageCheckpoint(
  prev: PixelverseProgressState,
  stageId: string,
  checkpointId: string
): PixelverseProgressState {
  if (prev.island70s.checkpoints[stageId] === checkpointId) return prev;
  const next: PixelverseProgressState = {
    ...prev,
    island70s: {
      ...prev.island70s,
      checkpoints: {
        ...prev.island70s.checkpoints,
        [stageId]: checkpointId,
      },
    },
  };
  saveProgressState(next);
  return next;
}

export function recordNarrativeEvent(
  prev: PixelverseProgressState,
  eventId: string
): PixelverseProgressState {
  if (prev.island70s.narrativeEvents.includes(eventId)) return prev;
  const next: PixelverseProgressState = {
    ...prev,
    island70s: {
      ...prev.island70s,
      narrativeEvents: [...prev.island70s.narrativeEvents, eventId],
    },
  };
  saveProgressState(next);
  return next;
}

/**
 * La paleta recogida en la Isla Natal se convierte en la Barra de Pong: objeto de
 * mochila y habilidad de vuelo, reutilizando el mismo sistema de la Isla del Origen.
 */
export function grantPongBoardAbility(
  prev: PixelverseProgressState
): PixelverseProgressState {
  const hasItem = prev.rpg.inventoryItems.includes('item-barra-pong');
  const hasAbility = prev.island70s.abilitiesUnlocked.includes('pong-hoverboard');
  if (hasItem && hasAbility) return prev;
  const next: PixelverseProgressState = {
    ...prev,
    rpg: {
      ...prev.rpg,
      inventoryItems: hasItem
        ? prev.rpg.inventoryItems
        : [...prev.rpg.inventoryItems, 'item-barra-pong'],
    },
    island70s: {
      ...prev.island70s,
      abilitiesUnlocked: hasAbility
        ? prev.island70s.abilitiesUnlocked
        : [...prev.island70s.abilitiesUnlocked, 'pong-hoverboard'],
    },
  };
  saveProgressState(next);
  return next;
}

export function saveLastIslandCoordinates(
  prev: PixelverseProgressState,
  x: number,
  y: number
): PixelverseProgressState {
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (
    prev.island70s.lastIslandPos &&
    prev.island70s.lastIslandPos.x === rx &&
    prev.island70s.lastIslandPos.y === ry &&
    prev.rpg.lastSafeArea === 'exterior-70s'
  ) {
    return prev;
  }
  const next: PixelverseProgressState = {
    ...prev,
    island70s: {
      ...prev.island70s,
      lastIslandPos: { x: rx, y: ry },
    },
    rpg: {
      ...prev.rpg,
      lastSafeArea: 'exterior-70s',
    },
  };
  saveProgressState(next);
  return next;
}

export function saveLast80sCoordinates(
  prev: PixelverseProgressState,
  x: number,
  y: number
): PixelverseProgressState {
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (
    prev.rpg.last80sPos &&
    prev.rpg.last80sPos.x === rx &&
    prev.rpg.last80sPos.y === ry &&
    prev.rpg.lastSafeArea === 'island-80s'
  ) {
    return prev;
  }
  const next: PixelverseProgressState = {
    ...prev,
    rpg: {
      ...prev.rpg,
      lastSafeArea: 'island-80s',
      last80sPos: { x: rx, y: ry },
    },
  };
  saveProgressState(next);
  return next;
}

export function grantInventoryItems(
  prev: PixelverseProgressState,
  itemIds: string[]
): PixelverseProgressState {
  const nextItems = Array.from(new Set([...prev.rpg.inventoryItems, ...itemIds]));
  if (nextItems.length === prev.rpg.inventoryItems.length) return prev;
  const nextRpg = deriveCoherentRpgState(
    {
      ...prev.rpg,
      inventoryItems: nextItems,
    },
    prev.games
  );
  const next: PixelverseProgressState = {
    ...prev,
    rpg: nextRpg,
    island70s: deriveCoherentIslandState(prev.island70s, prev.games, nextRpg),
  };
  saveProgressState(next);
  return next;
}

/** Quita objetos del inventario cuando se consumen o se instalan en el mundo. */
export function consumeInventoryItems(
  prev: PixelverseProgressState,
  itemIds: string[]
): PixelverseProgressState {
  const removing = new Set(itemIds);
  const nextItems = prev.rpg.inventoryItems.filter((id) => !removing.has(id));
  if (nextItems.length === prev.rpg.inventoryItems.length) return prev;
  const nextRpg = deriveCoherentRpgState(
    {
      ...prev.rpg,
      inventoryItems: nextItems,
    },
    prev.games
  );
  const next: PixelverseProgressState = {
    ...prev,
    rpg: nextRpg,
    island70s: deriveCoherentIslandState(prev.island70s, prev.games, nextRpg),
  };
  saveProgressState(next);
  return next;
}

export function openRpgChest(
  prev: PixelverseProgressState,
  chestId: string,
  rewardItemIds: string[]
): PixelverseProgressState {
  if (prev.rpg.openedChestIds.includes(chestId)) return prev;
  const nextRpg = deriveCoherentRpgState(
    {
      ...prev.rpg,
      openedChestIds: [...prev.rpg.openedChestIds, chestId],
      inventoryItems: Array.from(new Set([...prev.rpg.inventoryItems, ...rewardItemIds])),
    },
    prev.games
  );
  const next: PixelverseProgressState = {
    ...prev,
    rpg: nextRpg,
    island70s: deriveCoherentIslandState(prev.island70s, prev.games, nextRpg),
  };
  saveProgressState(next);
  return next;
}

export function discoverRpgSecret(
  prev: PixelverseProgressState,
  secretId: string
): PixelverseProgressState {
  if (prev.rpg.discoveredSecretIds.includes(secretId)) return prev;
  const powers = prev.rpg.powersState;
  const rechargeScanner =
    powers?.upgradesPurchased.includes('upg-scanner-recharge-1') ?? false;
  const nextPowers =
    powers && rechargeScanner
      ? {
          ...powers,
          scannerEnergy: Math.min(
            powers.maxScannerEnergy,
            powers.scannerEnergy + 5
          ),
        }
      : powers;
  const next: PixelverseProgressState = {
    ...prev,
    rpg: {
      ...prev.rpg,
      discoveredSecretIds: [...prev.rpg.discoveredSecretIds, secretId],
      ...(nextPowers ? { powersState: nextPowers } : {}),
    },
  };
  saveProgressState(next);
  return next;
}

export function solveRpgPuzzle(
  prev: PixelverseProgressState,
  puzzleId: string,
  rewardItemIds: string[] = []
): PixelverseProgressState {
  if (prev.rpg.solvedPuzzleIds.includes(puzzleId)) return prev;
  const nextRpg = deriveCoherentRpgState(
    {
      ...prev.rpg,
      solvedPuzzleIds: [...prev.rpg.solvedPuzzleIds, puzzleId],
      inventoryItems: Array.from(new Set([...prev.rpg.inventoryItems, ...rewardItemIds])),
    },
    prev.games
  );
  const next: PixelverseProgressState = {
    ...prev,
    rpg: nextRpg,
    island70s: deriveCoherentIslandState(prev.island70s, prev.games, nextRpg),
  };
  saveProgressState(next);
  return next;
}

export function repairRpgMechanism(
  prev: PixelverseProgressState,
  mechanismId: string,
  alsoSwitches: string[] = []
): PixelverseProgressState {
  if (prev.rpg.repairedMechanismIds.includes(mechanismId)) return prev;
  const nextRpg: RpgExplorationState = {
    ...prev.rpg,
    repairedMechanismIds: [...prev.rpg.repairedMechanismIds, mechanismId],
  };
  const nextSwitches = Array.from(
    new Set([...prev.island70s.activatedIslandSwitches, ...alsoSwitches])
  );
  const next: PixelverseProgressState = {
    ...prev,
    rpg: nextRpg,
    island70s: deriveCoherentIslandState(
      {
        ...prev.island70s,
        activatedIslandSwitches: nextSwitches,
      },
      prev.games,
      nextRpg
    ),
  };
  saveProgressState(next);
  return next;
}

export function updateQuestStatus(
  prev: PixelverseProgressState,
  questId: string,
  status: 'active' | 'completed',
  rewardItemIds: string[] = []
): PixelverseProgressState {
  const existing = prev.rpg.questStates[questId];
  if (existing === 'completed' && status === 'active') return prev;
  if (existing === status && rewardItemIds.length === 0) return prev;

  const nextRpg = deriveCoherentRpgState(
    {
      ...prev.rpg,
      questStates: {
        ...prev.rpg.questStates,
        [questId]: status,
      },
      inventoryItems: Array.from(new Set([...prev.rpg.inventoryItems, ...rewardItemIds])),
    },
    prev.games
  );
  const next: PixelverseProgressState = {
    ...prev,
    rpg: nextRpg,
    island70s: deriveCoherentIslandState(prev.island70s, prev.games, nextRpg),
  };
  saveProgressState(next);
  return next;
}

export function setEquippedCosmetic(
  prev: PixelverseProgressState,
  cosmeticId: string | null
): PixelverseProgressState {
  if (prev.rpg.equippedCosmetic === cosmeticId) return prev;
  const next: PixelverseProgressState = {
    ...prev,
    rpg: {
      ...prev.rpg,
      equippedCosmetic: cosmeticId,
    },
  };
  saveProgressState(next);
  return next;
}

export function togglePhosphorLanternState(
  prev: PixelverseProgressState,
  forceValue?: boolean
): PixelverseProgressState {
  const nextVal = forceValue !== undefined ? forceValue : !prev.rpg.lanternActive;
  if (prev.rpg.lanternActive === nextVal) return prev;
  const next: PixelverseProgressState = {
    ...prev,
    rpg: {
      ...prev.rpg,
      lanternActive: nextVal,
    },
  };
  saveProgressState(next);
  return next;
}

export function recordManualSaveCheckpoint(
  prev: PixelverseProgressState,
  x: number,
  y: number
): PixelverseProgressState {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const iso = new Date().toISOString();
  const next: PixelverseProgressState = {
    ...prev,
    island70s: {
      ...prev.island70s,
      lastIslandPos: { x: rx, y: ry },
    },
    rpg: {
      ...prev.rpg,
      lastSafeArea: 'exterior-70s',
      lastManualSaveIso: iso,
    },
  };
  saveProgressState(next);
  return next;
}

export function recordManualSave80sCheckpoint(
  prev: PixelverseProgressState,
  x: number,
  y: number
): PixelverseProgressState {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const iso = new Date().toISOString();
  const next: PixelverseProgressState = {
    ...prev,
    rpg: {
      ...prev.rpg,
      lastSafeArea: 'island-80s',
      last80sPos: { x: rx, y: ry },
      lastManualSaveIso: iso,
    },
  };
  saveProgressState(next);
  return next;
}

export function recordGlobalManualSave(
  prev: PixelverseProgressState
): PixelverseProgressState {
  const iso = new Date().toISOString();
  const next: PixelverseProgressState = {
    ...prev,
    rpg: {
      ...prev.rpg,
      lastManualSaveIso: iso,
    },
  };
  saveProgressState(next);
  return next;
}

export function savePlayerOptions(
  prev: PixelverseProgressState,
  opts: Partial<SavedPlayerOptions>
): PixelverseProgressState {
  const merged: SavedPlayerOptions = {
    ...prev.rpg.savedOptions,
    ...opts,
  };
  if (
    merged.playerName === prev.rpg.savedOptions.playerName &&
    merged.skinColor === prev.rpg.savedOptions.skinColor &&
    merged.hairColor === prev.rpg.savedOptions.hairColor &&
    merged.shirtColor === prev.rpg.savedOptions.shirtColor &&
    merged.bootColor === prev.rpg.savedOptions.bootColor &&
    merged.outfitId === prev.rpg.savedOptions.outfitId &&
    merged.transformationId === prev.rpg.savedOptions.transformationId &&
    merged.accessories.length === prev.rpg.savedOptions.accessories.length &&
    merged.accessories.every((id, index) => id === prev.rpg.savedOptions.accessories[index]) &&
    merged.gbGreenMode === prev.rpg.savedOptions.gbGreenMode &&
    Boolean(merged.audioMuted) === Boolean(prev.rpg.savedOptions.audioMuted)
  ) {
    return prev;
  }
  const next: PixelverseProgressState = {
    ...prev,
    rpg: {
      ...prev.rpg,
      savedOptions: merged,
    },
  };
  saveProgressState(next);
  return next;
}

export function discoverInvestigationClue(
  prev: PixelverseProgressState,
  clueId: string
): PixelverseProgressState {
  if (prev.rpg.discoveredClueIds.includes(clueId)) return prev;
  const next: PixelverseProgressState = {
    ...prev,
    rpg: {
      ...prev.rpg,
      discoveredClueIds: [...prev.rpg.discoveredClueIds, clueId],
    },
  };
  saveProgressState(next);
  return next;
}

export function solveInvestigationCase(
  prev: PixelverseProgressState,
  caseId: string,
  rewardItemIds: string[] = []
): PixelverseProgressState {
  if (prev.rpg.solvedCaseIds.includes(caseId)) return prev;
  const nextRpg = deriveCoherentRpgState(
    {
      ...prev.rpg,
      solvedCaseIds: [...prev.rpg.solvedCaseIds, caseId],
      inventoryItems: Array.from(new Set([...prev.rpg.inventoryItems, ...rewardItemIds])),
    },
    prev.games
  );
  const next: PixelverseProgressState = {
    ...prev,
    rpg: nextRpg,
    island70s: deriveCoherentIslandState(prev.island70s, prev.games, nextRpg),
  };
  saveProgressState(next);
  return next;
}

export function calmGuardianCreature(
  prev: PixelverseProgressState,
  creatureId: string,
  rewardItemIds: string[] = []
): PixelverseProgressState {
  if (prev.rpg.calmedCreatureIds.includes(creatureId)) return prev;
  const nextRpg = deriveCoherentRpgState(
    {
      ...prev.rpg,
      calmedCreatureIds: [...prev.rpg.calmedCreatureIds, creatureId],
      inventoryItems: Array.from(new Set([...prev.rpg.inventoryItems, ...rewardItemIds])),
    },
    prev.games
  );
  const next: PixelverseProgressState = {
    ...prev,
    rpg: nextRpg,
    island70s: deriveCoherentIslandState(prev.island70s, prev.games, nextRpg),
  };
  saveProgressState(next);
  return next;
}

export function recordMuseumExhibitInspected(
  prev: PixelverseProgressState,
  exhibitId: string
): PixelverseProgressState {
  if (prev.rpg.inspectedExhibitIds.includes(exhibitId)) return prev;
  const next: PixelverseProgressState = {
    ...prev,
    rpg: {
      ...prev.rpg,
      inspectedExhibitIds: [...prev.rpg.inspectedExhibitIds, exhibitId],
    },
  };
  saveProgressState(next);
  return next;
}

export function setRpgFlag<K extends keyof RpgExplorationState>(
  prev: PixelverseProgressState,
  key: K,
  val: RpgExplorationState[K]
): PixelverseProgressState {
  const next: PixelverseProgressState = {
    ...prev,
    rpg: {
      ...prev.rpg,
      [key]: val,
    },
  };
  saveProgressState(next);
  return next;
}

export function restoreCuatroCaminosState(
  prev: PixelverseProgressState
): PixelverseProgressState {
  const next: PixelverseProgressState = {
    ...prev,
    rpg: {
      ...prev.rpg,
      cuatroCaminosRestored: true,
      dylanEscortActive: false,
      dylanEscortCompleted: true,
      germaniumTransistorsDelivered: true,
      questStates: {
        ...prev.rpg.questStates,
        'quest-cuatro-caminos-dylan': 'completed',
      },
    },
  };
  saveProgressState(next);
  return next;
}

export function rechargeAllPowers(
  prev: PixelverseProgressState
): PixelverseProgressState {
  const current = prev.rpg.powersState ?? {
    flightFuel: 100,
    maxFlightFuel: 100,
    lanternBattery: 100,
    maxLanternBattery: 100,
    scannerEnergy: 100,
    maxScannerEnergy: 100,
    welderEnergy: 100,
    maxWelderEnergy: 100,
    upgradesPurchased: [],
  };

  const next: PixelverseProgressState = {
    ...prev,
    rpg: {
      ...prev.rpg,
      powersState: {
        ...current,
        flightFuel: current.maxFlightFuel,
        lanternBattery: current.maxLanternBattery,
        scannerEnergy: current.maxScannerEnergy,
        welderEnergy: current.maxWelderEnergy,
      },
    },
  };
  saveProgressState(next);
  return next;
}

export function updatePowerEnergy(
  prev: PixelverseProgressState,
  key: 'flightFuel' | 'lanternBattery' | 'scannerEnergy' | 'welderEnergy',
  amount: number
): PixelverseProgressState {
  const current = prev.rpg.powersState ?? {
    flightFuel: 100,
    maxFlightFuel: 100,
    lanternBattery: 100,
    maxLanternBattery: 100,
    scannerEnergy: 100,
    maxScannerEnergy: 100,
    welderEnergy: 100,
    maxWelderEnergy: 100,
    upgradesPurchased: [],
  };

  const maxKey = key === 'flightFuel' ? 'maxFlightFuel' : key === 'lanternBattery' ? 'maxLanternBattery' : key === 'scannerEnergy' ? 'maxScannerEnergy' : 'maxWelderEnergy';
  const newval = Math.max(0, Math.min(current[maxKey], current[key] + amount));

  if (Math.abs(current[key] - newval) < 0.01) return prev;

  const next: PixelverseProgressState = {
    ...prev,
    rpg: {
      ...prev.rpg,
      powersState: {
        ...current,
        [key]: newval,
      },
    },
  };
  saveProgressState(next);
  return next;
}

const POWER_UPGRADE_COSTS: Record<string, number> = {
  'upg-flight-tank-1': 2,
  'upg-flight-efficiency-1': 3,
  'upg-lantern-battery-1': 1,
  'upg-lantern-radius-1': 2,
  'upg-scanner-range-1': 2,
  'upg-scanner-recharge-1': 2,
  'upg-welder-efficiency-1': 2,
};

export function getAvailableDiamonds(state: PixelverseProgressState): number {
  return Math.max(0, state.diamondsSaved - (state.diamondsSpent ?? 0));
}

export function purchasePowerUpgrade(
  prev: PixelverseProgressState,
  upgradeId: string,
  costDiamonds: number
): PixelverseProgressState {
  const current = prev.rpg.powersState ?? {
    flightFuel: 100,
    maxFlightFuel: 100,
    lanternBattery: 100,
    maxLanternBattery: 100,
    scannerEnergy: 100,
    maxScannerEnergy: 100,
    welderEnergy: 100,
    maxWelderEnergy: 100,
    upgradesPurchased: [],
  };

  if (current.upgradesPurchased.includes(upgradeId)) return prev;

  const cost = POWER_UPGRADE_COSTS[upgradeId];
  if (cost === undefined) return prev;
  if (getAvailableDiamonds(prev) < cost) return prev;

  let nextMaxFlight = current.maxFlightFuel;
  let nextMaxLantern = current.maxLanternBattery;
  if (upgradeId === 'upg-flight-tank-1') nextMaxFlight = 150;
  if (upgradeId === 'upg-lantern-battery-1') nextMaxLantern = 150;

  const next: PixelverseProgressState = {
    ...prev,
    diamondsSpent: (prev.diamondsSpent ?? 0) + cost,
    rpg: {
      ...prev.rpg,
      powersState: {
        ...current,
        maxFlightFuel: nextMaxFlight,
        maxLanternBattery: nextMaxLantern,
        flightFuel: upgradeId === 'upg-flight-tank-1' ? nextMaxFlight : current.flightFuel,
        lanternBattery: upgradeId === 'upg-lantern-battery-1' ? nextMaxLantern : current.lanternBattery,
        upgradesPurchased: [...current.upgradesPurchased, upgradeId],
      },
    },
  };
  saveProgressState(next);
  return next;
}

