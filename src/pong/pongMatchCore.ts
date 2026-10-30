/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Núcleo compartido de PONG (Atari · 1972).
 *
 * Toda la física y las reglas del gabinete histórico viven aquí: meta de 3 goles,
 * paletas de 10×80, rebote con ángulo según el punto de impacto, aceleración
 * progresiva de la pelota y la misma IA de seguimiento. Lo usan por igual el
 * gabinete del Santuario Pong de la Isla del Origen y la vieja máquina regalada
 * de la Isla Natal, de modo que ambos encuentros son literalmente el mismo juego.
 */

export const PONG_TARGET_GOALS = 3;
export const PONG_RALLY_POINTS = 100;
export const PONG_GOAL_POINTS = 350;

export interface PongCourtSpec {
  width: number;
  height: number;
  paddleW: number;
  paddleH: number;
  ballSize: number;
  /** Margen superior/inferior donde la pelota rebota. */
  wallMargin: number;
  /** Margen de recorrido vertical de las paletas. */
  paddleTravelMargin: number;
  /** Separación horizontal de la paleta respecto a cada borde. */
  paddleInset: number;
  playerSpeed: number;
  aiSpeed: number;
  aiTrackGain: number;
  aiDeadZone: number;
  serveSpeedX: number;
  serveSpeedYMin: number;
  serveSpeedYSpan: number;
  serveDelay: number;
  maxBallSpeedX: number;
  playerBounceVy: number;
  aiBounceVy: number;
  playerSpeedUp: number;
  aiSpeedUp: number;
}

/** Pista de 600×400 del gabinete original: valores inmutables de la partida histórica. */
export const PONG_CABINET_COURT: PongCourtSpec = {
  width: 600,
  height: 400,
  paddleW: 10,
  paddleH: 80,
  ballSize: 10,
  wallMargin: 8,
  paddleTravelMargin: 10,
  paddleInset: 20,
  playerSpeed: 350,
  aiSpeed: 225,
  aiTrackGain: 4.2,
  aiDeadZone: 8,
  serveSpeedX: 295,
  serveSpeedYMin: 140,
  serveSpeedYSpan: 90,
  serveDelay: 0.6,
  maxBallSpeedX: 460,
  playerBounceVy: 280,
  aiBounceVy: 270,
  playerSpeedUp: 1.07,
  aiSpeedUp: 1.05,
};

export interface PongSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export interface PongPopup {
  x: number;
  y: number;
  text: string;
  life: number;
}

export interface PongMatchState {
  p1Y: number;
  p2Y: number;
  ballX: number;
  ballY: number;
  ballVx: number;
  ballVy: number;
  score1: number;
  score2: number;
  arcadePoints: number;
  rallies: number;
  serveDelay: number;
  ended: boolean;
  winner: 'player' | 'ai' | null;
  ballTrail: { x: number; y: number }[];
  sparks: PongSpark[];
  popups: PongPopup[];
}

export type PongMatchEvent =
  | { type: 'wall' }
  | { type: 'paddle'; side: 'player' | 'ai' }
  | { type: 'goal'; side: 'player' | 'ai'; score1: number; score2: number }
  | { type: 'matchWon'; arcadePoints: number }
  | { type: 'matchLost' };

export interface PongInput {
  up: boolean;
  down: boolean;
}

export interface PongStepOptions {
  /** 1.0 = IA del gabinete histórico; valores menores la vuelven más asequible. */
  aiSpeedScale?: number;
}

export function playerPaddleX(court: PongCourtSpec): number {
  return court.paddleInset;
}

export function aiPaddleX(court: PongCourtSpec): number {
  return court.width - court.paddleInset - court.paddleW;
}

function serveBall(state: PongMatchState, court: PongCourtSpec, towardAi: boolean): void {
  state.ballX = court.width / 2 - court.ballSize / 2;
  state.ballY = court.height / 2 - court.ballSize / 2;
  state.ballVx = towardAi ? court.serveSpeedX : -court.serveSpeedX;
  state.ballVy =
    (Math.random() > 0.5 ? 1 : -1) *
    (court.serveSpeedYMin + Math.random() * court.serveSpeedYSpan);
  state.ballTrail.length = 0;
  state.serveDelay = court.serveDelay;
}

export function createPongMatch(
  court: PongCourtSpec = PONG_CABINET_COURT,
  serveTowardAi = true
): PongMatchState {
  const state: PongMatchState = {
    p1Y: court.height / 2 - court.paddleH / 2,
    p2Y: court.height / 2 - court.paddleH / 2,
    ballX: court.width / 2,
    ballY: court.height / 2,
    ballVx: court.serveSpeedX,
    ballVy: 0,
    score1: 0,
    score2: 0,
    arcadePoints: 0,
    rallies: 0,
    serveDelay: court.serveDelay,
    ended: false,
    winner: null,
    ballTrail: [],
    sparks: [],
    popups: [],
  };
  serveBall(state, court, serveTowardAi);
  return state;
}

export function spawnPongSparks(
  state: PongMatchState,
  x: number,
  y: number,
  count = 10
): void {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 50 + Math.random() * 115;
    state.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.36 });
  }
}

/** Integra chispas y rótulos flotantes; se llama incluso durante las cinemáticas. */
export function updatePongEffects(state: PongMatchState, dt: number): void {
  for (let i = state.sparks.length - 1; i >= 0; i--) {
    const sp = state.sparks[i];
    sp.x += sp.vx * dt;
    sp.y += sp.vy * dt;
    sp.life -= dt;
    if (sp.life <= 0) state.sparks.splice(i, 1);
  }
  for (let i = state.popups.length - 1; i >= 0; i--) {
    const pop = state.popups[i];
    pop.y -= 24 * dt;
    pop.life -= dt;
    if (pop.life <= 0) state.popups.splice(i, 1);
  }
}

