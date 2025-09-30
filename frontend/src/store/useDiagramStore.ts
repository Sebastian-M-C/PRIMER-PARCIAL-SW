import { create } from 'zustand';
import { UMLClass, UMLDiagram, UMLRelation, CollaborationUser, CollaborationLock } from '../types/uml';

interface DiagramState {
  // Diagram data
  diagram: UMLDiagram | null;
  selectedClassId: string | null;
  selectedRelationId: string | null;
  
  // Collaboration
  users: CollaborationUser[];
  locks: CollaborationLock[];
  currentUser: CollaborationUser | null;
  
  // UI state
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
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
  setDiagram: (diagram) => set({ diagram }),
  
  addClass: (umlClass) => set((state) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      classes: [...state.diagram.classes, umlClass]
    } : null
  })),
  
  updateClass: (id, updates) => set((state) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      classes: state.diagram.classes.map(cls => 
        cls.id === id ? { ...cls, ...updates } : cls
      )
    } : null
  })),
  
  deleteClass: (id) => set((state) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      classes: state.diagram.classes.filter(cls => cls.id !== id),
      relations: state.diagram.relations.filter(rel => rel.source !== id && rel.target !== id)
    } : null,
    selectedClassId: state.selectedClassId === id ? null : state.selectedClassId
  })),
  
  selectClass: (id) => set({ selectedClassId: id }),
  
  // Relation actions
  addRelation: (relation) => set((state) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      relations: [...state.diagram.relations, relation]
    } : null
  })),
  
  updateRelation: (id, updates) => set((state) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      relations: state.diagram.relations.map(rel => 
        rel.id === id ? { ...rel, ...updates } : rel
      )
    } : null
  })),
  
  deleteRelation: (id) => set((state) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      relations: state.diagram.relations.filter(rel => rel.id !== id)
    } : null,
    selectedRelationId: state.selectedRelationId === id ? null : state.selectedRelationId
  })),
  
  selectRelation: (id) => set({ selectedRelationId: id }),
  
  // Collaboration actions
  setUsers: (users) => set({ users }),
  
  addUser: (user) => set((state) => ({
    users: [...state.users.filter(u => u.id !== user.id), user]
  })),
  
  removeUser: (userId) => set((state) => ({
    users: state.users.filter(u => u.id !== userId),
    locks: state.locks.filter(lock => lock.userId !== userId)
  })),
  
  updateUserCursor: (userId, cursor) => set((state) => ({
    users: state.users.map(user => 
      user.id === userId ? { ...user, cursor } : user
    )
  })),
  
  setLocks: (locks) => set({ locks }),
  
  addLock: (lock) => set((state) => ({
    locks: [...state.locks.filter(l => l.elementId !== lock.elementId), lock]
  })),
  
  removeLock: (elementId) => set((state) => ({
    locks: state.locks.filter(lock => lock.elementId !== elementId)
  })),
  
  setCurrentUser: (user) => set({ currentUser: user }),
  setConnectionStatus: (isConnected) => set({ isConnected }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  
  // Utility functions
  getClassById: (id) => {
    const state = get();
    return state.diagram?.classes.find(cls => cls.id === id);
  },
  
  getRelationById: (id: string) => {
    const state = get();
    return state.diagram?.relations.find(rel => rel.id === id);
  },
  
  isElementLocked: (elementId) => {
    const state = get();
    return state.locks.some(lock => lock.elementId === elementId);
  },
  
  getLockedBy: (elementId) => {
    const state = get();
    const lock = state.locks.find(lock => lock.elementId === elementId);
    return lock ? lock.userId : null;
  }
}));

