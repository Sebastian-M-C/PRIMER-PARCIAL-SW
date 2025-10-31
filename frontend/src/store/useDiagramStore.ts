import { create } from 'zustand';
import { UMLClass, UMLDiagram, UMLRelation, CollaborationUser, CollaborationLock } from '../types/uml';

/**
 * useDiagramStore - Zustand store para el diagrama UML y datos de colaboración.
 *
 * Responsable de:
 * - Mantener el estado del diagrama (clases, relaciones, metadatos).
 * - Gestionar estado de UI (selecciones, loading, errores).
 * - Gestionar colaboración en tiempo real (usuarios conectados y locks).
 *
 * Todas las acciones devuelven un estado inmutable (se crea un nuevo objeto)
 * para que React/Zustand detecte los cambios correctamente.
 */
interface DiagramState {
  // Diagram data
  diagram: UMLDiagram | null;             // Diagrama completo o null si no hay ninguno cargado
  selectedClassId: string | null;         // Id de la clase seleccionada en la UI
  selectedRelationId: string | null;      // Id de la relación seleccionada en la UI
  
  // Collaboration
  users: CollaborationUser[];             // Usuarios conectados a la sesión
  locks: CollaborationLock[];             // Locks activos sobre elementos (elementId, userId)
  currentUser: CollaborationUser | null;  // Usuario local (cliente)
  
  // UI state
  isConnected: boolean;                   // Estado de conexión (socket)
  isLoading: boolean;                     // Flag genérico de carga
  error: string | null;                   // Mensaje de error para mostrar en UI
  
  // Actions
  setDiagram: (diagram: UMLDiagram) => void;
  addClass: (umlClass: UMLClass) => void;
  updateClass: (id: string, updates: Partial<UMLClass>) => void;
  deleteClass: (id: string) => void;
  selectClass: (id: string | null) => void;
  
  // Relation actions
  addRelation: (relation: UMLRelation) => void;
  updateRelation: (id: string, updates: Partial<UMLRelation>) => void;
  deleteRelation: (id: string) => void;
  selectRelation: (id: string | null) => void;
  
  // Collaboration actions
  setUsers: (users: CollaborationUser[]) => void;
  addUser: (user: CollaborationUser) => void;
  removeUser: (userId: string) => void;
  updateUserCursor: (userId: string, cursor: { x: number; y: number }) => void;
  
  setLocks: (locks: CollaborationLock[]) => void;
  addLock: (lock: CollaborationLock) => void;
  removeLock: (elementId: string) => void;
  
  setCurrentUser: (user: CollaborationUser) => void;
  setConnectionStatus: (isConnected: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Utility
  getClassById: (id: string) => UMLClass | undefined;
  getRelationById: (id: string) => UMLRelation | undefined;
  isElementLocked: (elementId: string) => boolean;
  getLockedBy: (elementId: string) => string | null;
}

/**
 * Implementación del store.
 * - Inicializa estado por defecto.
 * - Implementa acciones CRUD para clases y relaciones.
 * - Acciones de colaboración: gestión de usuarios y locks.
 * - Funciones utilitarias para lectura rápida del estado.
 */
export const useDiagramStore = create<DiagramState>((set, get) => ({
  // Initial state
  diagram: null,
  selectedClassId: null,
  selectedRelationId: null,
  users: [],
  locks: [],
  currentUser: null,
  isConnected: false,
  isLoading: false,
  error: null,
  
  // Diagram actions

  /**
   * setDiagram
   * Reemplaza el diagrama completo en el store.
   * Usar para carga inicial o sincronización completa desde servidor.
   */
  setDiagram: (diagram) => set({ diagram }),
  
  /**
   * addClass
   * Añade una nueva clase al diagrama. Si no hay diagrama cargado, no hace nada.
   */
  addClass: (umlClass) => set((state) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      classes: [...state.diagram.classes, umlClass]
    } : null
  })),
  
