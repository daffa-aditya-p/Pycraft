import { useUIStore } from '../../stores/useUIStore';

export type GameAction =
  | 'interact'
  | 'camera_toggle'
  | 'iso_rotate_left'
  | 'iso_rotate_right'
  | 'open_editor'
  | 'open_journal'
  | 'open_map'
  | 'pause';

export interface InputSnapshot {
  moveX: number;
  moveZ: number;
  sprint: boolean;
  jump: boolean;
  orbitDeltaX: number;
  orbitDeltaY: number;
  zoomDelta: number;
  suspended: boolean;
}

type ActionListener = (action: GameAction) => void;

/**
 * Checks whether keyboard focus currently belongs to a text input or CodeMirror editor,
 * ensuring the game never steals typing from the Python editor or form fields.
 */
export function isTextInputFocused(doc: Document | undefined = typeof document !== 'undefined' ? document : undefined): boolean {
  if (!doc) return false;
  const active = doc.activeElement as HTMLElement | null;
  if (!active) return false;
  const tag = active.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (active.isContentEditable) return true;
  if (active.closest && (active.closest('.cm-editor') || active.closest('[data-text-input="true"]'))) {
    return true;
  }
  return false;
}

/**
 * Unified Desktop + Touch InputManager.
 * Handles WASD/Arrows, Space, E, V, Z/C, Tab, Esc, mouse orbit/zoom, touch joystick & drag,
 * automatic input-mode switching, and strict focus suspension.
 */
export class InputManager {
  private keysDown = new Set<string>();
  private touchMoveX = 0;
  private touchMoveZ = 0;
  private touchSprint = false;
  private touchJump = false;

  private orbitDeltaX = 0;
  private orbitDeltaY = 0;
  private zoomDelta = 0;

  private draggingOrbit = false;
  private dragPointerId: number | null = null;
  private lastDragX = 0;
  private lastDragY = 0;

  private actionListeners = new Set<ActionListener>();
  private attachedElement: HTMLElement | null = null;

  onAction(listener: ActionListener): () => void {
    this.actionListeners.add(listener);
    return () => this.actionListeners.delete(listener);
  }

  private emitAction(action: GameAction): void {
    for (const listener of this.actionListeners) {
      listener(action);
    }
  }

  /** Called by TouchControls floating joystick */
  setTouchJoystick(x: number, y: number, sprint: boolean): void {
    this.touchMoveX = Math.max(-1, Math.min(1, x));
    // TouchControls emits screen-space Y (negative when dragging thumb upward),
    // whereas CharacterController expects positive moveZ for forward motion (matching KeyW).
    this.touchMoveZ = Math.max(-1, Math.min(1, -y));
    this.touchSprint = sprint;
    useUIStore.getState().setInputMode('touch');
  }

  setTouchJump(pressed: boolean): void {
    this.touchJump = pressed;
    useUIStore.getState().setInputMode('touch');
  }

  injectOrbitDelta(dx: number, dy: number): void {
    this.orbitDeltaX += dx;
    this.orbitDeltaY += dy;
  }

  injectZoomDelta(dz: number): void {
    this.zoomDelta += dz;
  }

  triggerAction(action: GameAction): void {
    this.emitAction(action);
  }

  attach(canvasContainer: HTMLElement): () => void {
    this.attachedElement = canvasContainer;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    canvasContainer.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    canvasContainer.addEventListener('wheel', this.handleWheel, { passive: false });
    canvasContainer.addEventListener('contextmenu', this.handleContextMenu);

    return () => {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('blur', this.handleWindowBlur);
      canvasContainer.removeEventListener('pointerdown', this.handlePointerDown);
      window.removeEventListener('pointermove', this.handlePointerMove);
      window.removeEventListener('pointerup', this.handlePointerUp);
      window.removeEventListener('pointercancel', this.handlePointerUp);
      canvasContainer.removeEventListener('wheel', this.handleWheel);
      canvasContainer.removeEventListener('contextmenu', this.handleContextMenu);
      this.attachedElement = null;
      this.keysDown.clear();
    };
  }