/**
 * Avanza un fotograma de la partida. Devuelve los sucesos ocurridos para que cada
 * consumidor decida su audio y su puesta en escena.
 */
export function stepPongMatch(
  state: PongMatchState,
  court: PongCourtSpec,
  dt: number,
  input: PongInput,
  options: PongStepOptions = {}
): PongMatchEvent[] {
  const events: PongMatchEvent[] = [];
  if (state.ended) return events;

  const { paddleH, ballSize, height, width } = court;
  const minY = court.paddleTravelMargin;
  const maxY = height - paddleH - court.paddleTravelMargin;

  if (input.up) state.p1Y -= court.playerSpeed * dt;
  if (input.down) state.p1Y += court.playerSpeed * dt;
  state.p1Y = Math.max(minY, Math.min(maxY, state.p1Y));

  const aiScale = options.aiSpeedScale ?? 1;
  const aiCenter = state.p2Y + paddleH / 2;
  const targetY = state.ballVx > 0 ? state.ballY + ballSize / 2 : height / 2;
  const diff = targetY - aiCenter;
  const aiSpeed = court.aiSpeed * aiScale;
  if (Math.abs(diff) > court.aiDeadZone) {
    state.p2Y +=
      Math.sign(diff) * Math.min(Math.abs(diff) * court.aiTrackGain, aiSpeed) * dt;
  }
  state.p2Y = Math.max(minY, Math.min(maxY, state.p2Y));

  if (state.serveDelay > 0) {
    state.serveDelay -= dt;
    return events;
  }

  state.ballTrail.push({ x: state.ballX, y: state.ballY });
  if (state.ballTrail.length > 8) state.ballTrail.shift();

  state.ballX += state.ballVx * dt;
  state.ballY += state.ballVy * dt;

  if (state.ballY <= court.wallMargin) {
    state.ballY = court.wallMargin;
    state.ballVy = Math.abs(state.ballVy);
    events.push({ type: 'wall' });
    spawnPongSparks(state, state.ballX, state.ballY);
  } else if (state.ballY + ballSize >= height - court.wallMargin) {
    state.ballY = height - court.wallMargin - ballSize;
    state.ballVy = -Math.abs(state.ballVy);
    events.push({ type: 'wall' });
    spawnPongSparks(state, state.ballX, state.ballY);
  }

  const p1x = playerPaddleX(court);
  if (
    state.ballVx < 0 &&
    state.ballX <= p1x + court.paddleW &&
    state.ballX + ballSize >= p1x &&
    state.ballY + ballSize >= state.p1Y &&
    state.ballY <= state.p1Y + paddleH
  ) {
    state.ballX = p1x + court.paddleW;
    const offset = (state.ballY + ballSize / 2 - (state.p1Y + paddleH / 2)) / (paddleH / 2);
    state.ballVx = Math.min(court.maxBallSpeedX, Math.abs(state.ballVx) * court.playerSpeedUp);
    state.ballVy = offset * court.playerBounceVy;
    state.arcadePoints += PONG_RALLY_POINTS;
    state.rallies += 1;
    events.push({ type: 'paddle', side: 'player' });
    spawnPongSparks(state, p1x + court.paddleW, state.ballY + ballSize / 2);
    state.popups.push({
      x: 64,
      y: Math.max(48, state.ballY),
      text: `+${PONG_RALLY_POINTS}`,
      life: 0.75,
    });
  }

  const p2x = aiPaddleX(court);
  if (
    state.ballVx > 0 &&
    state.ballX + ballSize >= p2x &&
    state.ballX <= p2x + court.paddleW &&
    state.ballY + ballSize >= state.p2Y &&
    state.ballY <= state.p2Y + paddleH
  ) {
    state.ballX = p2x - ballSize;
    const offset = (state.ballY + ballSize / 2 - (state.p2Y + paddleH / 2)) / (paddleH / 2);
    state.ballVx = -Math.min(court.maxBallSpeedX, Math.abs(state.ballVx) * court.aiSpeedUp);
    state.ballVy = offset * court.aiBounceVy;
    events.push({ type: 'paddle', side: 'ai' });
    spawnPongSparks(state, p2x, state.ballY + ballSize / 2);
  }

  if (state.ballX > width) {
    state.score1 += 1;
    state.arcadePoints += PONG_GOAL_POINTS;
    events.push({ type: 'goal', side: 'player', score1: state.score1, score2: state.score2 });
    state.popups.push({
      x: width - 110,
      y: height * 0.45,
      text: `GOL! (${state.score1}/${PONG_TARGET_GOALS})`,
      life: 0.9,
    });
    if (state.score1 >= PONG_TARGET_GOALS) {
      state.ended = true;
      state.winner = 'player';
      events.push({ type: 'matchWon', arcadePoints: state.arcadePoints });
    } else {
      serveBall(state, court, false);
    }
    return events;
  }

  if (state.ballX + ballSize < 0) {
    state.score2 += 1;
    events.push({ type: 'goal', side: 'ai', score1: state.score1, score2: state.score2 });
    state.popups.push({
      x: 110,
      y: height * 0.45,
      text: `GOL IA (${state.score2}/${PONG_TARGET_GOALS})`,
      life: 0.9,
    });
    if (state.score2 >= PONG_TARGET_GOALS) {
      state.ended = true;
      state.winner = 'ai';
      events.push({ type: 'matchLost' });
    } else {
      serveBall(state, court, true);
    }
    return events;
  }

  return events;
}
