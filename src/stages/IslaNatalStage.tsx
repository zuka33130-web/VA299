/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ISLA NATAL — «EL ARCADE QUE ESPERÓ SU MOMENTO»
 *
 * Primera zona explorable de PIXELVERSE: una isla pequeña e irregular rodeada de
 * mar, con su cabaña, su pradera, un alto rocoso, un mirador y un viejo gabinete
 * de Pong dormido en la arboleda. El encuentro con la máquina enciende la señal
 * que despierta a la Isla del Origen y entrega la paleta como medio de transporte.
 *
 * La progresión se persiste como marcadores narrativos dentro del esquema ya
 * existente (island70s.narrativeEvents), de modo que nada de lo descubierto aquí
 * se pierde al caer derrotado ni al recargar la partida.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AvatarAppearance } from '../avatar/avatarOptions';
import { retroAudio } from '../audio/retroAudio';
import { isActionPressed, loadKeybindings, type KeybindingsMap } from '../controls/keybindings';
import {
  ARCADE_DIALOG_AFTER_WIN,
  ARCADE_DIALOG_DUSTY,
  ARCADE_DIALOG_LEVER_READY,
  ARCADE_DIALOG_MISSING_LEVER,
  ARCADE_DIALOG_POWER_ON,
  ARCADE_DIALOG_SPENT,
  DEPARTURE_BLOCKED_DIALOG,
  ISLA_NATAL_ARCADE_ANCHOR,
  ISLA_NATAL_CABIN,
  ISLA_NATAL_CHEST_CODE,
  ISLA_NATAL_DEPARTURE,
  ISLA_NATAL_FLAGS,
  ISLA_NATAL_NORTH_PORT_SPAWN,
  ISLA_NATAL_PADDLE_ANCHOR,
  ISLA_NATAL_POIS,
  ISLA_NATAL_SPAWN,
  ISLA_NATAL_TRAVELER_SCENE_PLAYER,
  ISLA_NATAL_TRAVELER_SITE,
  ISLA_NATAL_WORLD_H,
  ISLA_NATAL_WORLD_W,
  ISLA_NATAL_ZONES,
  NATAL_CABIN_RADIO_SILENT_DIALOG,
  NATAL_CHEST_EMPTY_DIALOG,
  NATAL_CHEST_LOCKED_DIALOG,
  NATAL_CHEST_NEEDS_BACKPACK_DIALOG,
  NATAL_CHEST_REVEAL_DIALOG,
  NATAL_NO_BACKPACK_EXIT_DIALOG,
  NATAL_TRAVELER_DIALOG,
  PADDLE_DIALOG,
  isCabinInteriorWalkable,
  isIslaNatalBoxWalkable,
  islaNatalZoneAt,
  type IslaNatalDialog,
  type IslaNatalZoneId,
} from '../island/islaNatalData';
import {
  renderIslaNatalCabin,
  renderIslaNatalFrame,
  type ArcadeCabinetState,
  type IslaNatalParticle,
  type IslaNatalPromptSpec,
} from '../island/islaNatalRenderer';
import { IslaNatalVista } from '../island/IslaNatalVista';
import type { FacingDirection } from '../rpg/rpgContent';
import { IslaNatalPongChallenge } from './IslaNatalPongChallenge';

const CAMERA_ZOOM = 1.75;
const WALK_SPEED = 200;
const SPRINT_SPEED = 300;
const SIGNAL_DECAY = 0.2;
const DEPARTURE_DURATION = 4.6;

function cubicLerp(a: number, b: number, c: number, d: number, t: number): number {
  const inv = 1 - t;
  return inv * inv * inv * a + 3 * inv * inv * t * b + 3 * inv * t * t * c + t * t * t * d;
}

interface NatalDepartureRide {
  t: number;
  duration: number;
  from: { x: number; y: number };
  c1: { x: number; y: number };
  c2: { x: number; y: number };
  to: { x: number; y: number };
  nextSpray: number;
  nextRing: number;
}

const ARRIVAL_DIALOG: IslaNatalDialog = {
  title: 'La isla donde naciste',
  subtitle: 'Playa del Aurora',
  paragraphs: [
    'Abres los ojos sobre arena tibia. El mar respira despacio, como si también acabara de despertar.',
    'No recuerdas cómo has llegado hasta aquí, pero tus pies sí: conocen cada piedra del sendero que sube hacia la cabaña.',
    'Al otro lado de la pradera, entre los árboles, algo lanza un destello cian muy débil y vuelve a callarse.',
  ],
  hint: 'WASD o flechas para caminar · Mayús para correr · E para examinar',
};

const CABIN_INTRO_DIALOG: IslaNatalDialog = {
  title: 'La casa de la pradera',
  subtitle: 'Interior · Cabaña familiar',
  paragraphs: [
    'La puerta se cierra a tu espalda y el ruido del mar queda afuera. Adentro huele a leña, a pan de ayer y a la lámpara de aceite que nadie apagó.',
    'La cama está hecha, la mesa puesta para dos y la cocina todavía tibia. Nada ha cambiado desde la última vez que jugaste aquí.',
    'Junto a la ventana, colgada de un clavo, sigue tu vieja mochila de lona.',
    'Bajo el retrato familiar descansa el cofre del abuelo, cerrado con cuatro discos de latón. Nunca te dejó abrirlo.',
  ],
  hint: 'Acércate a la mochila y pulsa [E] para llevártela. El cofre espera bajo el retrato.',
};

const CABIN_BACKPACK_DIALOG: IslaNatalDialog = {
  title: 'La mochila de lona',
  subtitle: 'Equipo por defecto',
  paragraphs: [
    'La lona está curtida por la sal y conserva el olor de todos los veranos. Pesada, sí; vacía, no.',
    'Adentro espera el equipo de siempre: la Bitácora de la Isla del Origen, una cantimplora de hojalata, una brújula de latón y un ovillo de cuerda.',
    'Te la cuelgas al hombro. Ahora lo que encuentres en el camino tendrá un lugar donde viajar contigo.',
  ],
  hint: 'La mochila queda en tu inventario: ábrelo con [ENTER] en la Isla del Origen.',
};

const NATAL_FLAGS = ISLA_NATAL_FLAGS;

type NatalPromptKind =
  | 'poi'
  | 'arcade'
  | 'paddle'
  | 'departure'
  | 'cabin-exit'
  | 'cabin-backpack'
  | 'cabin-chest'
  | 'cabin-radio';

/**
 * Fases de la secuencia inicial de Isla Natal:
 * radio normal en casa → interferencia/estática → tormenta y anomalías del Reinicio Cero →
 * salida de la casa → llegada del enviado del futuro → diálogo y entrega del código → partida.
 */
type TravelerPhase =
  | 'none'
  | 'radio'
  | 'radio-static'
  | 'storm'
  | 'exit'
  | 'arrival'
  | 'descend'
  | 'talk'
  | 'board'
  | 'departure';

interface NatalPromptTarget {
  kind: NatalPromptKind;
  id: string;
  label: string;
  accentHex: string;
  x: number;
  y: number;
}

interface NatalDialogAction {
  label: string;
  run: () => void;
}

interface NatalDialogModal {
  category: string;
  tone: 'wood' | 'stone' | 'arcane';
  dialog: IslaNatalDialog;
  primary?: NatalDialogAction;
  lockClose?: boolean;
}

interface NatalIntroCaption {
  label: string;
  text: string;
  tone: 'radio' | 'static' | 'storm';
}

function emitParticles(
  list: IslaNatalParticle[],
  x: number,
  y: number,
  count: number,
  color: string,
  spread = 58,
  lift = 22
): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 10 + Math.random() * spread;
    const life = 0.7 + Math.random() * 1.1;
    list.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.6 - lift,
      life,
      maxLife: life,
      color,
      size: Math.random() < 0.45 ? 3 : 2,
    });
  }
  if (list.length > 460) list.splice(0, list.length - 460);
}

export interface IslaNatalStageProps {
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  appearance: AvatarAppearance;
  narrativeEvents: string[];
  onRecordNarrativeEvent: (eventId: string) => void;
  onDepartToOrigin: () => void;
  /** Llegada desde Isla Origen: aparecer en el puerto norte con un aviso. */
  arrivedFromOrigen?: boolean;
  onArrivalNoticeShown?: () => void;
  /** Entrega el equipo inicial de la mochila al inventario persistente. */
  onGrantInventoryItems: (itemIds: string[]) => void;
  /** Retira objetos consumidos en el mundo, como la palanca del gabinete. */
  onConsumeInventoryItems: (itemIds: string[]) => void;
}

