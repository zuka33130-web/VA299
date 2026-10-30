/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GESTOR CENTRALIZADO DE CONTROLES Y TECLAS DE PIXELVERSE:
 * Permite reasignar teclas, detectar conflictos, persistir configuraciones en localStorage
 * y evitar activaciones no deseadas cuando se escribe en cajas de texto o modales activos.
 */

export type RpgActionId =
  | 'moveUp'
  | 'moveDown'
  | 'moveLeft'
  | 'moveRight'
  | 'interact'
  | 'inventory'
  | 'quests'
  | 'powers'
  | 'flight'
  | 'confirm'
  | 'cancel';

export interface ActionSpec {
  id: RpgActionId;
  label: string;
  category: 'Navegación' | 'Exploración' | 'Habilidades' | 'Menús';
  defaultCodes: string[];
  displayDefault: string;
}

export const ACTION_SPECS: ActionSpec[] = [
  {
    id: 'moveUp',
    label: 'Mover Arriba',
    category: 'Navegación',
    defaultCodes: ['KeyW', 'ArrowUp', 'w', 'W'],
    displayDefault: 'W / Flecha Arriba',
  },
  {
    id: 'moveDown',
    label: 'Mover Abajo',
    category: 'Navegación',
    defaultCodes: ['KeyS', 'ArrowDown', 's', 'S'],
    displayDefault: 'S / Flecha Abajo',
  },
  {
    id: 'moveLeft',
    label: 'Mover Izquierda',
    category: 'Navegación',
    defaultCodes: ['KeyA', 'ArrowLeft', 'a', 'A'],
    displayDefault: 'A / Flecha Izquierda',
  },
  {
    id: 'moveRight',
    label: 'Mover Derecha',
    category: 'Navegación',
    defaultCodes: ['KeyD', 'ArrowRight', 'd', 'D'],
    displayDefault: 'D / Flecha Derecha',
  },
  {
    id: 'interact',
    label: 'Interactuar / Inspeccionar',
    category: 'Exploración',
    defaultCodes: ['KeyE', 'Space', 'e', 'E'],
    displayDefault: 'E / Espacio',
  },
  {
    id: 'inventory',
    label: 'Mochila / Inventario',
    category: 'Menús',
    defaultCodes: ['KeyI', 'i', 'I'],
    displayDefault: 'I',
  },
  {
    id: 'quests',
    label: 'Diario de Misiones',
    category: 'Menús',
    defaultCodes: ['KeyQ', 'q', 'Q'],
    displayDefault: 'Q',
  },
  {
    id: 'powers',
    label: 'Menú RPG de Poderes',
    category: 'Habilidades',
    defaultCodes: ['KeyK', 'k', 'K'],
    displayDefault: 'K',
  },
  {
    id: 'flight',
    label: 'Invocar Vuelo (Barra Pong)',
    category: 'Habilidades',
    defaultCodes: ['KeyF', 'f', 'F'],
    displayDefault: 'F',
  },
  {
    id: 'confirm',
    label: 'Confirmar / Aceptar',
    category: 'Menús',
    defaultCodes: ['Enter', 'NumpadEnter'],
    displayDefault: 'Enter',
  },
  {
    id: 'cancel',
    label: 'Cancelar / Pausa',
    category: 'Menús',
    defaultCodes: ['Escape'],
    displayDefault: 'ESC',
  },
];

const STORAGE_KEY = 'pixelverse_keybindings_v2';

export type KeybindingsMap = Record<RpgActionId, string[]>;

export function getDefaultKeybindings(): KeybindingsMap {
  const map: Partial<KeybindingsMap> = {};
  for (const spec of ACTION_SPECS) {
    map[spec.id] = [...spec.defaultCodes];
  }
  return map as KeybindingsMap;
}

export function loadKeybindings(): KeybindingsMap {
  if (typeof window === 'undefined') return getDefaultKeybindings();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultKeybindings();
    const parsed = JSON.parse(raw) as Partial<KeybindingsMap>;
    const defaults = getDefaultKeybindings();
    const result: KeybindingsMap = { ...defaults };
    for (const spec of ACTION_SPECS) {
      if (Array.isArray(parsed[spec.id]) && parsed[spec.id]!.length > 0) {
        result[spec.id] = parsed[spec.id]!;
      }
    }
    return result;
  } catch {
    return getDefaultKeybindings();
  }
}

export function saveKeybindings(bindings: KeybindingsMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
    window.dispatchEvent(new CustomEvent('pixelverse-keybindings-changed', { detail: bindings }));
  } catch {
    // Ignore storage errors
  }
}

export function resetKeybindings(): KeybindingsMap {
  const defaults = getDefaultKeybindings();
  saveKeybindings(defaults);
  return defaults;
}

/**
 * Comprueba si el objetivo del evento proviene de un campo de texto o editable.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable ||
    Boolean(target.closest('[contenteditable="true"]'))
  );
}

/**
 * Normaliza una tecla para comparación (code o key).
 */
export function matchesKey(event: KeyboardEvent, targetKeyOrCode: string): boolean {
  if (!targetKeyOrCode) return false;
  const targetLower = targetKeyOrCode.toLowerCase();
  const eventCodeLower = (event.code || '').toLowerCase();
  const eventKeyLower = (event.key || '').toLowerCase();

  return (
    eventCodeLower === targetLower ||
    eventKeyLower === targetLower ||
    (targetKeyOrCode === 'Space' && event.code === 'Space') ||
    (targetKeyOrCode === 'Enter' && event.code === 'Enter') ||
    (targetKeyOrCode === 'Escape' && event.code === 'Escape')
  );
}

/**
 * Comprueba si la tecla pulsada coincide con la acción dada según las asignaciones actuales.
 */
export function isActionPressed(
  event: KeyboardEvent,
  actionId: RpgActionId,
  bindings: KeybindingsMap
): boolean {
  if (isEditableTarget(event.target)) return false;
  const codes = bindings[actionId] || [];
  return codes.some((code) => matchesKey(event, code));
}

/**
 * Devuelve la etiqueta legible para mostrar en la interfaz (ej. "K", "W / Flecha Arriba").
 */
export function getFriendlyActionLabel(
  actionId: RpgActionId,
  bindings: KeybindingsMap
): string {
  const codes = bindings[actionId];
  if (!codes || codes.length === 0) return 'Sin asignar';

  const readable = codes.map((c) => {
    if (c.startsWith('Key')) return c.replace('Key', '');
    if (c === 'ArrowUp') return 'Flecha Arriba';
    if (c === 'ArrowDown') return 'Flecha Abajo';
    if (c === 'ArrowLeft') return 'Flecha Izquierda';
    if (c === 'ArrowRight') return 'Flecha Derecha';
    if (c === 'Space') return 'Espacio';
    if (c === 'Escape') return 'ESC';
    if (c === 'Enter') return 'Enter';
    return c.toUpperCase();
  });

  // Eliminar duplicados en etiquetas
  const unique = Array.from(new Set(readable));
  return unique.join(' / ');
}

/**
 * Detecta si una tecla especificada entra en conflicto con otra acción.
 */
export function findKeyConflict(
  newCode: string,
  targetActionId: RpgActionId,
  bindings: KeybindingsMap
): ActionSpec | null {
  for (const spec of ACTION_SPECS) {
    if (spec.id === targetActionId) continue;
    const codes = bindings[spec.id] || [];
    if (codes.some((c) => c.toLowerCase() === newCode.toLowerCase())) {
      return spec;
    }
  }
  return null;
}
