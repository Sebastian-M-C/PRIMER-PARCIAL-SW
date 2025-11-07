import { CollaborationUser, CollaborationLock } from '../../types/uml';

/**
 * createCollaborationSlice
 *
 * Slice factory que provee el estado y acciones relacionadas con la colaboración
 * en tiempo real (usuarios conectados, locks de edición, estado de conexión, errores).
 *
 * Nota: Los tipos de `set` y `get` se tipan como `any` aquí para evitar dependencias
 * circulares; si se exporta una interfaz global del store, reemplazar `any` por esa interfaz.
 *
 * @param set - función de zustand para actualizar el estado
 * @param get - función de zustand para leer el estado actual
 * @returns objeto con estado inicial y acciones para colaboración
 */
export const createCollaborationSlice = (set: any, get: any) => ({
  /** Lista de usuarios actualmente conectados a la sesión de colaboración */
  users: [] as CollaborationUser[],

  /** Locks activos: cada lock representa un elemento del diagrama bloqueado por un usuario */
  locks: [] as CollaborationLock[],

  /** Usuario local (actual) en la sesión de colaboración */
  currentUser: null as CollaborationUser | null,


  isConnected: false,

  
  isLoading: false,


  error: null as string | null,

  /**
   * Reemplaza la lista completa de usuarios conectados.
   * @param users - array de CollaborationUser
   */
  setUsers: (users: CollaborationUser[]) => set({ users }),

  /**
   * Añade o reemplaza un usuario en la lista `users`.
   * Mantiene la lista única por `id`.
   * @param user - CollaborationUser a agregar/actualizar
   */
  addUser: (user: CollaborationUser) =>
    set((state: any) => ({ users: [...state.users.filter((u: CollaborationUser) => u.id !== user.id), user] })),

  /**
   * Elimina un usuario por id. También elimina locks asociados al usuario eliminado.
   * @param userId - id del usuario a remover
   */
  removeUser: (userId: string) =>
    set((state: any) => ({
      users: state.users.filter((u: CollaborationUser) => u.id !== userId),
      locks: state.locks.filter((l: CollaborationLock) => l.userId !== userId)
    })),

  /**
   * Actualiza la posición/cursor del usuario (p. ej. para mostrar punteros en el canvas).
   * @param userId - id del usuario a actualizar
   * @param cursor - coordenadas { x, y }
   */
  updateUserCursor: (userId: string, cursor: { x: number; y: number }) =>
    set((state: any) => ({ users: state.users.map((u: CollaborationUser) => u.id === userId ? { ...u, cursor } : u) })),

  /**
   * Reemplaza la lista completa de locks.
   * @param locks - array de CollaborationLock
   */
  setLocks: (locks: CollaborationLock[]) => set({ locks }),

  /**
   * Añade un lock para un elemento concreto. Si ya existía un lock para el mismo elemento,
   * lo reemplaza (último lock gana).
   * @param lock - CollaborationLock a agregar
   */
  addLock: (lock: CollaborationLock) =>
    set((state: any) => ({ locks: [...state.locks.filter((l: CollaborationLock) => l.elementId !== lock.elementId), lock] })),

  /**
   * Elimina el lock asociado a un elementId.
   * @param elementId - identificador del elemento cuyo lock se debe remover
   */
  removeLock: (elementId: string) => set((state: any) => ({ locks: state.locks.filter((l: CollaborationLock) => l.elementId !== elementId) })),

  /**
   * Establece el usuario actual de la sesión.
   * @param user - CollaborationUser que representa al usuario local
   */
  setCurrentUser: (user: CollaborationUser) => set({ currentUser: user }),

  /**
   * Marca el estado de conexión al servidor de colaboración.
   * @param isConnected - true si está conectado
   */
  setConnectionStatus: (isConnected: boolean) => set({ isConnected }),

  /**
   * Setea el flag de carga (operaciones en curso).
   * @param isLoading - true si hay una operación en curso
   */
  setLoading: (isLoading: boolean) => set({ isLoading }),

  /**
   * Registra un mensaje de error en el slice de colaboración.
   * @param error - string o null para limpiar
   */
  setError: (error: string | null) => set({ error }),

  // ----------------------
  // Helpers / Selectors
  // ----------------------

  /**
   * Verifica si un elemento (por id) está actualmente bloqueado por algún usuario.
   * @param elementId - id del elemento a comprobar
   * @returns boolean - true si existe un lock para el elemento
   */
  isElementLocked: (elementId: string) => {
    const state = get();
    return state.locks.some((l: CollaborationLock) => l.elementId === elementId);
  },

  /**
   * Devuelve el id del usuario que tiene el lock sobre un elemento, o null.
   * Útil para mostrar propietario del lock en la UI.
   * @param elementId - id del elemento
   * @returns userId | null
   */
  getLockedBy: (elementId: string) => {
    const state = get();
    const lock = state.locks.find((l: CollaborationLock) => l.elementId === elementId);
    return lock ? lock.userId : null;
  }
});