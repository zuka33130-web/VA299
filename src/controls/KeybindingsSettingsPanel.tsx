/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PANEL DE CONFIGURACIÓN Y REASIGNACIÓN DE TECLAS RPG:
 * Interfaz intuitiva para personalizar las teclas del juego con detección de conflictos.
 */

import React, { useEffect, useState } from 'react';
import { Keyboard, RotateCcw, AlertTriangle, Check, X } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import {
  ACTION_SPECS,
  ActionSpec,
  findKeyConflict,
  getFriendlyActionLabel,
  KeybindingsMap,
  loadKeybindings,
  resetKeybindings,
  RpgActionId,
  saveKeybindings,
} from './keybindings';

export function KeybindingsSettingsPanel({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const [bindings, setBindings] = useState<KeybindingsMap>(() => loadKeybindings());
  const [listeningActionId, setListeningActionId] = useState<RpgActionId | null>(null);
  const [conflictNotice, setConflictNotice] = useState<{
    targetActionId: RpgActionId;
    conflictingSpec: ActionSpec;
    newCode: string;
  } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (!listeningActionId) return;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const code = e.code || e.key;
      if (code === 'Escape') {
        setListeningActionId(null);
        setConflictNotice(null);
        return;
      }

      const conflict = findKeyConflict(code, listeningActionId, bindings);
      if (conflict) {
        setConflictNotice({
          targetActionId: listeningActionId,
          conflictingSpec: conflict,
          newCode: code,
        });
        setListeningActionId(null);
        retroAudio.npcBlip(0.75);
        return;
      }

      // Sin conflicto: asignar directamente
      const next: KeybindingsMap = {
        ...bindings,
        [listeningActionId]: [code],
      };
      setBindings(next);
      saveKeybindings(next);
      setListeningActionId(null);
      setConflictNotice(null);
      retroAudio.uiClick();
      showSuccess('Tecla reasignada correctamente');
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [listeningActionId, bindings]);

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    window.setTimeout(() => setSuccessToast((prev) => (prev === msg ? null : prev)), 2500);
  };

  const handleResolveConflictSwap = () => {
    if (!conflictNotice) return;
    const { targetActionId, conflictingSpec, newCode } = conflictNotice;
    const oldTargetCodes = bindings[targetActionId] || [];

    const next: KeybindingsMap = {
      ...bindings,
      [targetActionId]: [newCode],
      [conflictingSpec.id]: oldTargetCodes.length > 0 ? oldTargetCodes : conflictingSpec.defaultCodes,
    };

    setBindings(next);
    saveKeybindings(next);
    setConflictNotice(null);
    retroAudio.uiClick();
    showSuccess(`Teclas intercambiadas entre ambas acciones`);
  };

  const handleResolveConflictOverwrite = () => {
    if (!conflictNotice) return;
    const { targetActionId, newCode } = conflictNotice;

    const next: KeybindingsMap = {
      ...bindings,
      [targetActionId]: [newCode],
    };

    setBindings(next);
    saveKeybindings(next);
    setConflictNotice(null);
    retroAudio.uiClick();
    showSuccess(`Tecla asignada a la acción seleccionada`);
  };

  const handleResetDefaults = () => {
    retroAudio.uiClick();
    const defaults = resetKeybindings();
    setBindings(defaults);
    setListeningActionId(null);
    setConflictNotice(null);
    showSuccess('Teclas restauradas a los valores por defecto');
  };

  const categories = Array.from(new Set(ACTION_SPECS.map((s) => s.category))) as ActionSpec['category'][];

  return (
    <div className={`settings-keypanel ${embedded ? 'is-embedded' : ''}`}>
      <div className="settings-keypanel__top">
        {!embedded && (
          <div className="settings-keypanel__title">
            <Keyboard className="w-4 h-4" />
            <span>Configuración de Controles y Teclas</span>
          </div>
        )}
        <button
          type="button"
          onClick={handleResetDefaults}
          className="settings-keypanel__reset"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restaurar predeterminados</span>
        </button>
      </div>

      {/* Aviso de Reasignación activa */}
      {listeningActionId && (
        <div className="settings-keyalert settings-keyalert--listen">
          <p className="settings-keyalert__title">
            ¡PRESIONA LA NUEVA TECLA PARA «
            {ACTION_SPECS.find((s) => s.id === listeningActionId)?.label}»!
          </p>
          <p className="settings-keyalert__hint">
            Presiona [ESC] para cancelar la reasignación.
          </p>
        </div>
      )}

      {/* Alerta de Conflicto de Teclas */}
      {conflictNotice && (
        <div className="settings-keyalert settings-keyalert--conflict">
          <div className="settings-keyalert__head">
            <AlertTriangle className="w-4 h-4" />
            <span>Conflicto detectado de tecla</span>
          </div>
          <p className="settings-keyalert__body">
            La tecla <strong>[{conflictNotice.newCode}]</strong> ya está asignada a la
            acción <strong>«{conflictNotice.conflictingSpec.label}»</strong>.
          </p>
          <div className="settings-keyalert__actions">
            <button
              type="button"
              onClick={handleResolveConflictSwap}
              className="settings-keyalert__btn settings-keyalert__btn--cyan"
            >
              Intercambiar teclas
            </button>
            <button
              type="button"
              onClick={handleResolveConflictOverwrite}
              className="settings-keyalert__btn settings-keyalert__btn--amber"
            >
              Reemplazar asignación
            </button>
            <button
              type="button"
              onClick={() => setConflictNotice(null)}
              className="settings-keyalert__btn settings-keyalert__btn--ghost"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Toast de confirmación */}
      {successToast && (
        <div className="settings-keyalert settings-keyalert--ok">
          <Check className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Lista agrupada de Controles */}
      <div className="settings-keylist">
        {categories.map((cat) => (
          <div key={cat} className="settings-keygroup">
            <span className="settings-keygroup__label">{cat}</span>
            <div className="settings-keygroup__rows">
              {ACTION_SPECS.filter((s) => s.category === cat).map((spec) => {
                const label = getFriendlyActionLabel(spec.id, bindings);
                const isListening = listeningActionId === spec.id;

                return (
                  <div
                    key={spec.id}
                    className={`settings-keyrow ${isListening ? 'is-listening' : ''}`}
                  >
                    <span className="settings-keyrow__label">{spec.label}</span>
                    <div className="settings-keyrow__actions">
                      <span className="settings-keychip">
                        {isListening ? '...' : label}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          retroAudio.uiClick();
                          setConflictNotice(null);
                          setListeningActionId(spec.id);
                        }}
                        className="settings-keyassign"
                      >
                        Reasignar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
