import {
  AlertTriangle,
  KeyRound,
  Lock,
  Play,
  RotateCcw,
  Settings,
} from 'lucide-react';
import './menu.css';

const MEMORY_MOTES = [
  { left: '8%', top: '63%', size: 3, delay: -1.2, duration: 10.5 },
  { left: '14%', top: '78%', size: 2, delay: -6.4, duration: 13.2 },
  { left: '23%', top: '55%', size: 2, delay: -3.1, duration: 11.8 },
  { left: '31%', top: '82%', size: 3, delay: -8.7, duration: 15.4 },
  { left: '39%', top: '68%', size: 2, delay: -4.5, duration: 12.6 },
  { left: '47%', top: '86%', size: 2, delay: -9.8, duration: 14.1 },
  { left: '54%', top: '72%', size: 3, delay: -2.7, duration: 11.2 },
  { left: '61%', top: '58%', size: 2, delay: -7.3, duration: 13.8 },
  { left: '69%', top: '80%', size: 2, delay: -5.6, duration: 12.3 },
  { left: '77%', top: '66%', size: 3, delay: -10.4, duration: 15.1 },
  { left: '85%', top: '76%', size: 2, delay: -3.9, duration: 11.5 },
  { left: '92%', top: '61%', size: 2, delay: -8.1, duration: 13.4 },
  { left: '18%', top: '42%', size: 2, delay: -0.8, duration: 9.8 },
  { left: '73%', top: '38%', size: 2, delay: -6.9, duration: 10.9 },
];

interface MainMenuProps {
  hasSavedProgress: boolean;
  savedAtLabel: string | null;
  codeGlitchEffect: boolean;
  codeRevealed: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onOptions: () => void;
  onCode: () => void;
}

export function MainMenu({
  hasSavedProgress,
  savedAtLabel,
  codeGlitchEffect,
  codeRevealed,
  onNewGame,
  onContinue,
  onOptions,
  onCode,
}: MainMenuProps) {
  return (
    <>
      <div className="menu-backdrop" aria-hidden="true">
        <div className="menu-backdrop__blur">
          <img
            src="/assets/pixelverse/menu-island.png"
            alt=""
            className="select-none pointer-events-none"
            draggable={false}
          />
        </div>
        <img
          src="/assets/pixelverse/menu-island.png"
          alt=""
          className="menu-backdrop__image select-none pointer-events-none"
          draggable={false}
        />
        <div className="menu-backdrop__shade" />
        <div className="menu-backdrop__horizon" />
        <div className="menu-motes">
          {MEMORY_MOTES.map((mote, index) => (
            <span
              key={index}
              className="menu-mote"
              style={{
                left: mote.left,
                top: mote.top,
                width: `${mote.size}px`,
                height: `${mote.size}px`,
                animationDelay: `${mote.delay}s`,
                animationDuration: `${mote.duration}s`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="menu-stage">
        <div className="menu-spacer" aria-hidden="true" />

        <div className="menu-actions">
          <div
            className={`menu-save-state ${
              hasSavedProgress ? 'is-ready' : 'is-empty'
            }`}
            role="status"
          >
            <span className="menu-save-state__dot" aria-hidden="true" />
            <span>
              {hasSavedProgress ? 'PARTIDA GUARDADA' : 'SIN PARTIDA GUARDADA'}
            </span>
            {hasSavedProgress && savedAtLabel && (
              <span className="menu-save-state__time">{savedAtLabel}</span>
            )}
          </div>

          <div className="menu-action-row">
            <button
              id="btn-start"
              type="button"
              onClick={onNewGame}
              className="menu-action menu-action--primary"
            >
              <span className="menu-action__index" aria-hidden="true">
                01
              </span>
              <span className="menu-action__copy">
                <span className="menu-action__label">NUEVA PARTIDA</span>
                <span className="menu-action__hint">
                  Comenzar desde el origen
                </span>
              </span>
              <Play
                className="menu-action__icon"
                strokeWidth={2.4}
                aria-hidden="true"
              />
            </button>

            <button
              id="btn-continue"
              type="button"
              onClick={onContinue}
              disabled={!hasSavedProgress}
              aria-disabled={!hasSavedProgress}
              title={
                hasSavedProgress
                  ? 'Continuar desde la última partida guardada'
                  : 'No hay una partida guardada válida'
              }
              className={`menu-action menu-action--secondary ${
                hasSavedProgress ? '' : 'is-disabled'
              }`}
            >
              <span className="menu-action__index" aria-hidden="true">
                02
              </span>
              <span className="menu-action__copy">
                <span className="menu-action__label">CONTINUAR</span>
                <span className="menu-action__hint">
                  {hasSavedProgress
                    ? 'Retomar tu aventura'
                    : 'Sin partida disponible'}
                </span>
              </span>
              {hasSavedProgress ? (
                <RotateCcw
                  className="menu-action__icon"
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              ) : (
                <Lock
                  className="menu-action__icon"
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
              )}
            </button>

            <button
              id="btn-title-options"
              type="button"
              onClick={onOptions}
              className="menu-action menu-action--tertiary"
            >
              <span className="menu-action__index" aria-hidden="true">
                03
              </span>
              <span className="menu-action__copy">
                <span className="menu-action__label">OPCIONES</span>
                <span className="menu-action__hint">
                  Audio, controles y guardado
                </span>
              </span>
              <Settings
                className="menu-action__icon"
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </button>
          </div>

          {codeRevealed && (
            <button
              id="btn-code-modal"
              type="button"
              onClick={onCode}
              className={`menu-code ${codeGlitchEffect ? 'is-glitching' : ''}`}
            >
              <KeyRound
                className="menu-code__icon"
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="menu-code__label">CODE</span>
              <span className="menu-code__hint">ACCESO ESPECIAL</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export function NewGameConfirmDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-game-confirm-title"
      aria-describedby="new-game-confirm-body"
      className="menu-confirm-layer"
      onClick={onCancel}
    >
      <div className="menu-confirm" onClick={(event) => event.stopPropagation()}>
        <div className="menu-confirm__icon" aria-hidden="true">
          <AlertTriangle strokeWidth={1.8} />
        </div>
        <p className="menu-confirm__eyebrow">ARCHIVO DE MEMORIA</p>
        <h2 id="new-game-confirm-title" className="menu-confirm__title">
          ¿INICIAR UNA NUEVA PARTIDA?
        </h2>
        <p id="new-game-confirm-body" className="menu-confirm__body">
          La partida guardada se sobrescribirá. Se perderán los diamantes,
          memorias, cofres y avances de la isla. Esta acción no se puede
          deshacer.
        </p>
        <div className="menu-confirm__actions">
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="menu-confirm__button menu-confirm__button--cancel"
          >
            CANCELAR
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="menu-confirm__button menu-confirm__button--confirm"
          >
            SÍ, EMPEZAR DE NUEVO
          </button>
        </div>
      </div>
    </div>
  );
}
