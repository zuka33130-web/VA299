/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ventanas RPG integradas (Inventario Funcional, Habilidades y Diario de Misiones)
 * con estética retro pixel-art nítida, tipografía monoespaciada legible y acciones reales.
 */

import React, { useState } from 'react';
import {
  Backpack,
  CheckCircle2,
  Circle,
  Compass,
  Flame,
  Radio,
  ScrollText,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { PixelAbilityId, PixelverseProgressState } from '../memories/progressionState';
import {
  INVESTIGATION_CASES,
  RPG_ITEMS,
  RPG_QUESTS,
  RpgItemSpec,
} from './rpgContent';

const EXPLORATION_ABILITY_BADGES: {
  id: PixelAbilityId;
  title: string;
  hotkey: string;
  desc: string;
}[] = [
  {
    id: 'phase-sprint',
    title: 'Impulso Terrestre',
    hotkey: 'SHIFT',
    desc: 'Carrera rápida en 4 direcciones.',
  },
  {
    id: 'phosphor-lantern',
    title: 'Lámpara de Fósforo',
    hotkey: 'L',
    desc: 'Ilumina cuevas oscuras, armoniza centinelas y revela cofres.',
  },
  {
    id: 'secret-scanner',
    title: 'Escáner de Secretos',
    hotkey: 'R',
    desc: 'Pulso de sonar que detecta paredes falsas, reliquias y frecuencias.',
  },
  {
    id: 'circuit-welder',
    title: 'Soldador Lógico',
    hotkey: 'E',
    desc: 'Repara relés antiguos y terminales averiados.',
  },
  {
    id: 'pong-hoverboard',
    title: 'Tabla de Pong (1972)',
    hotkey: 'E',
    desc: 'Planeo sobre abismos entre el Sur y la Garganta.',
  },
  {
    id: 'star-shuttle',
    title: 'Nave Estelar (1978)',
    hotkey: 'AUTO',
    desc: 'Transporte orbital y acceso marítimo a los años 80.',
  },
];

export interface RpgInventoryAreaInfo {
  eraBadge: string;
  zoneName: string;
  zoneSubtitle: string;
  objectiveText: string;
}

export interface RpgInventoryStatsSummary {
  diamondsCollected: number;
  diamondsTotal: number;
  arcadesRestored: number;
  arcadesTotal: number;
  chestsOpened: number;
  chestsTotal: number;
  questsCompleted: number;
  questsTotal: number;
  secretsFound: number;
}

export interface RpgInventoryQuickControls {
  canSaveHere: boolean;
  onQuickSave: () => void;
  onOpenQuests: () => void;
  onOpenCodex: () => void;
  canToggleMinimap: boolean;
  minimapOpen: boolean;
  onToggleMinimap: () => void;
  isGbGreenMode?: boolean;
  onToggleGbGreenMode?: () => void;
  isAudioMuted?: boolean;
  onToggleAudio?: () => void;
  onOpenLevelSelector?: () => void;
}

export function RpgInventoryModal({
  progressState,
  allUnlocked,
  areaInfo,
  statsSummary,
  quickControls,
  closing = false,
  onClose,
  onUseScanner,
  onToggleLantern,
  onUseWelder,
  onEquipCosmetic,
}: {
  progressState: PixelverseProgressState;
  allUnlocked: boolean;
  areaInfo?: RpgInventoryAreaInfo;
  statsSummary?: RpgInventoryStatsSummary;
  quickControls?: RpgInventoryQuickControls;
  closing?: boolean;
  onClose: () => void;
  onUseScanner: () => void;
  onToggleLantern: () => void;
  onUseWelder: () => void;
  onEquipCosmetic: (itemId: string | null) => void;
}) {
  const ownedIds = allUnlocked
    ? Object.keys(RPG_ITEMS)
    : progressState.rpg.inventoryItems;

  const ownedItems: RpgItemSpec[] = ownedIds
    .map((id) => RPG_ITEMS[id])
    .filter((it): it is RpgItemSpec => Boolean(it));

  const [selectedId, setSelectedId] = useState<string>(
    ownedItems[0]?.id ?? 'item-bitacora-cero'
  );
  const [inspectNotice, setInspectNotice] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('TODOS');
  const categories = ['TODOS', ...Array.from(new Set(ownedItems.map((item) => item.category)))];
  const visibleItems = activeCategory === 'TODOS' ? ownedItems : ownedItems.filter((item) => item.category === activeCategory);

  const selectedItem = visibleItems.find((item) => item.id === selectedId) || visibleItems[0];
  const equippedCosmetic = progressState.rpg.equippedCosmetic;
  const lanternOn = progressState.rpg.lanternActive;

  const renderItemSprite = (item: RpgItemSpec) => {
    const frame = item.accentHex;
    const id = item.id.toLowerCase();
    const lamp = id.includes('lampara');
    const scanner = id.includes('escaner') || id.includes('scanner') || id.includes('sonar');
    const sword = id.includes('espada') || id.includes('arma');
    const fuel = id.includes('fosforo');
    const board = id.includes('pong') || id.includes('tabla');
    const journal = id.includes('bitacora') || id.includes('cronica');
    const welder = id.includes('soldador');
    const map = id.includes('mapa');
    const visor = id.includes('visor') || id.includes('lente');
    const coil = id.includes('bobina') || id.includes('condensador') || id.includes('modulo') || id.includes('nucleo') || id.includes('cristal') || id.includes('prisma');
    const tape = id.includes('cinta') || id.includes('memoria');
    const cape = id.includes('manto');
    const badge = id.includes('insignia');
    const wearable = item.category === 'cosmetico';
    const isCartridge = item.category === 'cartucho' || id.includes('cartucho');
    const tool = (item.usableAction === 'welder' || item.category === 'herramienta') && !scanner && !sword && !lamp && !fuel && !board && !wearable && !welder && !visor && !coil && !cape && !isCartridge;
    const keyItem = item.category === 'llave';
    const memory = (item.category === 'cinta-memoria' || item.category === 'reliquia') && !tape && !visor && !journal && !isCartridge;
    const glow = item.usableAction === 'lantern' || item.category === 'cosmetico' || isCartridge;
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" shapeRendering="crispEdges" className="h-8 w-8 shrink-0 pixel-item-sprite">
        <path d="M4 2h16v2h2v16h-2v2H4v-2H2V4h2z" fill="#25180f" />
        <path d="M5 4h14v2h2v12h-2v2H5v-2H3V6h2z" fill="#5a3c27" />
        <path d="M6 6h12v1H6z" fill={frame} opacity=".8" />
        {isCartridge && <>
          <path d="M5 5h14v13H5z" fill="#0f172a" />
          <path d="M7 7h10v7H7z" fill="#1e293b" />
          <path d="M8 8h8v5H8z" fill="#facc15" />
          <path d="M6 18h12v2H6z" fill="#020617" />
          <path d="M7 18h2v2H7zM11 18h2v2h-2zM15 18h2v2h-2z" fill="#eab308" />
        </>}
        {tool && <>
          <path d="M6 8h5v2h2v2h2v2h2v2h-3v-2h-2v-2h-2v-2H6z" fill="#d8be88" />
          <path d="M7 8h3v2H7zM14 14h3v3h-3z" fill={frame} />
        </>}
        {keyItem && <>
          <path d="M7 7h7v2h2v2h-2v2h-2v-2H9v2h2v2H9v2H6v-3h2v-2H6V9h1z" fill="#f6d36b" />
          <path d="M9 9h3v2H9z" fill={frame} />
        </>}
        {memory && <>
          <path d="M7 7h10v2h2v8h-2v2H7v-2H5V9h2z" fill="#cbd5e1" />
          <path d="M8 9h8v1H8zM8 12h6v1H8zM8 15h8v2H8z" fill={frame} />
          <path d="M16 11h2v2h-2z" fill="#fef08a" />
        </>}
        {!tool && !keyItem && !memory && !lamp && !scanner && !sword && !fuel && !board && !wearable && !journal && !welder && !map && !visor && !coil && !tape && !cape && !badge && <>
          <path d="M9 6h6v2h2v9h-2v2H9v-2H7V8h2z" fill="#d8be88" />
          <path d="M10 8h4v2h2v5h-2v2h-4v-2H8v-5h2z" fill={frame} />
          {glow && <path d="M11 10h2v4h-2zM9 11h2v2H9zM14 11h2v2h-2z" fill="#fff4b8" />}
          {!glow && <path d="M10 11h4v3h-4z" fill="#07111e" />}
        </>}
        {lamp && <><path d="M9 5h6v2l2 2v10l-2 2H9l-2-2V9l2-2z" fill="#8a5329"/><path d="M9 12h6v6H9z" fill="#e4a52d"/><path d="M11 13h2v4h-2z" fill="#fff3b0"/><path d="M8 19h8v2H8z" fill="#d7c39b"/></>}
        {scanner && <><path d="M6 7h12v11H6z" fill="#394d48"/><path d="M8 9h8v5H8z" fill="#a6d6a0"/><path d="M9 11h2v1H9zM12 10h1v3h-1zM14 11h2v1h-2z" fill="#315f42"/><path d="M9 19h6v2H9z" fill="#d8be88"/><path d="M18 8h2v2h-2z" fill={frame}/></>}
        {sword && <><path d="M15 4h5v2l-9 10-2-2z" fill="#e5f2ee"/><path d="M8 13l4 4-2 2-4-4z" fill="#a7d2d5"/><path d="M5 15l5 5-2 2-5-5z" fill="#9b5d35"/><path d="M12 12l2 2-2 2-2-2z" fill="#f5cf6a"/></>}
        {fuel && <><path d="M9 5h6v2l2 2v10l-2 2H9l-2-2V9l2-2z" fill="#c3d2b5"/><path d="M9 12h6v6H9z" fill="#e4a52d"/><path d="M11 8h2v2h-2z" fill="#f6e3a2"/><path d="M10 14h2v2h-2zM14 13h1v3h-1z" fill="#fff0a3"/></>}
        {board && <><path d="M10 4h4v2h2v12h-2v2h-4v-2H8V6h2z" fill="#e0a84c"/><path d="M10 7h4v9h-4z" fill="#f0d99e"/><path d="M9 5h2v2H9zM13 16h2v2h-2z" fill="#6a3f2b"/><path d="M9 10h6v2H9z" fill={frame}/></>}
        {wearable && <><path d="M8 8l4-2 4 2 3 3-2 3-2-2v6H9v-6l-2 2-2-3z" fill="#d8be88"/><path d="M10 8h4v8h-4z" fill={frame}/><path d="M11 9h2v2h-2z" fill="#f8e7b0"/></>}
        {journal && <><path d="M6 5h13v15H6z" fill="#8e5532" stroke="#d6ac68" strokeWidth="1"/><path d="M8 7h9v11H8z" fill="#e6d2a3"/><path d="M10 9h5v1h-5zM10 12h6v1h-6zM10 15h4v1h-4z" fill={frame}/><path d="M5 6h2v13H5z" fill="#c68c4d"/></>}
        {welder && <><path d="M5 7h5v3H8v3h4v-3h4v3h3v3h-6v3h-5v-3h3v-3H7v-3H5z" fill="#b9c5bc"/><path d="M14 6h5v2h-3v3h-3z" fill="#f2c86d"/><path d="M17 4h2v2h-2z" fill="#ffefae"/></>}
        {map && <><path d="M5 6l5-2 5 2 4-2v14l-4 2-5-2-5 2z" fill="#d7c18b" stroke="#5d462b" strokeWidth="1"/><path d="M10 5v13M15 7v13" stroke="#7a5736" strokeWidth="1"/><path d="M11 11h2v2h-2zM12 9h1v2h-1z" fill="#bd5941"/></>}
        {visor && <><path d="M5 8h4V6h6v2h4v8h-3l-2 3h-4l-2-3H5z" fill="#b8a887"/><path d="M7 10h4v4H7zM13 10h4v4h-4z" fill="#7fe1d2" stroke="#483527" strokeWidth="1"/><path d="M11 11h2v2h-2z" fill="#e0c071"/></>}
        {coil && <><path d="M8 4h8v3h3v10h-3v3H8v-3H5V7h3z" fill="#51436e" stroke="#c8a7ed" strokeWidth="1"/><path d="M10 7h4v2h2v6h-2v2h-4v-2H8V9h2z" fill={frame}/><path d="M11 9h2v2h-2zM13 12h2v2h-2zM9 13h2v2H9z" fill="#fff0b2"/></>}
        {tape && <><path d="M5 7h14v11H5z" fill="#d0c7a9" stroke="#524331" strokeWidth="1"/><path d="M7 9h10v7H7z" fill="#40362b"/><circle cx="10" cy="12.5" r="2" fill="#d4b66b"/><circle cx="14" cy="12.5" r="2" fill="#d4b66b"/><path d="M11 12h2v1h-2z" fill={frame}/><path d="M7 17h10v1H7z" fill={frame}/></>}
        {cape && <><path d="M9 5h6l2 3 3 2-3 10H7L4 10l3-2z" fill="#d6bb82" stroke="#5a3b2b" strokeWidth="1"/><path d="M10 7h4l2 3-2 8h-4l-2-8z" fill={frame}/><path d="M11 8h2v2h-2z" fill="#f4deaa"/></>}
        {badge && <><path d="M8 5h8v3l3 3-7 10-7-10 3-3z" fill="#e3bd6d" stroke="#714d2e" strokeWidth="1"/><path d="M10 8h4v2h2v2h-2v2h-4v-2H8v-2h2z" fill={frame}/><path d="M11 10h2v2h-2z" fill="#fff0b1"/></>}
        <path d="M4 20h3v1H4zM18 4h2v1h-2z" fill="#fff4b8" />
      </svg>
    );
  };

  const handleActionClick = (item: RpgItemSpec) => {
    if (item.usableAction === 'scanner') {
      retroAudio.uiClick();
      onClose();
      onUseScanner();
      return;
    }
    if (item.usableAction === 'lantern') {
      retroAudio.uiClick();
      onToggleLantern();
      setInspectNotice(
        !lanternOn
          ? 'Lámpara de Fósforo ENCENDIDA · Tu halo iluminará grutas oscuras y centinelas.'
          : 'Lámpara de Fósforo APAGADA.'
      );
      return;
    }
    if (item.usableAction === 'welder') {
      retroAudio.uiClick();
      onClose();
      onUseWelder();
      return;
    }
    if (item.usableAction === 'equip-cosmetic') {
      retroAudio.shardCollect(2);
      const next = equippedCosmetic === item.id ? null : item.id;
      onEquipCosmetic(next);
      setInspectNotice(
        next
          ? `¡${item.name} equipado sobre Pixel!`
          : `${item.name} guardado en la mochila.`
      );
      return;
    }
    retroAudio.echoDiscover();
    setInspectNotice(`Pista: ${item.usageHint}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Inventario y Estadísticas de Pixel"
      data-state={closing ? 'closing' : 'open'}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          retroAudio.uiClick();
          onClose();
        }
      }}
      className={`fixed inset-0 z-50 bg-[#020611]/55 flex items-center justify-center p-2 sm:p-4 overflow-y-auto inventory-backdrop ${closing ? 'inventory-backdrop-out' : ''}`}
    >
      <div className={`inventory-panel backpack-frame max-w-5xl w-full max-h-[94vh] overflow-y-auto p-3 sm:p-5 space-y-3 my-auto ${closing ? 'inventory-panel-out' : ''}`}>
        <svg aria-hidden="true" viewBox="0 0 96 72" className="backpack-illustration hidden sm:block w-24 h-[4.5rem] float-right ml-3" shapeRendering="crispEdges">
          <path d="M28 12h40v8h8v42H20V20h8z" fill="#4e2c1f" stroke="#20130f" strokeWidth="4"/>
          <path d="M32 16h32v8h6v34H26V24h6z" fill="#9a6037" stroke="#d5a05a" strokeWidth="3"/>
          <path d="M34 22h28v5H34zM30 32h36v20H30z" fill="#70432c" stroke="#c58c4f" strokeWidth="3"/>
          <path d="M36 35h24v13H36z" fill="#b7773f" stroke="#e0b46a" strokeWidth="2"/>
          <path d="M44 34h8v7h-8z" fill="#e3c783" stroke="#59402a" strokeWidth="2"/>
          <path d="M20 29h7v22h-7zM69 29h7v22h-7z" fill="#d4ad72" stroke="#48301f" strokeWidth="2"/>
          <path d="M40 55h16v4H40zM43 8h10v7H43z" fill="#473127" stroke="#d4ad72" strokeWidth="2"/>
          <path d="M32 28h7v3h-7zM57 28h7v3h-7zM31 51h7v3h-7zM58 51h7v3h-7z" fill="#e2c78e"/>
        </svg>
        <div className="flex items-center justify-between gap-2 border-b-2 border-dashed border-white/25 pb-2">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-[#f2c94c] uppercase">
              <Backpack className="w-4 h-4 shrink-0" />
              <span>MOCHILA DEL ARQUITECTO · INVENTARIO [ENTER]</span>
            </div>
            <h2 className="font-mono text-base sm:text-lg font-bold text-white mt-0.5">
              Equipo reunido · {ownedItems.length} objetos
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onClose();
            }}
            aria-label="Cerrar Inventario"
            className="gbc-menu-btn text-white hover:text-amber-300 cursor-pointer font-mono font-bold px-2 py-1"
          >
            [X]
          </button>
        </div>

        {/* Resumen de Ubicación Actual y Estadísticas de Partida */}
        {(areaInfo || statsSummary) && (
          <div className="backpack-ledger p-2 space-y-2 font-mono">
            {areaInfo && (
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border-b border-white/15 pb-2.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 bg-cyan-950/80 border border-[#00f3ff]/50 text-[#7dd3fc]">
                      {areaInfo.eraBadge}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-white truncate">
                      {areaInfo.zoneName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                    {areaInfo.zoneSubtitle}
                  </p>
                </div>
                <div className="flex items-start gap-1.5 text-[10px] text-amber-200 sm:max-w-xs shrink-0">
                  <Compass className="w-3.5 h-3.5 text-[#fde047] shrink-0 mt-0.5" />
                  <span>{areaInfo.objectiveText}</span>
                </div>
              </div>
            )}

            {statsSummary && (
              <div className="grid grid-cols-5 gap-1 text-center">
                <div className="border border-white/15 bg-black/45 px-1 py-1">
                  <span className="block text-[9px] text-slate-400 uppercase">Diamantes</span>
                  <span className="text-xs font-bold text-[#7dd3fc] font-mono-tabular">
                    {statsSummary.diamondsCollected}/{statsSummary.diamondsTotal}
                  </span>
                </div>
                <div className="border border-white/15 bg-black/45 px-1 py-1">
                  <span className="block text-[9px] text-slate-400 uppercase">Arcades</span>
                  <span className="text-xs font-bold text-[#fde047] font-mono-tabular">
                    {statsSummary.arcadesRestored}/{statsSummary.arcadesTotal}
                  </span>
                </div>
                <div className="border border-white/15 bg-black/45 px-1 py-1">
                  <span className="block text-[9px] text-slate-400 uppercase">Cofres</span>
                  <span className="text-xs font-bold text-amber-300 font-mono-tabular">
                    {statsSummary.chestsOpened}/{statsSummary.chestsTotal}
                  </span>
                </div>
                <div className="border border-white/15 bg-black/45 px-1 py-1">
                  <span className="block text-[9px] text-slate-400 uppercase">Misiones</span>
                  <span className="text-xs font-bold text-[#86efac] font-mono-tabular">
                    {statsSummary.questsCompleted}/{statsSummary.questsTotal}
                  </span>
                </div>
                <div className="border border-white/15 bg-black/45 px-1 py-1">
                  <span className="block text-[9px] text-slate-400 uppercase">Secretos</span>
                  <span className="text-xs font-bold text-purple-300 font-mono-tabular">
                    {statsSummary.secretsFound}
                  </span>
                </div>
              </div>
            )}

            {quickControls && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.uiClick();
                    quickControls.onOpenQuests();
                  }}
                  className="gbc-menu-btn px-2.5 py-1 text-[10px] font-bold text-[#86efac] hover:text-white cursor-pointer"
                >
                  Diario / Misiones [Q]
                </button>
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.uiClick();
                    quickControls.onOpenCodex();
                  }}
                  className="gbc-menu-btn px-2.5 py-1 text-[10px] font-bold text-[#7dd3fc] hover:text-white cursor-pointer"
                >
                  Códice [C]
                </button>
                {quickControls.canSaveHere && (
                  <button
                    type="button"
                    onClick={quickControls.onQuickSave}
                    className="gbc-menu-btn px-2.5 py-1 text-[10px] font-bold text-white hover:text-[#fde047] cursor-pointer"
                  >
                    Guardar Partida
                  </button>
                )}
                {quickControls.canToggleMinimap && (
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.uiClick();
                      quickControls.onToggleMinimap();
                    }}
                    className="gbc-menu-btn px-2.5 py-1 text-[10px] font-bold text-[#fde047] hover:text-white cursor-pointer"
                  >
                    {quickControls.minimapOpen ? 'Ocultar Mapa [M / Tab]' : 'Ver Mapa [M / Tab]'}
                  </button>
                )}
                {quickControls.onToggleGbGreenMode && (
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.uiClick();
                      quickControls.onToggleGbGreenMode?.();
                    }}
                    className="gbc-menu-btn px-2.5 py-1 text-[10px] font-bold text-emerald-300 hover:text-white cursor-pointer"
                  >
                    {quickControls.isGbGreenMode ? 'GB Verde: ON' : 'GB Verde: OFF'}
                  </button>
                )}
                {quickControls.onToggleAudio && (
                  <button
                    type="button"
                    onClick={quickControls.onToggleAudio}
                    className="gbc-menu-btn px-2.5 py-1 text-[10px] font-bold text-slate-200 hover:text-white cursor-pointer"
                  >
                    {quickControls.isAudioMuted ? 'Audio: OFF' : 'Audio: ON'}
                  </button>
                )}
                {allUnlocked && quickControls.onOpenLevelSelector && (
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.uiClick();
                      onClose();
                      quickControls.onOpenLevelSelector?.();
                    }}
                    className="gbc-menu-btn px-2.5 py-1 text-[10px] font-bold text-[#00f3ff] hover:text-white cursor-pointer"
                  >
                    Elegir Nivel
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Categorías de la mochila">
          {categories.map((category) => (
            <button key={category} type="button" role="tab" aria-selected={activeCategory === category} onClick={() => setActiveCategory(category)} className={`backpack-tab px-2.5 py-1 text-[9px] font-mono uppercase ${activeCategory === category ? 'backpack-tab-active' : ''}`}>
              {category === 'TODOS' ? `TODO · ${ownedItems.length}` : category === 'cartucho' ? 'CARTUCHOS' : category === 'objeto' ? 'OBJETOS' : category.replaceAll('-', ' ')}
            </button>
          ))}
          {ownedIds.includes('item-polvo-fosforo') && <span className="ml-auto backpack-fuel px-2.5 py-1 text-[9px] font-mono">COMBUSTIBLE DE VUELO</span>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Lista de objetos obtenidos */}
          <div className="md:col-span-7 backpack-pocket">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-[42vh] overflow-y-auto p-2 inventory-slots">
            {visibleItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const isEquipped = equippedCosmetic === item.id;
              const isLanternActive =
                item.id === 'item-lampara-fosforo' && lanternOn;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    retroAudio.uiClick();
                    setSelectedId(item.id);
                    setInspectNotice(null);
                  }}
                  title={`${item.name} · ${item.description}`}
                  className={`inventory-slot w-full min-h-[4.4rem] text-left px-1.5 py-1 border-2 font-mono text-[9px] flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'inventory-slot-active border-[#00f3ff] bg-cyan-950/80 text-white'
                      : 'border-white/20 bg-black/50 text-slate-200 hover:border-white/50'
                  }`}
                >
                  <span className="relative">
                    {renderItemSprite(item)}
                    {isEquipped && <span className="absolute -right-1 -top-1 h-2 w-2 border border-[#07111e] bg-[#fde047]" />}
                    {isLanternActive && <span className="absolute -right-1 -top-1 h-2 w-2 border border-[#07111e] bg-[#39ff9d]" />}
                  </span>
                  <span className="w-full truncate text-center font-bold leading-tight">{item.name}</span>
                  <span className="text-[8px] text-amber-300 leading-none">
                    {isEquipped ? 'EQUIPADO' : isLanternActive ? 'ACTIVA' : item.shortCode}
                  </span>
                </button>
              );
            })}
            </div>
          </div>

          {/* Inspector y botón de uso real */}
          <div className="md:col-span-5 backpack-inspector p-3 flex flex-col justify-between space-y-2 inventory-inspector">
            {selectedItem && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[10px] font-mono tracking-wider uppercase font-bold"
                      style={{ color: selectedItem.accentHex }}
                    >
                      {selectedItem.categoryLabel}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      CÓD: {selectedItem.shortCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderItemSprite(selectedItem)}
                    <h3 className="font-mono text-sm font-bold text-white">
                      {selectedItem.name}
                    </h3>
                  </div>
                  <p className="text-[11px] font-mono text-slate-200 leading-snug">
                    {selectedItem.description}
                  </p>
                  <p className="text-[10px] font-mono text-amber-100/90">Cantidad: 1 · Identificador: {selectedItem.shortCode}</p>
                  <p className="text-[10px] font-mono text-amber-200/90 pt-1 border-t border-white/15 leading-snug">
                    Uso: {selectedItem.usageHint}
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  {inspectNotice && (
                    <p className="text-[11px] font-mono text-[#39ff14] bg-emerald-950/50 border border-emerald-400/40 px-2.5 py-1.5">
                      {inspectNotice}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => handleActionClick(selectedItem)}
                    className="w-full py-2 px-4 border-2 border-white bg-[#0284c7] hover:bg-[#0ea5e9] text-white font-mono font-bold text-xs uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_#000000] flex items-center justify-center gap-2"
                  >
                    {selectedItem.usableAction === 'scanner' && (
                      <>
                        <Radio className="w-3.5 h-3.5" />
                        <span>EMITIR PULSO ESCÁNER [R]</span>
                      </>
                    )}
                    {selectedItem.usableAction === 'lantern' && (
                      <>
                        <Flame className="w-3.5 h-3.5" />
                        <span>
                          {lanternOn
                            ? 'APAGAR LÁMPARA DE FÓSFORO [L]'
                            : 'ENCENDER LÁMPARA DE FÓSFORO [L]'}
                        </span>
                      </>
                    )}
                    {selectedItem.usableAction === 'welder' && (
                      <>
                        <Wrench className="w-3.5 h-3.5" />
                        <span>USAR SOLDADOR EN EL MUNDO</span>
                      </>
                    )}
                    {selectedItem.usableAction === 'equip-cosmetic' && (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {equippedCosmetic === selectedItem.id
                            ? 'DESEQUIPAR DE PIXEL'
                            : 'EQUIPAR EN PIXEL'}
                        </span>
                      </>
                    )}
                    {selectedItem.usableAction === 'inspect' && (
                      <>
                        <Compass className="w-3.5 h-3.5" />
                        <span>CONSULTAR PISTA DE USO</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Habilidades de exploración desbloqueadas */}
        <details className="border-t border-dashed border-white/20 pt-1.5">
          <summary className="cursor-pointer text-[10px] font-mono tracking-wider text-[#00f3ff] uppercase font-bold">
            Habilidades de Exploración Activas
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {EXPLORATION_ABILITY_BADGES.map((ab) => {
              const unlocked =
                allUnlocked ||
                progressState.island70s.abilitiesUnlocked.includes(ab.id);
              return (
                <div
                  key={ab.id}
                  className={`border px-2.5 py-2 font-mono text-[11px] ${
                    unlocked
                      ? 'border-[#00f3ff]/60 bg-cyan-950/35 text-white'
                      : 'border-white/10 bg-black/35 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold truncate">{ab.title}</span>
                    <span className="text-[10px] text-amber-300">
                      {unlocked ? `[${ab.hotkey}]` : 'BLOQ'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">
                    {unlocked ? ab.desc : 'Explora misiones y santuarios para obtenerla.'}
                  </p>
                </div>
              );
            })}
          </div>
        </details>

        {/* Logros Especiales Permanentes registrados en la partida */}
        <details className="border-t border-dashed border-white/20 pt-1.5">
          <summary className="cursor-pointer text-[10px] font-mono tracking-wider text-[#fde047] uppercase font-bold">
            Logros Permanentes del Cartucho
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
            {[
              {
                id: 'pong-pionero-1972',
                title: 'Pionero 1972 (Pong)',
                desc: '1.000 PTS alcanzados en Las Praderas del Pixel.',
                unlocked:
                  allUnlocked ||
                  progressState.rpg.achievementsUnlocked.includes('pong-pionero-1972') ||
                  Boolean(progressState.games['pong']?.memoryUnlocked),
              },
              {
                id: 'breakout-secreto-1976',
                title: 'Muro Secreto 1976',
                desc: '400 PTS alcanzados en el gabinete oculto de Breakout.',
                unlocked:
                  allUnlocked ||
                  progressState.rpg.achievementsUnlocked.includes('breakout-secreto-1976') ||
                  Boolean(progressState.games['breakout']?.memoryUnlocked),
              },
              {
                id: 'invaders-1000-pts',
                title: 'Defensor 1.000 PTS',
                desc: '1.000 PTS registrados en Space Invaders (Zona 4).',
                unlocked:
                  allUnlocked ||
                  progressState.rpg.achievementsUnlocked.includes('invaders-1000-pts') ||
                  Boolean(progressState.games['space-invaders']?.memoryUnlocked),
              },
              {
                id: 'investigador-cronista-70s',
                title: 'Cronista Forense 70s',
                desc: 'Los 3 casos de investigación histórica deducidos.',
                unlocked:
                  allUnlocked ||
                  progressState.rpg.achievementsUnlocked.includes('investigador-cronista-70s') ||
                  progressState.rpg.solvedCaseIds.length >= 3,
              },
              {
                id: 'vigas-1981',
                title: 'Vigas Rojas 1981',
                desc: 'Gabinete vertical superado en Isla Neón 1980s.',
                unlocked:
                  allUnlocked ||
                  progressState.rpg.achievementsUnlocked.includes('vigas-1981') ||
                  Boolean(progressState.games['donkey-kong']?.memoryUnlocked),
              },
            ].map((ach) => (
              <div
                key={ach.id}
                className={`border px-2.5 py-2 ${
                  ach.unlocked
                    ? 'border-[#86efac] bg-[#14532d]/55 text-white'
                    : 'border-white/10 bg-black/35 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold truncate">{ach.title}</span>
                  <span className="text-[10px] text-[#fde047]">
                    {ach.unlocked ? '★ LOGRO' : '---'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-200 mt-0.5 leading-snug">
                  {ach.unlocked ? ach.desc : 'Supera el hito para registrarlo.'}
                </p>
              </div>
            ))}
          </div>
        </details>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/15 font-mono text-xs">
          <span className="text-slate-300">
            [ENTER] cerrar · [L] Lámpara · [R] Escáner
          </span>
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onClose();
            }}
            className="bg-[#dc2626] hover:bg-[#ef4444] text-white border-2 border-white px-4 py-1.5 font-bold uppercase cursor-pointer shadow-[2px_2px_0px_#000000]"
          >
            CERRAR [ENTER / ESC]
          </button>
        </div>
      </div>
    </div>
  );
}

export function RpgQuestsModal({
  progressState,
  allUnlocked,
  onSolveCase,
  onClose,
}: {
  progressState: PixelverseProgressState;
  allUnlocked: boolean;
  onSolveCase?: (caseId: string, rewardItemIds: string[]) => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'quests' | 'cases'>('quests');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [caseFeedback, setCaseFeedback] = useState<
    Record<string, { ok: boolean; msg: string }>
  >({});

  const completedCount = RPG_QUESTS.filter(
    (q) =>
      allUnlocked ||
      progressState.rpg.questStates[q.id] === 'completed' ||
      q.steps.every((s) => s.isDone(progressState, allUnlocked))
  ).length;

  const solvedCasesCount = INVESTIGATION_CASES.filter(
    (c) => allUnlocked || progressState.rpg.solvedCaseIds.includes(c.id)
  ).length;

  const handleVerifyCase = (
    caseId: string,
    options: { id: string; label: string; isCorrect: boolean }[],
    conclusionText: string,
    rewardItemIds: string[]
  ) => {
    const pickedId = selectedOptions[caseId];
    if (!pickedId) {
      retroAudio.npcBlip(0.74);
      setCaseFeedback((prev) => ({
        ...prev,
        [caseId]: {
          ok: false,
          msg: 'Selecciona una hipótesis antes de confirmar tu deducción.',
        },
      }));
      return;
    }
    const chosen = options.find((o) => o.id === pickedId);
    if (chosen?.isCorrect) {
      retroAudio.caseDeductionSolved();
      onSolveCase?.(caseId, rewardItemIds);
      setCaseFeedback((prev) => ({
        ...prev,
        [caseId]: {
          ok: true,
          msg: conclusionText,
        },
      }));
    } else {
      retroAudio.npcBlip(0.66);
      setCaseFeedback((prev) => ({
        ...prev,
        [caseId]: {
          ok: false,
          msg: 'Esa hipótesis no concuerda con las evidencias reunidas. Revisa las pistas registradas e inténtalo de nuevo.',
        },
      }));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Diario de Misiones e Investigación de Pixel"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="gbc-retro-box max-w-3xl w-full p-5 sm:p-6 space-y-4 my-auto">
        <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-white/25 pb-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-[#f2c94c] uppercase">
              <ScrollText className="w-4 h-4 shrink-0" />
              <span>DIARIO DEL ARQUITECTO · MISIONES Y CASOS ARQUEOLÓGICOS</span>
            </div>
            <h2 className="font-mono text-lg sm:text-xl font-bold text-white mt-0.5">
              {activeTab === 'quests'
                ? `Misiones del Archipiélago (${completedCount} / ${RPG_QUESTS.length} Completadas)`
                : `Casos de Investigación (${solvedCasesCount} / ${INVESTIGATION_CASES.length} Resueltos)`}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onClose();
            }}
            aria-label="Cerrar Diario"
            className="text-white hover:text-amber-300 cursor-pointer font-mono font-bold px-2 py-1"
          >
            [X]
          </button>
        </div>

        {/* Pestañas interactivas entre Misiones y Casos de Investigación */}
        <div className="flex flex-wrap items-center gap-2 pb-1">
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              setActiveTab('quests');
            }}
            className={`px-3.5 py-1.5 border font-mono text-xs font-bold cursor-pointer transition-colors ${
              activeTab === 'quests'
                ? 'border-[#00f3ff] bg-cyan-950/75 text-white'
                : 'border-white/20 bg-black/45 text-slate-300 hover:text-white'
            }`}
          >
            Misiones ({completedCount}/{RPG_QUESTS.length})
          </button>
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              setActiveTab('cases');
            }}
            className={`px-3.5 py-1.5 border font-mono text-xs font-bold cursor-pointer transition-colors ${
              activeTab === 'cases'
                ? 'border-[#fde047] bg-amber-950/60 text-white'
                : 'border-white/20 bg-black/45 text-slate-300 hover:text-white'
            }`}
          >
            Casos de Investigación ({solvedCasesCount}/{INVESTIGATION_CASES.length})
          </button>
        </div>

        {activeTab === 'quests' ? (
          <div className="max-h-[52vh] overflow-y-auto pr-1 space-y-3">
            {RPG_QUESTS.map((quest) => {
              const allStepsDone = quest.steps.every((s) =>
                s.isDone(progressState, allUnlocked)
              );
              const isCompleted =
                allUnlocked ||
                progressState.rpg.questStates[quest.id] === 'completed' ||
                allStepsDone;
              const isDiscovered =
                isCompleted ||
                Boolean(progressState.rpg.questStates[quest.id]) ||
                quest.steps.some((s) => s.isDone(progressState, allUnlocked));

              return (
                <article
                  key={quest.id}
                  className={`border-2 p-3.5 space-y-2 font-mono ${
                    isCompleted
                      ? 'border-emerald-400/70 bg-emerald-950/25'
                      : isDiscovered
                      ? 'border-[#00f3ff]/65 bg-[#070d1f]'
                      : 'border-white/20 bg-black/45'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <span
                        className="text-[10px] tracking-wider uppercase font-bold"
                        style={{ color: quest.accentHex }}
                      >
                        {quest.code} · {quest.decadeTag}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        {quest.title}
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-300">
                      {isCompleted ? 'Completada' : isDiscovered ? 'En curso' : 'Disponible'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">{quest.summary}</p>

                  <div className="space-y-1 pt-1">
                    {quest.steps.map((step, idx) => {
                      const done = step.isDone(progressState, allUnlocked);
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-2 text-[11px] text-slate-200"
                        >
                          {done ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#39ff14] shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          )}
                          <span className={done ? 'text-emerald-200 line-through' : ''}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-1.5 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-400">Encargo de: {quest.giverName}</span>
                    <span className="text-amber-300 font-bold">
                      Recompensa: {quest.rewardSummary}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="max-h-[52vh] overflow-y-auto pr-1 space-y-4">
            {INVESTIGATION_CASES.map((invCase) => {
              const isSolved =
                allUnlocked || progressState.rpg.solvedCaseIds.includes(invCase.id);
              const foundCluesCount = invCase.clues.filter(
                (cl) =>
                  allUnlocked || progressState.rpg.discoveredClueIds.includes(cl.id)
              ).length;
              const allCluesFound = foundCluesCount === invCase.clues.length;
              const fb = caseFeedback[invCase.id];

              return (
                <article
                  key={invCase.id}
                  className={`border-2 p-4 space-y-3 font-mono ${
                    isSolved
                      ? 'border-emerald-400/70 bg-emerald-950/20'
                      : allCluesFound
                      ? 'border-[#fde047]/80 bg-[#0b1024]'
                      : 'border-white/20 bg-black/45'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <span
                        className="text-[10px] tracking-wider uppercase font-bold"
                        style={{ color: invCase.accentHex }}
                      >
                        {invCase.code} · {invCase.eraTag}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                        {invCase.title}
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-300">
                      {isSolved
                        ? 'Caso resuelto'
                        : `Pistas ${foundCluesCount}/${invCase.clues.length}`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">{invCase.summary}</p>

                  {/* Pistas del caso (sin spoilers cuando aún no han sido halladas) */}
                  <div className="space-y-1.5 pt-1 border-t border-white/12">
                    {invCase.clues.map((clue) => {
                      const known =
                        allUnlocked ||
                        progressState.rpg.discoveredClueIds.includes(clue.id);
                      return (
                        <div
                          key={clue.id}
                          className="text-[11px] flex items-start gap-2 py-1"
                        >
                          {known ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#39ff14] shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-bold text-white">{clue.title}</span>
                            <span className="text-slate-400"> · </span>
                            {known ? (
                              <span className="text-cyan-100">{clue.findingText}</span>
                            ) : (
                              <span className="text-slate-400">
                                Pista pendiente — {clue.sourceHint}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Panel de deducción activa cuando todas las pistas están reunidas */}
                  {isSolved ? (
                    <div className="pt-2 border-t border-emerald-400/30 space-y-1">
                      <p className="text-xs text-emerald-200 leading-relaxed">
                        {invCase.conclusionText}
                      </p>
                      <p className="text-[11px] text-amber-300 font-bold">
                        Recompensa obtenida: {invCase.rewardSummary}
                      </p>
                    </div>
                  ) : allCluesFound ? (
                    <div className="pt-2.5 border-t border-white/20 space-y-2.5">
                      <p className="text-xs font-bold text-[#fde047]">
                        Deducción final: {invCase.deductionQuestion}
                      </p>
                      <div className="space-y-1.5">
                        {invCase.options.map((opt) => {
                          const picked = selectedOptions[invCase.id] === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                retroAudio.uiClick();
                                setSelectedOptions((prev) => ({
                                  ...prev,
                                  [invCase.id]: opt.id,
                                }));
                              }}
                              className={`w-full text-left px-3 py-2 border text-xs cursor-pointer transition-colors ${
                                picked
                                  ? 'border-[#00f3ff] bg-cyan-950/70 text-white'
                                  : 'border-white/20 bg-black/50 text-slate-200 hover:border-white/45'
                              }`}
                            >
                              {picked ? '◉ ' : '○ '}
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>

                      {fb && (
                        <p
                          className={`text-[11px] px-2.5 py-1.5 border ${
                            fb.ok
                              ? 'border-emerald-400/50 bg-emerald-950/40 text-emerald-200'
                              : 'border-amber-400/50 bg-amber-950/40 text-amber-200'
                          }`}
                        >
                          {fb.msg}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] text-amber-300">
                          Recompensa: {invCase.rewardSummary}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleVerifyCase(
                              invCase.id,
                              invCase.options,
                              invCase.conclusionText,
                              invCase.rewardItemIds
                            )
                          }
                          className="px-4 py-1.5 border-2 border-white bg-[#0284c7] hover:bg-[#0ea5e9] text-white text-xs font-bold cursor-pointer"
                        >
                          Confirmar deducción
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 pt-1.5 border-t border-white/12">
                      Reúne las {invCase.clues.length} evidencias en el mundo, interiores y el Museo Viviente para formular tu deducción.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-white/15 font-mono text-xs">
          <span className="text-slate-300">
            Investiga murales, criaturas y pedestales del Museo para hallar pistas
          </span>
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onClose();
            }}
            className="bg-[#dc2626] hover:bg-[#ef4444] text-white border-2 border-white px-4 py-1.5 font-bold uppercase cursor-pointer shadow-[2px_2px_0px_#000000]"
          >
            CERRAR [Q]
          </button>
        </div>
      </div>
    </div>
  );
}