  /**
   * updateClass
   * Actualiza una clase existente realizando merge con los updates proporcionados.
   * No crea la clase si no existe.
   */
  updateClass: (id, updates) => set((state) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      classes: state.diagram.classes.map(cls => 
        cls.id === id ? { ...cls, ...updates } : cls
      )
    } : null
  })),
  
  /**
   * deleteClass
   * Elimina una clase y además remueve relaciones que referencien a esa clase.
   * Limpia la selección si la clase eliminada estaba seleccionada.
   */
  deleteClass: (id) => set((state) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      classes: state.diagram.classes.filter(cls => cls.id !== id),
      relations: state.diagram.relations.filter(rel => rel.source !== id && rel.target !== id)
    } : null,
    selectedClassId: state.selectedClassId === id ? null : state.selectedClassId
  })),
  
  /**
   * selectClass
   * Marca o desmarca la clase seleccionada en la UI.
   */
  selectClass: (id) => set({ selectedClassId: id }),
  
  // Relation actions

  /**
   * addRelation
   * Añade una nueva relación al diagrama. Si no hay diagrama, no hace nada.
   */
  addRelation: (relation) => set((state) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      relations: [...state.diagram.relations, relation]
    } : null
  })),
  
  /**
   * updateRelation
   * Actualiza una relación por id realizando merge con los updates.
   */
  updateRelation: (id, updates) => set((state) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      relations: state.diagram.relations.map(rel => 
        rel.id === id ? { ...rel, ...updates } : rel
      )
    } : null
  })),
  
  /**
   * deleteRelation
   * Elimina una relación y limpia selección si corresponde.
   */
  deleteRelation: (id) => set((state) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      relations: state.diagram.relations.filter(rel => rel.id !== id)
    } : null,
    selectedRelationId: state.selectedRelationId === id ? null : state.selectedRelationId
  })),
  
  /**
   * selectRelation
   * Selecciona o deselecciona una relación en la UI.
   */
  selectRelation: (id) => set({ selectedRelationId: id }),
  
  // Collaboration actions

  /**
   * setUsers
   * Reemplaza la lista completa de usuarios conectados.
   * Útil al sincronizar el estado desde el servidor.
   */
  setUsers: (users) => set({ users }),
  
  /**
   * addUser
   * Añade o actualiza un usuario en la lista (se filtra por id para evitar duplicados).
   */
  addUser: (user) => set((state) => ({
    users: [...state.users.filter(u => u.id !== user.id), user]
  })),
  
  /**
   * removeUser
   * Elimina un usuario y remueve locks asociados a ese usuario para evitar locks huérfanos.
   */
  removeUser: (userId) => set((state) => ({
    users: state.users.filter(u => u.id !== userId),
    locks: state.locks.filter(lock => lock.userId !== userId)
  })),
  
  /**
   * updateUserCursor
   * Actualiza la posición del cursor/indicador de un usuario (para mostrar presencia en canvas).
   */
  updateUserCursor: (userId, cursor) => set((state) => ({
    users: state.users.map(user => 
      user.id === userId ? { ...user, cursor } : user
    )
  })),
  
  /**
   * setLocks
   * Reemplaza la lista completa de locks activos.
   */
  setLocks: (locks) => set({ locks }),
  
  /**
   * addLock
   * Añade o reemplaza un lock por elementId.
   * Útil para implementar locking optimista antes de editar un elemento.
   */
  addLock: (lock) => set((state) => ({
    locks: [...state.locks.filter(l => l.elementId !== lock.elementId), lock]
  })),
  
  /**
   * removeLock
   * Remueve el lock de un elemento (por ejemplo al guardar o al soltar edición).
   */
  removeLock: (elementId) => set((state) => ({
    locks: state.locks.filter(lock => lock.elementId !== elementId)
  })),
  
  // Connection / UI helpers

  setCurrentUser: (user) => set({ currentUser: user }),            // Establece el usuario local
  setConnectionStatus: (isConnected) => set({ isConnected }),       // Flag de conexión
  setLoading: (isLoading) => set({ isLoading }),                   // Loading UI
  setError: (error) => set({ error }),                             // Mensaje de error
  
  // Utility functions

  /**
   * getClassById
   * Obtiene una clase por su id (undefined si no existe o si no hay diagrama).
   */
  getClassById: (id) => {
    const state = get();
    return state.diagram?.classes.find(cls => cls.id === id);
  },
  
  /**
   * getRelationById
   * Obtiene una relación por su id.
   */
  getRelationById: (id: string) => {
    const state = get();
    return state.diagram?.relations.find(rel => rel.id === id);
  },
  
  /**
   * isElementLocked
   * Indica si un elemento (clase/relación) está bloqueado por algún usuario.
   */
  isElementLocked: (elementId) => {
    const state = get();
    return state.locks.some(lock => lock.elementId === elementId);
  },
  
  /**
   * getLockedBy
   * Retorna el userId que tiene el lock del elemento, o null si no existe lock.
   */
  getLockedBy: (elementId) => {
    const state = get();
    const lock = state.locks.find(lock => lock.elementId === elementId);
    return lock ? lock.userId : null;
  }
}));