  private handleWindowBlur = (): void => {
    this.keysDown.clear();
    this.touchMoveX = 0;
    this.touchMoveZ = 0;
    this.touchSprint = false;
    this.touchJump = false;
    this.draggingOrbit = false;
    this.dragPointerId = null;
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const ui = useUIStore.getState();
    if (ui.inputMode === 'touch') {
      ui.setInputMode('mouse+keyboard');
    }

    // Esc always closes topmost panel or toggles pause, even if editor is focused
    if (e.code === 'Escape') {
      if (isTextInputFocused()) {
        (document.activeElement as HTMLElement | null)?.blur?.();
      }
      this.emitAction('pause');
      return;
    }

    // Strict focus suspension: never steal typing from CodeMirror or input fields
    if (isTextInputFocused()) {
      return;
    }

    if (ui.screen !== 'in_game') return;

    const code = e.code;
    this.keysDown.add(code);

    if (e.repeat) return;

    if (ui.inGameOverlay === 'explore') {
      if (code === 'KeyE') {
        this.emitAction('interact');
      } else if (code === 'KeyV') {
        this.emitAction('camera_toggle');
      } else if (code === 'KeyZ') {
        this.emitAction('iso_rotate_left');
      } else if (code === 'KeyC') {
        this.emitAction('iso_rotate_right');
      } else if (code === 'Tab') {
        e.preventDefault();
        this.emitAction('open_editor');
      } else if (code === 'KeyJ' || code === 'KeyI' || code === 'KeyK' || code === 'KeyO') {
        this.emitAction('open_journal');
      } else if (code === 'KeyM') {
        this.emitAction('open_map');
      } else if (code === 'KeyP') {
        this.emitAction('pause');
      }
    } else if (code === 'Tab' && ui.inGameOverlay === 'editor') {
      e.preventDefault();
      this.emitAction('open_editor');
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };

  private handlePointerDown = (e: PointerEvent): void => {
    const ui = useUIStore.getState();
    if (e.pointerType === 'touch') {
      ui.setInputMode('touch');
    } else {
      ui.setInputMode('mouse+keyboard');
    }

    if (ui.screen !== 'in_game') return;

    // LMB or RMB drag on canvas container orbits camera
    if (e.pointerType === 'mouse' && (e.button === 0 || e.button === 2)) {
      this.draggingOrbit = true;
      this.dragPointerId = e.pointerId;
      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.draggingOrbit || e.pointerId !== this.dragPointerId) return;
    const dx = e.clientX - this.lastDragX;
    const dy = e.clientY - this.lastDragY;
    this.lastDragX = e.clientX;
    this.lastDragY = e.clientY;
    this.orbitDeltaX += dx;
    this.orbitDeltaY += dy;
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (e.pointerId === this.dragPointerId) {
      this.draggingOrbit = false;
      this.dragPointerId = null;
    }
  };

  private handleWheel = (e: WheelEvent): void => {
    if (!this.attachedElement) return;
    const ui = useUIStore.getState();
    if (ui.screen !== 'in_game') return;
    e.preventDefault();
    this.zoomDelta += Math.sign(e.deltaY) * Math.min(2, Math.abs(e.deltaY) / 100);
  };

  /**
   * Non-destructive read of current movement/sprint/jump state for CharacterController.
   */
  getMovementInput(): Pick<InputSnapshot, 'moveX' | 'moveZ' | 'sprint' | 'jump' | 'suspended'> {
    const ui = useUIStore.getState();
    const suspended =
      ui.screen !== 'in_game' ||
      ui.inGameOverlay !== 'explore' ||
      isTextInputFocused();

    let moveX = 0;
    let moveZ = 0;
    let sprint = false;
    let jump = false;

    if (!suspended) {
      if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) moveX -= 1;
      if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) moveX += 1;
      if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) moveZ += 1;
      if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) moveZ -= 1;

      if (Math.abs(this.touchMoveX) > 0.01 || Math.abs(this.touchMoveZ) > 0.01) {
        moveX += this.touchMoveX;
        moveZ += this.touchMoveZ;
      }

      const mag = Math.hypot(moveX, moveZ);
      if (mag > 1) {
        moveX /= mag;
        moveZ /= mag;
      }

      sprint =
        this.keysDown.has('ShiftLeft') ||
        this.keysDown.has('ShiftRight') ||
        this.touchSprint;
      jump = this.keysDown.has('Space') || this.touchJump;
    }

    return { moveX, moveZ, sprint, jump, suspended };
  }

  /**
   * Consumes accumulated orbit/zoom deltas for CameraRig.
   */
  consumeCameraDeltas(): { orbitDeltaX: number; orbitDeltaY: number; zoomDelta: number } {
    const orbitDeltaX = this.orbitDeltaX;
    const orbitDeltaY = this.orbitDeltaY;
    const zoomDelta = this.zoomDelta;
    this.orbitDeltaX = 0;
    this.orbitDeltaY = 0;
    this.zoomDelta = 0;
    return { orbitDeltaX, orbitDeltaY, zoomDelta };
  }

  /**
   * Consumes accumulated orbit/zoom deltas and returns the current frame's movement snapshot.
   */
  consumeFrameInput(): InputSnapshot {
    const move = this.getMovementInput();
    const cam = this.consumeCameraDeltas();
    return { ...move, ...cam };
  }
}

export const globalInputManager = new InputManager();