export function IslaNatalStage({
  skinColor,
  hairColor,
  shirtColor,
  appearance,
  narrativeEvents,
  onRecordNarrativeEvent,
  onDepartToOrigin,
  arrivedFromOrigen = false,
  onArrivalNoticeShown,
  onGrantInventoryItems,
  onConsumeInventoryItems,
}: IslaNatalStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [keybindings] = useState<KeybindingsMap>(() => loadKeybindings());

  /* -------------------------------------------------------------- */
  /* MARCADORES NARRATIVOS                                           */
  /* -------------------------------------------------------------- */

  const [localFlags, setLocalFlags] = useState<string[]>([]);
  const flagSet = useMemo(
    () => new Set([...narrativeEvents, ...localFlags]),
    [narrativeEvents, localFlags]
  );

  const onRecordRef = useRef(onRecordNarrativeEvent);
  onRecordRef.current = onRecordNarrativeEvent;

  const markFlag = useCallback((id: string) => {
    setLocalFlags((prev) => (prev.includes(id) ? prev : [...prev, id]));
    onRecordRef.current(id);
  }, []);

  const arcadePowered = flagSet.has(NATAL_FLAGS.arcadePowered);
  const pongWon = flagSet.has(NATAL_FLAGS.pongWon);
  const paddleCarried = flagSet.has(NATAL_FLAGS.paddle);
  const arcadeState: ArcadeCabinetState = pongWon
    ? 'won'
    : arcadePowered
      ? 'powered'
      : 'dusty';
  const paddleOnGround = pongWon && !paddleCarried;
  const hasBackpack = flagSet.has(NATAL_FLAGS.backpack);
  // El cofre solo se abre con la combinación que entrega el viajero.
  const chestOpened = flagSet.has(NATAL_FLAGS.chestOpened);
  const chestCodeKnown = flagSet.has(NATAL_FLAGS.travelerWarning);
  const leverInstalled = flagSet.has(NATAL_FLAGS.leverInstalled) || arcadePowered;
  // El puerto norte sólo abre el carril de surf cuando Pong está ganado, la
  // Barra de Pong está en manos del jugador y la mochila ha sido recogida.
  const departureReady = pongWon && paddleCarried && hasBackpack;
  const startAtNorthPort = pongWon && paddleCarried;

  // Partida nueva: Pixel ya vive en la cabaña. La intro (radio, temblor y
  // aviso del viajero) ocurre adentro antes de salir a la isla.
  const introInsideCabin =
    !flagSet.has(NATAL_FLAGS.firstLight) &&
    !flagSet.has(NATAL_FLAGS.travelerWarning) &&
    !pongWon &&
    !arcadePowered;
  const introInsideCabinRef = useRef(introInsideCabin);

  /* -------------------------------------------------------------- */
  /* DIÁLOGO                                                         */
  /* -------------------------------------------------------------- */

  const [dialogModal, setDialogModal] = useState<NatalDialogModal | null>(null);
  const [chestCodeOpen, setChestCodeOpen] = useState(false);
  const [chestCode, setChestCode] = useState('');
  const [chestCodeError, setChestCodeError] = useState(false);
  const [dialogueVisibleChars, setDialogueVisibleChars] = useState(0);
  const [dialogueLineIndex, setDialogueLineIndex] = useState(0);
  const dialogueLines = dialogModal?.dialog.lines ?? null;
  const dialogueLine = dialogueLines
    ? dialogueLines[Math.min(dialogueLineIndex, dialogueLines.length - 1)]
    : null;
  const dialogueFullText = dialogueLine
    ? dialogueLine.text
    : (dialogModal?.dialog.paragraphs.join('\n\n') ?? '');

  useEffect(() => {
    setDialogueLineIndex(0);
  }, [dialogModal]);

  useEffect(() => {
    if (!dialogModal) {
      setDialogueVisibleChars(0);
      return;
    }
    setDialogueVisibleChars(0);
    let shown = 0;
    const timer = window.setInterval(() => {
      shown = Math.min(dialogueFullText.length, shown + 1);
      setDialogueVisibleChars(shown);
      if (shown >= dialogueFullText.length) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [dialogModal, dialogueFullText]);

  const advanceDialogueRef = useRef<() => void>(() => {});
  advanceDialogueRef.current = () => {
    if (!dialogModal) return;
    if (dialogueVisibleChars < dialogueFullText.length) {
      setDialogueVisibleChars(dialogueFullText.length);
      retroAudio.tick();
      return;
    }
    // Conversación por burbujas: una línea por vez, como en un RPG.
    if (dialogueLines && dialogueLineIndex < dialogueLines.length - 1) {
      setDialogueLineIndex((index) => index + 1);
      retroAudio.uiClick();
      return;
    }
    if (dialogModal.primary) dialogModal.primary.run();
    else {
      setDialogModal(null);
      retroAudio.uiClick();
    }
  };

  // La conversación respira sola: las líneas cortas avanzan sin obligar a
  // pulsar una tecla entre cada frase. Un clic o [E] acelera el turno.
  useEffect(() => {
    if (!dialogModal || !dialogueLines) return undefined;
    if (dialogueVisibleChars < dialogueFullText.length) return undefined;
    const isLast = dialogueLineIndex >= dialogueLines.length - 1;
    const timer = window.setTimeout(
      () => advanceDialogueRef.current(),
      isLast ? 2400 : 1500
    );
    return () => window.clearTimeout(timer);
  }, [
    dialogModal,
    dialogueLines,
    dialogueLineIndex,
    dialogueFullText,
    dialogueVisibleChars,
  ]);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4200);
  }, []);
  useEffect(
    () => () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    },
    []
  );

  // Aviso único al desembarcar de vuelta desde Isla Origen: el jugador
  // aparece en el puerto norte con todo su inventario y sus banderas.
  const arrivalNoticeShownRef = useRef(false);
  const arrivalNoticeCallbackRef = useRef(onArrivalNoticeShown);
  arrivalNoticeCallbackRef.current = onArrivalNoticeShown;
  useEffect(() => {
    if (!arrivedFromOrigen || arrivalNoticeShownRef.current) return;
    arrivalNoticeShownRef.current = true;
    showToast(
      'Regreso a Isla Natal · Muelle Norte. La Barra de Pong quedó lista para volver a Isla Origen.'
    );
    arrivalNoticeCallbackRef.current?.();
  }, [arrivedFromOrigen, showToast]);

  /* -------------------------------------------------------------- */
  /* RETO DE PONG Y PARTIDA                                          */
  /* -------------------------------------------------------------- */

  const [challengeOpen, setChallengeOpen] = useState(false);
  const [vistaOpen, setVistaOpen] = useState(false);
  const [departureFlash, setDepartureFlash] = useState(false);
  // Escena única del viajero del futuro. Bloquea el control mientras dura.
  // En partida nueva arranca con la radio de la cabaña.
  const [travelerPhase, setTravelerPhase] = useState<TravelerPhase>(() =>
    introInsideCabinRef.current ? 'radio' : 'none'
  );
  const travelerPhaseRef = useRef<TravelerPhase>('none');
  travelerPhaseRef.current = travelerPhase;
  const travelerStartRef = useRef(0);
  /** Pixel camina hasta la puerta antes de salir: la transición no es un corte. */
  const exitWalkRef = useRef<{ x: number; y: number } | null>(null);
  const doorExitTriggeredRef = useRef(false);
  const cabinFadeTimerRef = useRef<number | null>(null);
  const [cabinFade, setCabinFade] = useState(false);
  /** Pixel comienza dentro de su casa en una partida nueva. */
  const [cabinInside, setCabinInside] = useState(introInsideCabinRef.current);
  const [introCaption, setIntroCaption] = useState<NatalIntroCaption | null>(null);
  const [zoneBanner, setZoneBanner] = useState<{
    name: string;
    subtitle: string;
    accentHex: string;
  } | null>(null);
  const zoneTimerRef = useRef<number | null>(null);

  const showZoneBanner = useCallback((zoneId: IslaNatalZoneId, first: boolean) => {
    const zone = ISLA_NATAL_ZONES[zoneId];
    setZoneBanner({ name: zone.name, subtitle: zone.subtitle, accentHex: zone.accentHex });
    if (!first) retroAudio.zoneChime();
    if (zoneTimerRef.current !== null) window.clearTimeout(zoneTimerRef.current);
    zoneTimerRef.current = window.setTimeout(() => setZoneBanner(null), 2900);
  }, []);
  useEffect(
    () => () => {
      if (zoneTimerRef.current !== null) window.clearTimeout(zoneTimerRef.current);
      if (cabinFadeTimerRef.current !== null) window.clearTimeout(cabinFadeTimerRef.current);
    },
    []
  );

  /* -------------------------------------------------------------- */
  /* RUNTIME COMPARTIDO CON EL BUCLE                                 */
  /* -------------------------------------------------------------- */

  const playerRef = useRef({
    // Al volver de Pong, el jugador aparece junto al puerto norte con la barra
    // lista: la salida queda a la vista en lugar de perderse en la playa sur.
    // En partida nueva arranca adentro de la casa, frente a la radio.
    x: introInsideCabinRef.current
      ? ISLA_NATAL_CABIN.introSpot.x
      : (startAtNorthPort ? ISLA_NATAL_NORTH_PORT_SPAWN : ISLA_NATAL_SPAWN).x,
    y: introInsideCabinRef.current
      ? ISLA_NATAL_CABIN.introSpot.y
      : (startAtNorthPort ? ISLA_NATAL_NORTH_PORT_SPAWN : ISLA_NATAL_SPAWN).y,
    facingDir: (introInsideCabinRef.current ? 'right' : 'up') as FacingDirection,
    walking: false,
    sprinting: false,
    interactAnim: 0,
    ridingPaddle: false,
    rideTilt: 0,
  });
  const particlesRef = useRef<IslaNatalParticle[]>([]);
  const shockwavesRef = useRef<{ x: number; y: number; t: number; life: number }[]>([]);
  const chargeRef = useRef(0);
  const signalRef = useRef(0);
  const promptRef = useRef<NatalPromptTarget | null>(null);
  const departureRef = useRef<NatalDepartureRide | null>(null);
  const departureSafetyRef = useRef<number | null>(null);
  const portCooldownRef = useRef(0);
  const renderFaultRef = useRef(0);
  const [renderFault, setRenderFault] = useState(false);
  const interactRef = useRef<(target: NatalPromptTarget) => void>(() => {});
  /** Permite descartar el destino de clic al cambiar de escena. */
  const clickResetRef = useRef<() => void>(() => {});
  /** Estado del interior de la cabaña y posición a la que se vuelve al salir. */
  const cabinRef = useRef({
    inside: introInsideCabinRef.current,
    savedX: ISLA_NATAL_TRAVELER_SCENE_PLAYER.x,
    savedY: ISLA_NATAL_TRAVELER_SCENE_PLAYER.y,
    savedFacing: 'right' as FacingDirection,
  });
  const grantInventoryRef = useRef(onGrantInventoryItems);
  grantInventoryRef.current = onGrantInventoryItems;
  const consumeInventoryRef = useRef(onConsumeInventoryItems);
  consumeInventoryRef.current = onConsumeInventoryItems;

  const stageRef = useRef({
    flagSet,
    arcadeState,
    paddleOnGround,
    departureReady,
    chestOpened,
    chestCodeKnown,
    leverInstalled,
    skinColor,
    hairColor,
    shirtColor,
    appearance,
    dialogOpen: false,
    dialogLockClose: false,
    codeOpen: false,
    challengeOpen,
    vistaOpen,
    showZoneBanner,
    markFlag,
    onDepartToOrigin,
    setDepartureFlash,
  });
  stageRef.current = {
    flagSet,
    arcadeState,
    paddleOnGround,
    departureReady,
    chestOpened,
    chestCodeKnown,
    leverInstalled,
    skinColor,
    hairColor,
    shirtColor,
    appearance,
    dialogOpen: dialogModal !== null,
    dialogLockClose: Boolean(dialogModal?.lockClose),
    codeOpen: chestCodeOpen,
    challengeOpen,
    vistaOpen,
    showZoneBanner,
    markFlag,
    onDepartToOrigin,
    setDepartureFlash,
  };

  /* -------------------------------------------------------------- */
  /* ACCIONES                                                        */
  /* -------------------------------------------------------------- */

  const openChallenge = useCallback(() => {
    setDialogModal(null);
    setChallengeOpen(true);
    retroAudio.doorTransition();
  }, []);

  const powerOnArcade = useCallback(() => {
    markFlag(NATAL_FLAGS.arcadePowered);
    retroAudio.unlock();
    emitParticles(
      particlesRef.current,
      ISLA_NATAL_ARCADE_ANCHOR.x,
      ISLA_NATAL_ARCADE_ANCHOR.y - 60,
      42,
      '#67e8f9'
    );
    shockwavesRef.current.push({
      x: ISLA_NATAL_ARCADE_ANCHOR.x,
      y: ISLA_NATAL_ARCADE_ANCHOR.y - 40,
      t: 0,
      life: 1.6,
    });
    chargeRef.current = Math.max(chargeRef.current, 0.2);
    setDialogModal({
      category: 'LA ARBOLEDA · TUBO CATÓDICO',
      tone: 'arcane',
      dialog: ARCADE_DIALOG_POWER_ON,
      primary: { label: 'Jugar · 3 goles', run: openChallenge },
    });
  }, [markFlag, openChallenge]);

  const installLever = useCallback(() => {
    markFlag(NATAL_FLAGS.leverInstalled);
    // La palanca deja el inventario: queda montada en el gabinete, no se duplica.
    consumeInventoryRef.current(['item-palanca-pong']);
    // Instalar la palanca es el gesto que devuelve la corriente al gabinete.
    powerOnArcade();
  }, [markFlag, powerOnArcade]);

  const interactArcade = useCallback(() => {
    const flags = stageRef.current.flagSet;
    if (!flags.has(NATAL_FLAGS.arcadePowered)) {
      if (!flags.has(NATAL_FLAGS.arcadeFound)) {
        markFlag(NATAL_FLAGS.arcadeFound);
        retroAudio.echoDiscover();
        setDialogModal({
          category: 'LA ARBOLEDA · UN REGALO IMPOSIBLE',
          tone: 'arcane',
          dialog: ARCADE_DIALOG_DUSTY,
        });
        return;
      }
      // Sin la palanca del cofre la máquina no responde: primero hay que
      // volver a la cabaña, abrir el cofre y traer el mecanismo.
      if (!flags.has(NATAL_FLAGS.chestOpened) && !flags.has(NATAL_FLAGS.pongWon)) {
        setDialogModal({
          category: 'LA ARBOLEDA · LA RANURA VACÍA',
          tone: 'arcane',
          dialog: ARCADE_DIALOG_MISSING_LEVER,
        });
        return;
      }
      if (!flags.has(NATAL_FLAGS.leverInstalled)) {
        setDialogModal({
          category: 'LA ARBOLEDA · LA PALANCA DEL ABUELO',
          tone: 'arcane',
          dialog: ARCADE_DIALOG_LEVER_READY,
          primary: { label: 'Instalar la palanca', run: installLever },
        });
        return;
      }
      powerOnArcade();
      return;
    }
    if (!flags.has(NATAL_FLAGS.pongWon)) {
      setDialogModal({
        category: 'LA ARBOLEDA · TUBO CATÓDICO',
        tone: 'arcane',
        dialog: ARCADE_DIALOG_POWER_ON,
        primary: { label: 'Jugar · 3 goles', run: openChallenge },
      });
      return;
    }
    const carried = flags.has(NATAL_FLAGS.paddle);
    setDialogModal({
      category: 'LA ARBOLEDA · LA MÁQUINA CUMPLIÓ',
      tone: 'arcane',
      dialog: carried ? ARCADE_DIALOG_SPENT : ARCADE_DIALOG_AFTER_WIN,
    });
  }, [installLever, markFlag, openChallenge, powerOnArcade]);

  const interactPaddle = useCallback(() => {
    setDialogModal({
      category: 'LA ARBOLEDA · LA PALETA',
      tone: 'arcane',
      dialog: PADDLE_DIALOG,
      primary: {
        label: 'Guardarla',
        run: () => {
          markFlag(NATAL_FLAGS.paddle);
          retroAudio.achievementUnlock();
          emitParticles(
            particlesRef.current,
            ISLA_NATAL_PADDLE_ANCHOR.x,
            ISLA_NATAL_PADDLE_ANCHOR.y - 18,
            60,
            '#e0faff',
            74,
            34
          );
          setDialogModal(null);
          showToast('La paleta apunta al sur: el mar ha abierto un carril de luz.');
        },
      },
    });
  }, [markFlag, showToast]);

  const startDeparture = useCallback(() => {
    if (departureRef.current) return;
    const player = playerRef.current;
    const from = { x: player.x, y: player.y };
    // Travesía real hacia el norte: el puerto abre el carril y la barra surca
    // el mar abierto hasta la costa de la Isla del Origen.
    const to = { x: ISLA_NATAL_DEPARTURE.x + 210, y: -420 };
    departureRef.current = {
      t: 0,
      duration: DEPARTURE_DURATION,
      from,
      c1: { x: from.x + 240, y: from.y - 110 },
      c2: { x: to.x - 40, y: to.y + 220 },
      to,
      nextSpray: 0,
      nextRing: 0.25,
    };
    player.ridingPaddle = true;
    player.rideTilt = 0;
    player.walking = false;
    player.sprinting = false;
    player.facingDir = 'right';
    retroAudio.hoverboardLaunch();
    window.dispatchEvent(new CustomEvent('pixelverse-shake'));

    // Red de seguridad: si el navegador congela los frames, la partida llega igual.
    if (departureSafetyRef.current !== null) window.clearTimeout(departureSafetyRef.current);
    departureSafetyRef.current = window.setTimeout(() => {
      departureSafetyRef.current = null;
      if (!departureRef.current) return;
      departureRef.current = null;
      const current = playerRef.current;
      current.ridingPaddle = false;
      current.rideTilt = 0;
      try {
        stageRef.current.markFlag(NATAL_FLAGS.departed);
        stageRef.current.onDepartToOrigin();
      } catch (error) {
        console.error('[PIXELVERSE] La partida en tabla no pudo completarse:', error);
        current.x = ISLA_NATAL_DEPARTURE.x;
        current.y = ISLA_NATAL_DEPARTURE.y - 24;
        portCooldownRef.current = performance.now() + 6000;
        stageRef.current.setDepartureFlash(false);
      }
    }, DEPARTURE_DURATION * 1000 + 1800);
  }, []);

  useEffect(
    () => () => {
      if (departureSafetyRef.current !== null) window.clearTimeout(departureSafetyRef.current);
    },
    []
  );

  const interactDeparture = useCallback(() => {
    const flags = stageRef.current.flagSet;
    if (!flags.has(NATAL_FLAGS.pongWon) || !flags.has(NATAL_FLAGS.paddle)) {
      setDialogModal({
        category: 'PUERTO NORTE · EL CARRIL DE LUZ',
        tone: 'wood',
        dialog: DEPARTURE_BLOCKED_DIALOG,
      });
      return;
    }
    if (!flags.has(NATAL_FLAGS.backpack)) {
      setDialogModal({
        category: 'PRADERA DE CASA · PREPARATIVOS',
        tone: 'wood',
        dialog: {
          title: 'Sin mochila',
          paragraphs: [
            'Debería llevar mi mochila con mis objetos. ¡Se encuentra en mi casa, la buscaré!',
          ],
        },
      });
      return;
    }
    // La travesía se elige aquí y se ejecuta sola hasta la Isla del Origen.
    startDeparture();
  }, [startDeparture]);

  const enterCabin = useCallback(() => {
    const cabin = cabinRef.current;
    if (cabin.inside) return;
    const player = playerRef.current;
    cabin.savedX = player.x;
    cabin.savedY = player.y;
    cabin.savedFacing = player.facingDir;
    cabin.inside = true;
    player.x = ISLA_NATAL_CABIN.spawn.x;
    player.y = ISLA_NATAL_CABIN.spawn.y;
    player.facingDir = 'up';
    player.walking = false;
    player.sprinting = false;
    clickResetRef.current();
    setCabinInside(true);
    retroAudio.doorTransition();
    const flags = stageRef.current.flagSet;
    if (!flags.has(NATAL_FLAGS.cabinVisited)) {
      markFlag(NATAL_FLAGS.cabinVisited);
      setDialogModal({
        category: 'PRADERA DE CASA · INTERIOR',
        tone: 'wood',
        dialog: CABIN_INTRO_DIALOG,
      });
    } else if (!flags.has(NATAL_FLAGS.backpack)) {
      showToast('Tu mochila espera colgada junto a la ventana.');
    } else if (flags.has(NATAL_FLAGS.travelerWarning) && !flags.has(NATAL_FLAGS.chestOpened)) {
      showToast(`El cofre del abuelo aguarda bajo el retrato (código ${ISLA_NATAL_CHEST_CODE}).`);
    } else {
      showToast('El calor del hogar sigue intacto dentro de tu casa.');
    }
  }, [markFlag, showToast]);

  const leaveCabin = useCallback(() => {
    const cabin = cabinRef.current;
    if (!cabin.inside) return;
    const flags = stageRef.current.flagSet;

    if (flags.has(NATAL_FLAGS.travelerWarning) && !flags.has(NATAL_FLAGS.backpack)) {
      setDialogModal({
        category: 'PRADERA DE CASA · UMBRAL BLOQUEADO',
        tone: 'wood',
        dialog: NATAL_NO_BACKPACK_EXIT_DIALOG,
      });
      retroAudio.npcBlip(0.65);
      return;
    }

    cabin.inside = false;
    setCabinInside(false);
    const player = playerRef.current;
    player.x = cabin.savedX;
    player.y = cabin.savedY;
    player.facingDir = 'right';
    player.walking = false;
    player.sprinting = false;
    retroAudio.doorTransition();

    if (!flags.has(NATAL_FLAGS.travelerWarning)) {
      player.x = ISLA_NATAL_TRAVELER_SCENE_PLAYER.x;
      player.y = ISLA_NATAL_TRAVELER_SCENE_PLAYER.y;
      setTravelerPhase('arrival');
    }
  }, []);

  /** Cruce de puerta con fundido: Pixel ya caminó hasta el umbral. */
  const finishCabinExit = useCallback(() => {
    if (doorExitTriggeredRef.current) return;
    doorExitTriggeredRef.current = true;
    exitWalkRef.current = null;
    setCabinFade(true);
    if (cabinFadeTimerRef.current !== null) window.clearTimeout(cabinFadeTimerRef.current);
    cabinFadeTimerRef.current = window.setTimeout(() => {
      leaveCabin();
      cabinFadeTimerRef.current = window.setTimeout(() => {
        setCabinFade(false);
        cabinFadeTimerRef.current = null;
      }, 500);
    }, 240);
  }, [leaveCabin]);
  const finishCabinExitRef = useRef(finishCabinExit);
  finishCabinExitRef.current = finishCabinExit;

  const takeCabinBackpack = useCallback(() => {
    if (stageRef.current.flagSet.has(NATAL_FLAGS.backpack)) return;
    setDialogModal({
      category: 'PRADERA DE CASA · LA MOCHILA',
      tone: 'wood',
      dialog: CABIN_BACKPACK_DIALOG,
      primary: {
        label: 'Llevar la mochila',
        run: () => {
          markFlag(NATAL_FLAGS.backpack);
          grantInventoryRef.current(['item-mochila-explorador', 'item-bitacora-cero']);
          emitParticles(
            particlesRef.current,
            ISLA_NATAL_CABIN.backpack.x,
            ISLA_NATAL_CABIN.backpack.y + 12,
            44,
            '#f5d9a0',
            54,
            18
          );
          retroAudio.achievementUnlock();
          setDialogModal(null);
          const flags = stageRef.current.flagSet;
          if (flags.has(NATAL_FLAGS.travelerWarning) && !flags.has(NATAL_FLAGS.chestOpened)) {
            showToast(
              `Mochila recogida · Acercate al cofre del abuelo e introducí el código ${ISLA_NATAL_CHEST_CODE}.`
            );
          } else {
            showToast('Mochila al hombro · Bitácora, cantimplora, brújula y cuerda.');
          }
        },
      },
    });
  }, [markFlag, showToast]);

  const interactCabinRadio = useCallback(() => {
    retroAudio.npcBlip(0.78);
    setDialogModal({
      category: 'PRADERA DE CASA · MESA DE LECTURA',
      tone: 'arcane',
      dialog: NATAL_CABIN_RADIO_SILENT_DIALOG,
    });
  }, []);

  const interactChest = useCallback(() => {
    const flags = stageRef.current.flagSet;
    if (flags.has(NATAL_FLAGS.chestOpened)) {
      setDialogModal({
        category: 'PRADERA DE CASA · EL COFRE DEL ABUELO',
        tone: 'wood',
        dialog: NATAL_CHEST_EMPTY_DIALOG,
      });
      return;
    }
    // El cofre no puede abrirse antes de la cinemática ni antes de recibir el código del enviado del futuro.
    if (!flags.has(NATAL_FLAGS.travelerWarning)) {
      setDialogModal({
        category: 'PRADERA DE CASA · CERRADURA DE LATÓN',
        tone: 'wood',
        dialog: NATAL_CHEST_LOCKED_DIALOG,
      });
      return;
    }
    setDialogModal(null);
    setChestCode('');
    setChestCodeError(false);
    setChestCodeOpen(true);
    retroAudio.uiClick();
  }, []);

  const closeChestCode = useCallback(() => {
    setChestCodeOpen(false);
    setChestCode('');
    setChestCodeError(false);
    retroAudio.uiClick();
  }, []);

  const submitChestCode = useCallback(() => {
    if (chestCode.trim() !== ISLA_NATAL_CHEST_CODE) {
      setChestCodeError(true);
      retroAudio.npcBlip(0.62);
      return;
    }
    setChestCodeOpen(false);
    setChestCode('');
    setChestCodeError(false);
    markFlag(NATAL_FLAGS.chestOpened);
    grantInventoryRef.current(['item-palanca-pong', 'item-carta-abuelo', 'item-foto-abuelo']);
    emitParticles(
      particlesRef.current,
      ISLA_NATAL_CABIN.chest.x,
      ISLA_NATAL_CABIN.chest.y - 8,
      64,
      '#ffe7a8',
      86,
      42
    );
    retroAudio.chestOpen();
    retroAudio.achievementUnlock();
    setDialogModal({
      category: 'PRADERA DE CASA · EL COFRE DEL ABUELO',
      tone: 'wood',
      dialog: NATAL_CHEST_REVEAL_DIALOG,
      primary: { label: 'Guardar la carta y el equipo', run: () => setDialogModal(null) },
    });
  }, [chestCode, markFlag]);

  const openVista = useCallback(() => {
    // El jugador se detiene frente al catalejo antes de abrir la vista lejana.
    clickResetRef.current();
    const player = playerRef.current;
    player.walking = false;
    player.sprinting = false;
    retroAudio.zoneChime();
    setVistaOpen(true);
  }, []);

  const closeVista = useCallback(() => {
    setVistaOpen(false);
    retroAudio.uiClick();
  }, []);

  const interactPoi = useCallback(
    (poiId: string) => {
      if (poiId === 'puerta-cabana') {
        enterCabin();
        return;
      }
      // El mirador del Alto de las Rocas abre la vista lejana de la Isla del
      // Origen en lugar de un diálogo: el catalejo apunta hacia el horizonte.
      if (poiId === 'oteo-isla') {
        openVista();
        return;
      }
      const poi = ISLA_NATAL_POIS.find((entry) => entry.id === poiId);
      if (!poi) return;
      retroAudio.npcBlip(poi.kind.startsWith('viewpoint') ? 0.85 : 1.05);
      const arcane =
        poi.kind === 'window' || poi.kind === 'mailbox' || poi.kind === 'viewpoint-sea';
      setDialogModal({
        category: ISLA_NATAL_ZONES[islaNatalZoneAt(poi.x, poi.y)].name.toUpperCase(),
        tone: arcane ? 'arcane' : 'wood',
        dialog: poi.dialog,
      });
    },
    [enterCabin, openVista]
  );

  const handleInteract = useCallback(
    (target: NatalPromptTarget) => {
      if (target.kind === 'poi') interactPoi(target.id);
      else if (target.kind === 'arcade') interactArcade();
      else if (target.kind === 'paddle') interactPaddle();
      else if (target.kind === 'cabin-backpack') takeCabinBackpack();
      else if (target.kind === 'cabin-chest') interactChest();
      else if (target.kind === 'cabin-radio') interactCabinRadio();
      else if (target.kind === 'cabin-exit') leaveCabin();
      else interactDeparture();
    },
    [
      interactArcade,
      interactCabinRadio,
      interactChest,
      interactDeparture,
      interactPaddle,
      interactPoi,
      leaveCabin,
      takeCabinBackpack,
    ]
  );
  interactRef.current = handleInteract;

  const handleChallengeVictory = useCallback(
    (arcadePoints: number, rallies: number) => {
      setChallengeOpen(false);
      markFlag(NATAL_FLAGS.pongWon);
      markFlag(NATAL_FLAGS.signal);
      signalRef.current = 1;
      chargeRef.current = 1;
      const anchor = ISLA_NATAL_ARCADE_ANCHOR;
      emitParticles(particlesRef.current, anchor.x, anchor.y - 46, 120, '#b9f6ff', 120, 60);
      emitParticles(particlesRef.current, anchor.x, anchor.y - 46, 60, '#ffffff', 80, 90);
      shockwavesRef.current.push(
        { x: anchor.x, y: anchor.y - 30, t: 0, life: 2.4 },
        { x: anchor.x, y: anchor.y - 30, t: -0.5, life: 2.8 },
        { x: anchor.x, y: anchor.y - 30, t: -1.1, life: 3.2 }
      );
      retroAudio.portalVictory();
      window.dispatchEvent(new CustomEvent('pixelverse-shake'));
      showToast(`Victoria · ${arcadePoints} PTS en ${rallies} intercambios`);
      const hasBackpackNow = flagSet.has(NATAL_FLAGS.backpack);
      if (!hasBackpackNow) {
        setDialogModal({
          category: 'LA ARBOLEDA · SEÑAL ENTRANTE',
          tone: 'arcane',
          dialog: {
            title: 'Señal en la pantalla',
            paragraphs: [
              'El marcador se queda en 3 y la máquina no vuelve al atractivo: la pantalla se llena de bandas que caen como lluvia.',
              'Entre la estática se dibuja una silueta enorme —arcos, torres, un cielo roto— y una voz sin boca dice una sola palabra que no llegas a entender.',
              'Después, silencio. Sobre el cristal queda escrita una dirección que no está en ningún mapa: la Isla del Origen.',
              'Debería llevar mi mochila con mis objetos. ¡Se encuentra en mi casa, la buscaré!',
            ],
            hint: 'Algo se ha despertado muy lejos de aquí… y ha aprendido tu nombre.',
          },
          primary: { label: 'Salir a la arboleda', run: () => setDialogModal(null) },
        });
        return;
      }
      setDialogModal({
        category: 'LA ARBOLEDA · SEÑAL ENTRANTE',
        tone: 'arcane',
        dialog: ARCADE_DIALOG_AFTER_WIN,
        primary: { label: 'Salir a la arboleda', run: () => setDialogModal(null) },
      });
    },
    [markFlag, showToast, flagSet]
  );

  const handleChallengeQuit = useCallback(() => {
    setChallengeOpen(false);
  }, []);

  /* -------------------------------------------------------------- */
  /* SECUENCIA INICIAL DE ISLA NATAL                                 */
  /* -------------------------------------------------------------- */

  const arrivalAnnouncedRef = useRef(flagSet.has(NATAL_FLAGS.firstLight));

  useEffect(() => {
    // Partida nueva: la aventura abre dentro de la casa de Pixel escuchando la radio.
    if (introInsideCabinRef.current) {
      markFlag(NATAL_FLAGS.firstLight);
      markFlag(NATAL_FLAGS.cabinVisited);
      return undefined;
    }
    if (arrivalAnnouncedRef.current) return;
    arrivalAnnouncedRef.current = true;
    const timer = window.setTimeout(() => {
      markFlag(NATAL_FLAGS.firstLight);
      setDialogModal({
        category: 'ISLA NATAL · EL DESPERTAR',
        tone: 'wood',
        dialog: ARRIVAL_DIALOG,
      });
    }, 850);
    return () => window.clearTimeout(timer);
  }, [markFlag]);

  // Secuencia obligatoria:
  // 1-2. Radio normal en casa → 3. Interferencia y estática → 4. Rayos, tormenta y Reinicio Cero →
  // 5. Pixel sale de su casa → 6-7. Enviado del futuro pronuncia el diálogo y entrega el código →
  // 8. El jugador recupera el control afuera.
  useEffect(() => {
    if (travelerPhase === 'none') {
      setIntroCaption(null);
      return undefined;
    }
    travelerStartRef.current = performance.now();

    if (travelerPhase === 'radio') {
      playerRef.current.facingDir = 'right';
      setIntroCaption({
        label: 'RADIO ISLA NATAL · TRANSMISIÓN NORMAL',
        text: '«…brisa suave del sur y mar en calma sobre todo el archipiélago esta tarde…»',
        tone: 'radio',
      });
      retroAudio.radioBroadcast();
      const repeatBroadcast = window.setTimeout(() => {
        retroAudio.radioBroadcast();
      }, 2050);
      const done = window.setTimeout(() => {
        setTravelerPhase('radio-static');
      }, 3800);
      return () => {
        window.clearTimeout(repeatBroadcast);
        window.clearTimeout(done);
      };
    }

    if (travelerPhase === 'radio-static') {
      playerRef.current.facingDir = 'right';
      setIntroCaption({
        label: 'INTERFERENCIA Y ESTÁTICA',
        text: '«…esperen… una anomalía masiva invade todas las frecuen— [KRRZZT—ESTÁTICA]» · La transmisión se interrumpe.',
        tone: 'static',
      });
      retroAudio.radioInterference(false);
      emitParticles(particlesRef.current, 363, 149, 18, '#67e8f9', 36, 16);
      const cutBurst = window.setTimeout(() => {
        retroAudio.radioInterference(true);
        emitParticles(particlesRef.current, 363, 149, 26, '#fb7185', 42, 20);
      }, 1300);
      const done = window.setTimeout(() => {
        setTravelerPhase('storm');
      }, 2800);
      return () => {
        window.clearTimeout(cutBurst);
        window.clearTimeout(done);
      };
    }

    if (travelerPhase === 'storm') {
      playerRef.current.facingDir = 'left';
      setIntroCaption({
        label: 'TORMENTA · ANUNCIO DEL REINICIO CERO',
        text: 'Rayos y una tormenta repentina golpean la casa mientras fenómenos extraños tiñen el cielo…',
        tone: 'storm',
      });
      retroAudio.thunderRoll();
      retroAudio.flashBurst();
      window.dispatchEvent(new CustomEvent('pixelverse-shake'));

      const secondFlash = window.setTimeout(() => {
        retroAudio.thunderRoll();
        retroAudio.flashBurst();
        window.dispatchEvent(new CustomEvent('pixelverse-shake'));
      }, 1350);

      const anomalyWave = window.setTimeout(() => {
        retroAudio.reinicioCeroStormAnomaly();
        window.dispatchEvent(new CustomEvent('pixelverse-shake'));
        setIntroCaption({
          label: 'ACONTECIMIENTOS EXTRAÑOS · EL REINICIO CERO',
          text: 'Una grieta carmesí rasga las nubes sobre la isla y el aire entero vibra fuera del tiempo…',
          tone: 'storm',
        });
      }, 2450);

      const thirdFlash = window.setTimeout(() => {
        retroAudio.flashBurst();
      }, 3850);

      const finalStrike = window.setTimeout(() => {
        retroAudio.thunderRoll();
        retroAudio.flashBurst();
        window.dispatchEvent(new CustomEvent('pixelverse-shake'));
        playerRef.current.facingDir = 'down';
      }, 5050);

      const done = window.setTimeout(() => {
        setIntroCaption(null);
        setTravelerPhase('exit');
      }, 6200);

      return () => {
        window.clearTimeout(secondFlash);
        window.clearTimeout(anomalyWave);
        window.clearTimeout(thirdFlash);
        window.clearTimeout(finalStrike);
        window.clearTimeout(done);
      };
    }

    if (travelerPhase === 'exit') {
      setIntroCaption(null);
      // Finalizada la animación de la tormenta, Pixel camina hasta la puerta y sale de su casa.
      exitWalkRef.current = {
        x: ISLA_NATAL_CABIN.door.x,
        y: ISLA_NATAL_CABIN.door.y - 6,
      };
      doorExitTriggeredRef.current = false;
      const safety = window.setTimeout(() => finishCabinExitRef.current(), 4200);
      return () => {
        window.clearTimeout(safety);
        exitWalkRef.current = null;
      };
    }

    if (travelerPhase === 'arrival') {
      setIntroCaption(null);
      retroAudio.timeMachineWarp();
      window.dispatchEvent(new CustomEvent('pixelverse-shake'));
      const done = window.setTimeout(() => {
        emitParticles(
          particlesRef.current,
          ISLA_NATAL_TRAVELER_SITE.x,
          ISLA_NATAL_TRAVELER_SITE.y - 6,
          54,
          '#cbd5e1',
          96,
          26
        );
        emitParticles(
          particlesRef.current,
          ISLA_NATAL_TRAVELER_SITE.x,
          ISLA_NATAL_TRAVELER_SITE.y - 2,
          24,
          '#67e8f9',
          72,
          18
        );
        setTravelerPhase('descend');
      }, 2500);
      return () => window.clearTimeout(done);
    }

    if (travelerPhase === 'descend') {
      const done = window.setTimeout(() => {
        setDialogModal({
          category: 'ISLA NATAL · DYLAN (ENVIADO DEL FUTURO)',
          tone: 'arcane',
          dialog: NATAL_TRAVELER_DIALOG,
          lockClose: true,
          primary: {
            label: `Recibir código (${ISLA_NATAL_CHEST_CODE})`,
            run: () => {
              markFlag(NATAL_FLAGS.travelerWarning);
              grantInventoryRef.current(['item-nota-codigo-cofre']);
              retroAudio.echoDiscover();
              showToast(
                `¡Código del cofre (${ISLA_NATAL_CHEST_CODE}) recibido! Entra a tu casa a abrir el cofre.`
              );
              setDialogModal(null);
              setTravelerPhase('board');
            },
          },
        });
        setTravelerPhase('talk');
      }, 1800);
      return () => window.clearTimeout(done);
    }

    if (travelerPhase === 'board') {
      markFlag(NATAL_FLAGS.travelerWarning);
      const done = window.setTimeout(() => setTravelerPhase('departure'), 1500);
      return () => window.clearTimeout(done);
    }

    if (travelerPhase === 'departure') {
      retroAudio.timeMachineWarp();
      window.dispatchEvent(new CustomEvent('pixelverse-shake'));
      emitParticles(
        particlesRef.current,
        ISLA_NATAL_TRAVELER_SITE.x,
        ISLA_NATAL_TRAVELER_SITE.y - 4,
        40,
        '#cbd5e1',
        86,
        22
      );
      const done = window.setTimeout(() => {
        markFlag(NATAL_FLAGS.travelerWarning);
        setTravelerPhase('none');
      }, 2200);
      return () => window.clearTimeout(done);
    }

    return undefined;
  }, [travelerPhase, markFlag, leaveCabin, showToast]);

  // Si el diálogo del enviado del futuro concluye, la escena continúa con la partida.
  useEffect(() => {
    if (travelerPhase === 'talk' && dialogModal === null) {
      setTravelerPhase('board');
    }
  }, [travelerPhase, dialogModal]);

  /* -------------------------------------------------------------- */
  /* BUCLE PRINCIPAL                                                 */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionQuery.matches;
    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
    };
    motionQuery.addEventListener('change', onMotionChange);

    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    // El interior usa la misma escala que la isla para conservar la proporción
    // del personaje y del pixel-art; la sala queda centrada sobre fondo oscuro.
    const sceneZoom = () => CAMERA_ZOOM;
    const viewW = () => vw / sceneZoom();
    const viewH = () => vh / sceneZoom();
    const resize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener('resize', resize);

    const player = playerRef.current;
    const camera = { x: 0, y: 0 };
    const cameraTarget = () => {
      const w = viewW();
      const h = viewH();
      if (cabinRef.current.inside) {
        return {
          x:
            w >= ISLA_NATAL_CABIN.roomW
              ? (ISLA_NATAL_CABIN.roomW - w) * 0.5
              : Math.max(0, Math.min(ISLA_NATAL_CABIN.roomW - w, player.x - w * 0.5)),
          y:
            h >= ISLA_NATAL_CABIN.roomH
              ? (ISLA_NATAL_CABIN.roomH - h) * 0.5
              : Math.max(0, Math.min(ISLA_NATAL_CABIN.roomH - h, player.y - h * 0.5)),
        };
      }
      return {
        x:
          w >= ISLA_NATAL_WORLD_W
            ? (ISLA_NATAL_WORLD_W - w) * 0.5
            : Math.max(0, Math.min(ISLA_NATAL_WORLD_W - w, player.x - w * 0.5)),
        y:
          h >= ISLA_NATAL_WORLD_H
            ? (ISLA_NATAL_WORLD_H - h) * 0.5
            : Math.max(0, Math.min(ISLA_NATAL_WORLD_H - h, player.y - h * 0.5)),
      };
    };
    const initial = cameraTarget();
    camera.x = initial.x;
    camera.y = initial.y;

    const keys: Record<string, boolean> = {};
    let clickTarget: { x: number; y: number } | null = null;
    clickResetRef.current = () => {
      clickTarget = null;
    };
    const canWalkAt = (px: number, py: number) =>
      cabinRef.current.inside ? isCabinInteriorWalkable(px, py) : isIslaNatalBoxWalkable(px, py);
    let stepAudioTimer = 0;
    let walkTimer = 0;
    let prevZoneId: IslaNatalZoneId | null = null;
    let departureFlashFired = false;
    let departureFinished = false;
    let boostFired = false;
    let warpFired = false;
    let departureFlashTimer: number | null = null;

    const isEditable = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        Boolean(target.closest('[contenteditable="true"]')));

    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditable(event.target)) return;
      const stage = stageRef.current;
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }

      if (stage.challengeOpen || departureRef.current) return;
      // El teclado de la cerradura se lleva desde su propio campo numérico.
      if (stage.codeOpen) return;
      if (
        travelerPhaseRef.current === 'radio' ||
        travelerPhaseRef.current === 'radio-static' ||
        travelerPhaseRef.current === 'storm' ||
        travelerPhaseRef.current === 'exit' ||
        travelerPhaseRef.current === 'arrival' ||
        travelerPhaseRef.current === 'descend' ||
        travelerPhaseRef.current === 'board' ||
        travelerPhaseRef.current === 'departure'
      ) {
        return;
      }

      if (stage.vistaOpen) {
        if (
          event.code === 'Escape' ||
          isActionPressed(event, 'interact', keybindings) ||
          isActionPressed(event, 'confirm', keybindings) ||
          event.code === 'Enter' ||
          event.code === 'Space'
        ) {
          event.preventDefault();
          if (!event.repeat) closeVista();
        }
        return;
      }

      if (stage.dialogOpen) {
        if (
          isActionPressed(event, 'interact', keybindings) ||
          isActionPressed(event, 'confirm', keybindings) ||
          event.code === 'Enter' ||
          event.code === 'Space'
        ) {
          event.preventDefault();
          if (!event.repeat) advanceDialogueRef.current();
        } else if (!stage.dialogLockClose && isActionPressed(event, 'cancel', keybindings)) {
          event.preventDefault();
          if (!event.repeat) {
            setDialogModal(null);
            retroAudio.uiClick();
          }
        }
        return;
      }

      keys[event.code] = true;

      if (!hasModifier && isActionPressed(event, 'interact', keybindings)) {
        event.preventDefault();
        if (event.repeat) return;
        const target = promptRef.current;
        if (target) {
          player.interactAnim = 0.42;
          retroAudio.uiClick();
          interactRef.current(target);
        }
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      keys[event.code] = false;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (
        stageRef.current.dialogOpen ||
        stageRef.current.challengeOpen ||
        stageRef.current.vistaOpen ||
        stageRef.current.codeOpen ||
        travelerPhaseRef.current !== 'none'
      ) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const zoom = sceneZoom();
      const worldX = (event.clientX - rect.left) / zoom + camera.x;
      const worldY = (event.clientY - rect.top) / zoom + camera.y;
      clickTarget = canWalkAt(worldX, worldY) ? { x: worldX, y: worldY } : null;
    };

    const onBlur = () => {
      for (const code of Object.keys(keys)) keys[code] = false;
      clickTarget = null;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    canvas.addEventListener('pointerdown', onPointerDown);

    const arcadeTarget: NatalPromptTarget = {
      kind: 'arcade',
      id: 'arcade',
      label: 'Examinar el gabinete',
      accentHex: '#67e8f9',
      x: ISLA_NATAL_ARCADE_ANCHOR.x,
      y: ISLA_NATAL_ARCADE_ANCHOR.y,
    };
    const paddleTarget: NatalPromptTarget = {
      kind: 'paddle',
      id: 'paddle',
      label: 'Recoger la paleta',
      accentHex: '#e0faff',
      x: ISLA_NATAL_PADDLE_ANCHOR.x,
      y: ISLA_NATAL_PADDLE_ANCHOR.y,
    };
    const departureTarget: NatalPromptTarget = {
      kind: 'departure',
      id: 'departure',
      label: 'Asomarse a la rompiente',
      accentHex: '#a5b4fc',
      x: ISLA_NATAL_DEPARTURE.x,
      y: ISLA_NATAL_DEPARTURE.y,
    };

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    let wasInCabin = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      elapsed += dt;

      const stage = stageRef.current;
      const modalOpen =
        stage.dialogOpen ||
        stage.challengeOpen ||
        stage.vistaOpen ||
        stage.codeOpen ||
        travelerPhaseRef.current !== 'none';
      const departure = departureRef.current;

      player.interactAnim = Math.max(0, player.interactAnim - dt);

      if (departure) {
        departure.t += dt;
        const k = Math.min(1, departure.t / departure.duration);
        const e = k * k * (3 - 2 * k);
        const baseX = cubicLerp(
          departure.from.x,
          departure.c1.x,
          departure.c2.x,
          departure.to.x,
          e
        );
        const baseY = cubicLerp(
          departure.from.y,
          departure.c1.y,
          departure.c2.y,
          departure.to.y,
          e
        );

        // Tangente de la trayectoria: orienta la tabla y la postura del cuerpo
        const look = Math.min(1, e + 0.014);
        let tx =
          cubicLerp(departure.from.x, departure.c1.x, departure.c2.x, departure.to.x, look) -
          baseX;
        let ty =
          cubicLerp(departure.from.y, departure.c1.y, departure.c2.y, departure.to.y, look) -
          baseY;
        if (Math.abs(tx) < 0.0001 && Math.abs(ty) < 0.0001) {
          tx = 1;
          ty = 0.35;
        }
        const angle = Math.atan2(ty, tx);
        const weave = Math.sin(k * Math.PI * 3.2) * 20 * Math.sin(Math.PI * k);

        player.x = baseX - Math.sin(angle) * weave;
        player.y = baseY + Math.cos(angle) * weave;
        player.rideTilt =
          angle * 0.45 +
          Math.cos(k * Math.PI * 3.2) * 0.14 +
          (reducedMotion ? 0 : Math.sin(k * Math.PI * 7) * 0.05);
        player.facingDir = tx >= 0 ? 'right' : 'left';
        player.walking = false;
        player.sprinting = false;

        // Cámara libre: la tabla surca el mar abierto, sin los límites de la isla
        const camFollow = Math.min(1, dt * 9);
        camera.x += (player.x - viewW() * 0.5 - camera.x) * camFollow;
        camera.y += (player.y - viewH() * 0.5 - camera.y) * camFollow;

        // Salpicaduras a ambos cantos de la tabla y anillos de agua tras la carga
        departure.nextRing -= dt;
        if (!reducedMotion && departure.nextRing <= 0) {
          departure.nextRing = 0.5;
          shockwavesRef.current.push({
            x: player.x - Math.cos(angle) * 26,
            y: player.y - Math.sin(angle) * 26 + 12,
            t: 0,
            life: 0.85,
          });
        }
        departure.nextSpray -= dt;
        if (!reducedMotion && departure.nextSpray <= 0) {
          departure.nextSpray = 0.035;
          const sprayX =
            player.x - Math.cos(angle) * (20 + Math.random() * 12);
          const sprayY =
            player.y - Math.sin(angle) * (20 + Math.random() * 12) + 10;
          emitParticles(
            particlesRef.current,
            sprayX,
            sprayY,
            3,
            k > 0.6 ? '#ffffff' : '#a5f3fc',
            34,
            -12
          );
        }

        if (!boostFired && k > 0.32) {
          boostFired = true;
          retroAudio.pixelCurrentBoost();
        }
        if (!warpFired && k > 0.76) {
          warpFired = true;
          retroAudio.timeMachineWarp();
          window.dispatchEvent(new CustomEvent('pixelverse-shake'));
        }
        if (!departureFlashFired && k > 0.9) {
          departureFlashFired = true;
          stage.setDepartureFlash(true);
          if (departureFlashTimer !== null) window.clearTimeout(departureFlashTimer);
          departureFlashTimer = window.setTimeout(() => {
            departureFlashTimer = null;
            stageRef.current.setDepartureFlash(false);
          }, 340);
        }
        if (k >= 1 && !departureFinished) {
          departureFinished = true;
          departureRef.current = null;
          player.ridingPaddle = false;
          player.rideTilt = 0;
          if (departureFlashTimer !== null) {
            window.clearTimeout(departureFlashTimer);
            departureFlashTimer = null;
          }
          if (departureSafetyRef.current !== null) {
            window.clearTimeout(departureSafetyRef.current);
            departureSafetyRef.current = null;
          }
          stage.setDepartureFlash(false);
          try {
            stage.markFlag(NATAL_FLAGS.departed);
          } catch (error) {
            console.error('[PIXELVERSE] No se pudo registrar la partida:', error);
          }
          try {
            stage.onDepartToOrigin();
          } catch (error) {
            // La isla sigue visible y jugable aunque falle la transición.
            console.error('[PIXELVERSE] La transición a la Isla del Origen falló:', error);
            departureFinished = false;
            player.x = ISLA_NATAL_DEPARTURE.x;
            player.y = ISLA_NATAL_DEPARTURE.y - 24;
            portCooldownRef.current = performance.now() + 6000;
            showToast('El oleaje se cerró: seguís en la isla. Volvé a la rompiente.');
          }
        }
      } else if (travelerPhaseRef.current === 'exit' && exitWalkRef.current) {
        // Salida de la cabaña: Pixel cruza la sala caminando hasta la puerta.
        const target = exitWalkRef.current;
        const tx = target.x - player.x;
        const ty = target.y - player.y;
        const dist = Math.hypot(tx, ty);
        if (dist > 1.4) {
          const stepLen = Math.min(dist, 82 * dt);
          const nx = player.x + (tx / dist) * stepLen;
          const ny = player.y + (ty / dist) * stepLen;
          player.x = nx;
          player.y = ny;
          player.facingDir =
            Math.abs(tx) >= Math.abs(ty) ? (tx >= 0 ? 'right' : 'left') : ty >= 0 ? 'down' : 'up';
          player.walking = true;
          player.sprinting = false;
          stepAudioTimer += dt;
          if (stepAudioTimer >= 0.3) {
            stepAudioTimer = 0;
            retroAudio.stepTile(Math.floor(elapsed * 5) % 2 === 0 ? 1 : 2);
          }
        } else {
          player.x = target.x;
          player.y = target.y;
          player.walking = false;
          player.sprinting = false;
          finishCabinExitRef.current();
        }
      } else if (!modalOpen) {
        let dx = 0;
        let dy = 0;
        if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

        if (dx !== 0 || dy !== 0) {
          clickTarget = null;
          const length = Math.hypot(dx, dy);
          dx /= length;
          dy /= length;
        } else if (clickTarget) {
          const tx = clickTarget.x - player.x;
          const ty = clickTarget.y - player.y;
          const dist = Math.hypot(tx, ty);
          if (dist < 8) clickTarget = null;
          else {
            dx = tx / dist;
            dy = ty / dist;
          }
        }

        const sprinting = Boolean(keys['ShiftLeft'] || keys['ShiftRight']);
        const speed = sprinting ? SPRINT_SPEED : WALK_SPEED;
        player.sprinting = sprinting && (dx !== 0 || dy !== 0);
        player.walking = dx !== 0 || dy !== 0;

        if (player.walking) {
          if (Math.abs(dx) >= Math.abs(dy)) {
            player.facingDir = dx >= 0 ? 'right' : 'left';
          } else {
            player.facingDir = dy >= 0 ? 'down' : 'up';
          }

          walkTimer += dt;
          stepAudioTimer += dt * (player.sprinting ? 1.4 : 1);
          if (stepAudioTimer >= 0.36) {
            stepAudioTimer = 0;
            retroAudio.stepTile(Math.floor(walkTimer * 4) % 2 === 0 ? 1 : 2);
          }

          const distance = speed * dt;
          const nextX = player.x + dx * distance;
          const nextY = player.y + dy * distance;
          const canXY = canWalkAt(nextX, nextY);
          const canX = canXY || canWalkAt(nextX, player.y);
          const canY = canXY || canWalkAt(player.x, nextY);

          if (canXY) {
            player.x = nextX;
            player.y = nextY;
          } else if (canX) {
            player.x = nextX;
          } else if (canY) {
            player.y = nextY;
          } else {
            clickTarget = null;
          }
        }
      } else {
        player.walking = false;
        player.sprinting = false;
      }

      // Cámara con seguimiento suave (la partida en tabla ya mueve la cámara)
      const inCabin = cabinRef.current.inside;
      if (!departure) {
        const target = cameraTarget();
        if (inCabin !== wasInCabin) {
          // Al cruzar la puerta la cámara salta al interior (o al porche) sin
          // arrastrarse por todo el mapa.
          wasInCabin = inCabin;
          camera.x = target.x;
          camera.y = target.y;
          prevZoneId = null;
        } else {
          const follow = Math.min(1, dt * 6.5);
          camera.x += (target.x - camera.x) * follow;
          camera.y += (target.y - camera.y) * follow;
        }

        // Zona actual (sólo al aire libre)
        if (!inCabin) {
          const zoneId = islaNatalZoneAt(player.x, player.y);
          if (zoneId !== prevZoneId) {
            stage.showZoneBanner(zoneId, prevZoneId === null);
            prevZoneId = zoneId;
          }
        }
      }

      // El puerto norte ya no arranca solo: la travesía se elige con la opción
      // «SURFEAR HACIA ISLA ORIGEN» cuando la barra está disponible.

      // Intensidad ambiental
      const chargeTarget = stage.arcadeState === 'won' ? 1 : stage.arcadeState === 'powered' ? 0.45 : 0;
      chargeRef.current += (chargeTarget - chargeRef.current) * Math.min(1, dt * 0.7);
      if (signalRef.current > 0) signalRef.current = Math.max(0, signalRef.current - dt * SIGNAL_DECAY);

      // Partículas y ondas
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 26 * dt;
        p.vx *= 1 - 0.9 * dt;
      }
      const waves = shockwavesRef.current;
      for (let i = waves.length - 1; i >= 0; i--) {
        waves[i].t += dt;
        if (waves[i].t >= waves[i].life) waves.splice(i, 1);
      }

      // Objetivo de interacción más cercano
      const pick: { target: NatalPromptTarget | null; score: number } = {
        target: null,
        score: Number.POSITIVE_INFINITY,
      };
      const dirX = player.facingDir === 'left' ? -1 : player.facingDir === 'right' ? 1 : 0;
      const dirY = player.facingDir === 'up' ? -1 : player.facingDir === 'down' ? 1 : 0;
      const consider = (candidate: NatalPromptTarget, radius: number) => {
        const dx = candidate.x - player.x;
        const dy = candidate.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist > radius) return;
        let score = dist;
        if (dist > 0.001) {
          const dot = (dx * dirX + dy * dirY) / dist;
          if (dot < -0.1 && dist > 30) score += 48;
        }
        if (score < pick.score) {
          pick.score = score;
          pick.target = candidate;
        }
      };

      if (!departure) {
        if (inCabin) {
          consider(
            {
              kind: 'cabin-exit',
              id: 'cabin-exit',
              label: 'Salir al porche',
              accentHex: '#fdba74',
              x: ISLA_NATAL_CABIN.door.x,
              y: ISLA_NATAL_CABIN.door.y,
            },
            ISLA_NATAL_CABIN.door.radius
          );
          if (!stage.flagSet.has(NATAL_FLAGS.backpack)) {
            consider(
              {
                kind: 'cabin-backpack',
                id: 'cabin-backpack',
                label: 'Recoger la mochila',
                accentHex: '#f5d9a0',
                x: ISLA_NATAL_CABIN.backpack.x,
                y: ISLA_NATAL_CABIN.backpack.y,
              },
              ISLA_NATAL_CABIN.backpack.radius
            );
          }
          consider(
            {
              kind: 'cabin-chest',
              id: 'cabin-chest',
              label: stage.chestOpened
                ? 'Revisar el cofre'
                : stage.chestCodeKnown
                  ? 'Abrir el cofre'
                  : 'Examinar el cofre',
              accentHex: '#facc15',
              x: ISLA_NATAL_CABIN.chest.x,
              y: ISLA_NATAL_CABIN.chest.y,
            },
            ISLA_NATAL_CABIN.chest.radius
          );
          consider(
            {
              kind: 'cabin-radio',
              id: 'cabin-radio',
              label: 'Examinar la radio',
              accentHex: '#67e8f9',
              x: ISLA_NATAL_CABIN.radio.x,
              y: ISLA_NATAL_CABIN.radio.y,
            },
            ISLA_NATAL_CABIN.radio.radius
          );
        } else {
          for (const poi of ISLA_NATAL_POIS) {
            consider(
              {
                kind: 'poi',
                id: poi.id,
                label: poi.label,
                accentHex: poi.accentHex,
                x: poi.x,
                y: poi.y,
              },
              poi.radius
            );
          }
          consider(arcadeTarget, ISLA_NATAL_ARCADE_ANCHOR.radius);
          if (stage.paddleOnGround) consider(paddleTarget, ISLA_NATAL_PADDLE_ANCHOR.radius);
          // Puerto Norte: con la Barra de Pong disponible, la opción de surfear
          // aparece de forma explícita. Sin la barra, sólo se puede asomarse.
          departureTarget.label = stage.departureReady
            ? 'Surfear hacia Isla Origen'
            : 'Asomarse al puerto norte';
          consider(departureTarget, ISLA_NATAL_DEPARTURE.radius);
        }
      }
      const best = pick.target;
      promptRef.current = best;

      let promptSpec: IslaNatalPromptSpec | null = null;
      if (best && !modalOpen) {
        promptSpec = {
          x: best.x,
          y: best.y,
          label: best.label,
          accentHex: best.accentHex,
        };
      }

      try {
        const zoom = sceneZoom();
        const playerRender = {
          x: player.x,
          y: player.y,
          facingDir: player.facingDir,
          walking: player.walking,
          sprinting: player.sprinting,
          interactAnim: player.interactAnim,
          ridingPaddle: player.ridingPaddle,
          rideTilt: player.rideTilt,
        };
        ctx.save();
        ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0);
        if (cabinRef.current.inside) {
          const phaseNow = travelerPhaseRef.current;
          const phaseElapsed = Math.max(0, (now - travelerStartRef.current) / 1000);
          const stormNow = phaseNow === 'storm' ? { t: phaseElapsed } : null;
          const radioStaticNow = phaseNow === 'radio-static' ? { t: phaseElapsed } : null;
          renderIslaNatalCabin({
            ctx,
            vw: viewW(),
            vh: viewH(),
            camera,
            elapsed,
            reducedMotion,
            player: playerRender,
            skinColor: stage.skinColor,
            hairColor: stage.hairColor,
            shirtColor: stage.shirtColor,
            appearance: stage.appearance,
            prompt: promptSpec,
            backpackOnHook: !stage.flagSet.has(NATAL_FLAGS.backpack),
            chestOpened: stage.chestOpened,
            radioOn: phaseNow === 'radio',
            radioStatic: radioStaticNow,
            storm: stormNow,
          });
        } else {
          const travelerPhaseNow = travelerPhaseRef.current;
          const travelerEvent =
            travelerPhaseNow === 'arrival' ||
            travelerPhaseNow === 'descend' ||
            travelerPhaseNow === 'talk' ||
            travelerPhaseNow === 'board' ||
            travelerPhaseNow === 'departure'
              ? {
                  phase: travelerPhaseNow,
                  t: Math.max(0, (now - travelerStartRef.current) / 1000),
                }
              : null;
          renderIslaNatalFrame({
            ctx,
            vw: viewW(),
            vh: viewH(),
            camera,
            elapsed,
            reducedMotion,
            player: playerRender,
            skinColor: stage.skinColor,
            hairColor: stage.hairColor,
            shirtColor: stage.shirtColor,
            appearance: stage.appearance,
            arcadeState: stage.arcadeState,
            charge: chargeRef.current,
            signalPulse: signalRef.current,
            paddleOnGround: stage.paddleOnGround,
            departureReady: stage.departureReady,
            particles,
            prompt: promptSpec,
            shockwaves: waves,
            travelerEvent,
          });
        }
        ctx.restore();
        renderFaultRef.current = 0;
      } catch (error) {
        try {
          ctx.restore();
        } catch {
          /* la pila de canvas ya estaba limpia */
        }
        renderFaultRef.current += 1;
        if (renderFaultRef.current === 4) {
          console.error('[PIXELVERSE] El render de Isla Natal falló:', error);
          setRenderFault(true);
        }
      }
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onPointerDown);
      motionQuery.removeEventListener('change', onMotionChange);
    };
  }, [keybindings]);

  /* -------------------------------------------------------------- */
  /* INTERFAZ                                                        */
  /* -------------------------------------------------------------- */

  const toneClass =
    dialogModal?.tone === 'arcane'
      ? 'dialogue-arcane'
      : dialogModal?.tone === 'stone'
        ? 'dialogue-stone'
        : 'dialogue-wood';
  const comicConversation = Boolean(dialogueLines && dialogueLine);
  const comicSpeaker = dialogueLine?.speaker ?? 'pixel';
  const comicTextDone = dialogueVisibleChars >= dialogueFullText.length;
  const comicIsLast = dialogueLines
    ? dialogueLineIndex >= dialogueLines.length - 1
    : false;

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#020614]">
      <canvas ref={canvasRef} className="crisp-arcade-canvas block w-full h-full cursor-crosshair" />

      {/* Fundido del umbral: Pixel ya caminó hasta la puerta. */}
      {cabinFade && <div className="cabin-door-fade pointer-events-none fixed inset-0 z-30 bg-[#020614]" />}

      {/* Rótulo de zona */}
      {zoneBanner && (
        <div className="pointer-events-none absolute inset-x-0 top-[9%] z-20 flex justify-center px-4">
          <div
            className="glass-hud px-5 py-2.5 text-center"
            style={{ borderColor: `${zoneBanner.accentHex}88` }}
          >
            <p
              className="font-mono text-[13px] sm:text-base font-bold tracking-[0.22em] uppercase"
              style={{ color: zoneBanner.accentHex }}
            >
              {zoneBanner.name}
            </p>
            <p className="font-mono text-[10px] sm:text-[11px] text-slate-300 mt-0.5">
              {zoneBanner.subtitle}
            </p>
          </div>
        </div>
      )}

      {/* Subtítulo cinematográfico integrado para la secuencia inicial en la casa */}
      {introCaption && !dialogModal && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[7%] z-30 flex justify-center px-4">
          <div
            className={`glass-hud max-w-xl px-5 py-3 text-center border ${
              introCaption.tone === 'radio'
                ? 'border-amber-300/45'
                : introCaption.tone === 'static'
                  ? 'border-cyan-300/55'
                  : 'border-rose-400/55'
            }`}
          >
            <p
              className={`font-mono text-[10px] font-bold tracking-[0.22em] uppercase ${
                introCaption.tone === 'radio'
                  ? 'text-amber-200'
                  : introCaption.tone === 'static'
                    ? 'text-cyan-200'
                    : 'text-rose-200'
              }`}
            >
              {introCaption.label}
            </p>
            <p className="mt-1 font-mono text-xs sm:text-sm leading-relaxed text-slate-100">
              {introCaption.text}
            </p>
          </div>
        </div>
      )}

      {/* Aviso flotante */}
      {toast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[13%] z-20 flex justify-center px-4">
          <p className="glass-hud px-4 py-2 font-mono text-[11px] sm:text-xs text-cyan-100 tracking-wide">
            {toast}
          </p>
        </div>
      )}

      {/* Diálogo */}
      {dialogModal && comicConversation && dialogueLine && (
        <div className="comic-dialogue-layer fixed inset-0 z-40 flex flex-col justify-end px-3 pb-5 sm:px-8 sm:pb-8 pointer-events-none">
          <div
            className={`flex w-full ${
              comicSpeaker === 'pixel' ? 'justify-start' : 'justify-end'
            }`}
          >
            <div
              className={`comic-bubble comic-bubble-${comicSpeaker} pointer-events-auto`}
              role="button"
              tabIndex={0}
              onClick={() => advanceDialogueRef.current()}
              onKeyDown={(event) => {
                if (event.code === 'Enter' || event.code === 'Space') {
                  event.preventDefault();
                  advanceDialogueRef.current();
                }
              }}
            >
              <div className="comic-speaker-tag">
                <span className="comic-speaker-dot" />
                {comicSpeaker === 'pixel' ? 'PIXEL' : 'EL VIAJERO'}
              </div>
              <p className="comic-text">
                {dialogueLine.text.slice(0, dialogueVisibleChars)}
                {!comicTextDone && <span className="comic-caret" aria-hidden="true" />}
              </p>
              {comicTextDone && (
                <span
                  className={`comic-next ${comicIsLast ? 'comic-next-final' : ''}`}
                  aria-hidden="true"
                >
                  ▼
                </span>
              )}
            </div>
          </div>
          <p className="comic-hint">
            CLIC / [E] · {comicIsLast ? 'CONTINUAR' : 'SIGUIENTE'}
          </p>
        </div>
      )}

      {dialogModal && !comicConversation && (
        <div className="dialogue-backdrop fixed inset-0 z-40 flex items-end sm:items-center justify-center p-3 sm:p-5">
          <div
            className={`dialogue-frame ${toneClass} rounded-none w-full max-w-xl p-4 sm:p-6 space-y-3 relative max-h-[92vh] overflow-y-auto`}
          >
            <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-white/30 pb-2.5">
              <div>
                <p className="dialogue-kicker text-[10px] font-mono tracking-widest uppercase">
                  {dialogModal.category}
                </p>
                <h3 className="dialogue-speaker font-mono text-base sm:text-lg font-bold mt-0.5">
                  {dialogModal.dialog.title}
                </h3>
                {dialogModal.dialog.subtitle && (
                  <p className="text-[11px] font-mono text-[#7dd3fc] mt-1">
                    {dialogModal.dialog.subtitle}
                  </p>
                )}
              </div>
              {!dialogModal.lockClose && (
                <button
                  type="button"
                  onClick={() => setDialogModal(null)}
                  aria-label="Cerrar diálogo"
                  className="text-white hover:text-amber-300 cursor-pointer p-1 font-mono font-bold"
                >
                  [X]
                </button>
              )}
            </div>

            <div
              className={`dialogue-copy space-y-2 text-xs sm:text-sm font-mono leading-relaxed ${
                dialogueVisibleChars >= dialogueFullText.length ? 'dialogue-complete' : ''
              }`}
              onClick={() => setDialogueVisibleChars(dialogueFullText.length)}
            >
              {dialogModal.dialog.paragraphs.map((paragraph, index) => {
                const start = dialogModal.dialog.paragraphs
                  .slice(0, index)
                  .reduce((total, previous) => total + previous.length + 2, 0);
                return <p key={index}>{paragraph.slice(0, Math.max(0, dialogueVisibleChars - start))}</p>;
              })}
            </div>

            {dialogModal.dialog.hint && (
              <p className="pt-2 border-t border-white/20 text-[11px] text-amber-200 font-mono">
                {dialogModal.dialog.hint}
              </p>
            )}

            <div className="flex flex-wrap justify-end items-center gap-2 pt-2">
              <span className="mr-auto font-mono text-[10px] text-slate-400 tracking-widest">
                [ENTER] CONTINUAR
              </span>
              {dialogModal.primary && (
                <button
                  type="button"
                  onClick={dialogModal.primary.run}
                  className="dialogue-action px-4 py-1.5 font-mono font-bold text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0"
                >
                  {dialogModal.primary.label}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cerradura del cofre: la combinación que entregó el enviado del futuro */}
      {chestCodeOpen && (
        <div className="dialogue-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitChestCode();
            }}
            className="dialogue-frame dialogue-wood rounded-none w-full max-w-md p-4 sm:p-6 space-y-4 relative"
          >
            <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-white/30 pb-2.5">
              <div>
                <p className="dialogue-kicker text-[10px] font-mono tracking-widest uppercase">
                  Pradera de Casa · Cerradura de latón
                </p>
                <h3 className="dialogue-speaker font-mono text-base sm:text-lg font-bold mt-0.5">
                  El cofre del abuelo
                </h3>
                <p className="text-[11px] font-mono text-[#7dd3fc] mt-1">
                  Cuatro discos numerados · Código recibido: {ISLA_NATAL_CHEST_CODE}
                </p>
              </div>
              <button
                type="button"
                onClick={closeChestCode}
                aria-label="Cerrar la cerradura"
                className="text-white hover:text-amber-300 cursor-pointer p-1 font-mono font-bold"
              >
                [X]
              </button>
            </div>

            <p className="text-xs sm:text-sm font-mono leading-relaxed text-amber-100/90">
              Los discos giran con un chasquido seco. Introducí el código que te entregó el enviado
              del futuro ({ISLA_NATAL_CHEST_CODE}) para abrir el cofre de tu abuelo.
            </p>

            <label className="block">
              <span className="block text-[10px] font-mono tracking-[0.3em] text-amber-200/80 mb-1.5">
                COMBINACIÓN
              </span>
              <input
                autoFocus
                value={chestCode}
                onChange={(event) => {
                  setChestCode(event.target.value.replace(/\D/g, '').slice(0, 4));
                  setChestCodeError(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    closeChestCode();
                  }
                }}
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                aria-label="Combinación del cofre"
                placeholder="····"
                className="w-full bg-black/35 border-2 border-amber-300/40 px-3 py-3 text-center font-mono text-3xl tracking-[0.45em] text-amber-100 outline-none focus:border-amber-200"
                style={{ caretColor: '#fde68a' }}
              />
            </label>

            {chestCodeError && (
              <p role="alert" className="text-[11px] font-mono text-red-300">
                La cerradura no cede. Esa no es la combinación.
              </p>
            )}

            <div className="flex flex-wrap justify-end items-center gap-2 pt-1">
              <span className="mr-auto font-mono text-[10px] text-slate-400 tracking-widest">
                [ENTER] ABRIR · [ESC] SALIR
              </span>
              <button
                type="button"
                onClick={closeChestCode}
                className="px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-slate-300 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={chestCode.length < 4}
                className="dialogue-action px-4 py-1.5 font-mono font-bold text-xs uppercase tracking-wider cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Abrir cofre
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vista lejana desde el mirador del Alto de las Rocas */}
      {vistaOpen && <IslaNatalVista onClose={closeVista} />}

      {/* Reto de Pong dentro del cobertizo */}
      {challengeOpen && (
        <IslaNatalPongChallenge
          onVictory={handleChallengeVictory}
          onQuit={handleChallengeQuit}
        />
      )}

      {/* Destello de la partida: pulso breve, nunca una pantalla blanca fija */}
      <div
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          opacity: departureFlash ? 1 : 0,
          background:
            'radial-gradient(circle at 50% 50%, #ffffff 0%, #e0faff 26%, rgba(2, 6, 20, 0) 72%)',
        }}
        aria-hidden
      />

      {renderFault && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#020614]/95 p-6">
          <div className="glass-hud max-w-md space-y-3 p-5 text-center">
            <p className="font-mono text-sm font-bold text-cyan-100">
              El oleaje se cortó un instante
            </p>
            <p className="font-mono text-xs text-slate-300">
              Tu partida sigue intacta. Podés seguir explorando la isla o zarpar en la Barra de
              Pong.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="btn-ui cursor-pointer rounded px-4 py-2 text-xs font-bold"
                onClick={() => {
                  renderFaultRef.current = 0;
                  setRenderFault(false);
                }}
              >
                Seguir en la isla
              </button>
              <button
                type="button"
                className="cursor-pointer rounded border border-cyan-300/40 bg-cyan-500/20 px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/30"
                onClick={() => {
                  try {
                    markFlag(NATAL_FLAGS.departed);
                    onDepartToOrigin();
                  } catch (error) {
                    console.error('[PIXELVERSE] Transición de emergencia fallida:', error);
                    setRenderFault(false);
                  }
                }}
              >
                Ir a la Isla del Origen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IslaNatalStage;
