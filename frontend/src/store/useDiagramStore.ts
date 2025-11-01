import { create } from 'zustand';
import { UMLClass, UMLDiagram, UMLRelation, CollaborationUser, CollaborationLock } from '../types/uml';

// Tipos de acciones generadas por la IA (deben alinearse con el backend)
export type UMLActionType =
  | 'CREATE_CLASS'
  | 'UPDATE_CLASS'
  | 'DELETE_CLASS'
  | 'RENAME_CLASS'
  | 'ADD_ATTRIBUTE'
  | 'UPDATE_ATTRIBUTE'
  | 'DELETE_ATTRIBUTE'
  | 'ADD_METHOD'
  | 'UPDATE_METHOD'
  | 'DELETE_METHOD'
  | 'CREATE_RELATION'
  | 'UPDATE_RELATION'
  | 'DELETE_RELATION';

export interface UMLActionTarget {
  className?: string;
  newClassName?: string;
  relationId?: string;
  sourceClassName?: string;
  targetClassName?: string;
  attributeName?: string;
  newAttributeName?: string;
  methodName?: string;
  newMethodName?: string;
}

export interface UMLAction {
  type: UMLActionType;
  target?: UMLActionTarget;
  payload?: any;
  reason?: string;
}

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
  
  // Bulk operations for AI generation
  addMultipleClasses: (classes: UMLClass[]) => void;
  addMultipleRelations: (relations: UMLRelation[]) => void;
  generateDiagramFromAI: (classes: any[], relations: any[]) => void;
  // Apply AI actions
  applyUMLActions: (actions: UMLAction[]) => void;
  
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
  
  // Bulk operations for AI generation
  addMultipleClasses: (classes) => set((state) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      classes: [...state.diagram.classes, ...classes]
    } : null
  })),
  
  addMultipleRelations: (relations) => set((state) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      relations: [...state.diagram.relations, ...relations]
    } : null
  })),
  
  generateDiagramFromAI: (classes, relations) => set((state) => {
    // Convert AI response to UML format
    const umlClasses: UMLClass[] = classes.map((cls, index) => ({
      id: `ai-class-${Date.now()}-${index}`,
      name: cls.name,
      attributes: cls.attributes || [],
      methods: cls.methods || [],
      position: { 
        x: 100 + (index * 250), 
        y: 100 + (index % 2) * 200 
      },
      width: 200,
      height: 100
    }));
    
    const umlRelations: UMLRelation[] = relations.map((rel, index) => ({
      id: `ai-relation-${Date.now()}-${index}`,
      type: rel.type,
      source: umlClasses.find(c => c.name === rel.source)?.id || '',
      target: umlClasses.find(c => c.name === rel.target)?.id || '',
      sourceCardinality: rel.type.includes('ONE') ? '1' : '*',
      targetCardinality: rel.type.includes('MANY') ? '*' : '1',
      mappedBy: rel.mappedBy,
      label: rel.sourceLabel || ''
    }));
    
    return {
      diagram: state.diagram ? {
        ...state.diagram,
        classes: [...state.diagram.classes, ...umlClasses],
        relations: [...state.diagram.relations, ...umlRelations]
      } : null
    };
  }),

  // Aplicar acciones UML generadas por IA sobre el diagrama actual
  applyUMLActions: (actions) => set((state) => {
    if (!state.diagram) return { diagram: state.diagram };

    let diagram = { ...state.diagram };

    const findClassByName = (name: string) => diagram.classes.find(c => c.name === name);
    const ensurePosition = (index: number) => ({
      x: 120 + (index * 240),
      y: 120 + (index % 2) * 200
    });

    actions.forEach((action, index) => {
      switch (action.type) {
        case 'CREATE_CLASS': {
          const payload = action.payload || {};
          const name = payload.name || action?.target?.className || `Clase${Date.now()}`;
          if (findClassByName(name)) break; // evitar duplicados por nombre
          const newClass: UMLClass = {
            id: `ai-class-${Date.now()}-${index}`,
            name,
            attributes: payload.attributes || [],
            methods: payload.methods || [],
            position: ensurePosition(index),
            width: 200,
            height: 100
          };
          diagram = { ...diagram, classes: [...diagram.classes, newClass] };
          break;
        }
        case 'UPDATE_CLASS': {
          const className = action.target?.className;
          if (!className) break;
          diagram = {
            ...diagram,
            classes: diagram.classes.map(c =>
              c.name === className ? { ...c, ...(action.payload || {}) } : c
            )
          };
          break;
        }
        case 'RENAME_CLASS': {
          const { className, newClassName } = action.target || {} as UMLActionTarget;
          if (!className || !newClassName) break;
          diagram = {
            ...diagram,
            classes: diagram.classes.map(c =>
              c.name === className ? { ...c, name: newClassName } : c
            )
          };
          break;
        }
        case 'DELETE_CLASS': {
          const className = action.target?.className;
          if (!className) break;
          const cls = findClassByName(className);
          if (!cls) break;
          diagram = {
            ...diagram,
            classes: diagram.classes.filter(c => c.id !== cls.id),
            relations: diagram.relations.filter(r => r.source !== cls.id && r.target !== cls.id)
          };
          break;
        }
        case 'ADD_ATTRIBUTE': {
          const className = action.target?.className;
          if (!className) break;
          diagram = {
            ...diagram,
            classes: diagram.classes.map(c =>
              c.name === className
                ? { ...c, attributes: [...c.attributes, action.payload] }
                : c
            )
          };
          break;
        }
        case 'UPDATE_ATTRIBUTE': {
          const { className, attributeName } = action.target || {} as UMLActionTarget;
          if (!className || !attributeName) break;
          diagram = {
            ...diagram,
            classes: diagram.classes.map(c =>
              c.name === className
                ? {
                    ...c,
                    attributes: c.attributes.map(a =>
                      a.name === attributeName ? { ...a, ...(action.payload || {}) } : a
                    )
                  }
                : c
            )
          };
          break;
        }
        case 'DELETE_ATTRIBUTE': {
          const { className, attributeName } = action.target || {} as UMLActionTarget;
          if (!className || !attributeName) break;
          diagram = {
            ...diagram,
            classes: diagram.classes.map(c =>
              c.name === className
                ? { ...c, attributes: c.attributes.filter(a => a.name !== attributeName) }
                : c
            )
          };
          break;
        }
        case 'ADD_METHOD': {
          const className = action.target?.className;
          if (!className) break;
          diagram = {
            ...diagram,
            classes: diagram.classes.map(c =>
              c.name === className
                ? { ...c, methods: [...c.methods, action.payload] }
                : c
            )
          };
          break;
        }
        case 'UPDATE_METHOD': {
          const { className, methodName } = action.target || {} as UMLActionTarget;
          if (!className || !methodName) break;
          diagram = {
            ...diagram,
            classes: diagram.classes.map(c =>
              c.name === className
                ? {
                    ...c,
                    methods: c.methods.map(m =>
                      m.name === methodName ? { ...m, ...(action.payload || {}) } : m
                    )
                  }
                : c
            )
          };
          break;
        }
        case 'DELETE_METHOD': {
          const { className, methodName } = action.target || {} as UMLActionTarget;
          if (!className || !methodName) break;
          diagram = {
            ...diagram,
            classes: diagram.classes.map(c =>
              c.name === className
                ? { ...c, methods: c.methods.filter(m => m.name !== methodName) }
                : c
            )
          };
          break;
        }
        case 'CREATE_RELATION': {
          const { sourceClassName, targetClassName } = action.target || {} as UMLActionTarget;
          if (!sourceClassName || !targetClassName) break;
          const source = findClassByName(sourceClassName);
          const target = findClassByName(targetClassName);
          if (!source || !target) break;
          const rel: UMLRelation = {
            id: `ai-relation-${Date.now()}-${index}`,
            type: action.payload?.type || 'ONE_TO_ONE',
            source: source.id,
            target: target.id,
            sourceCardinality: action.payload?.type?.includes('ONE') ? '1' : '*',
            targetCardinality: action.payload?.type?.includes('MANY') ? '*' : '1',
            mappedBy: action.payload?.mappedBy,
            label: action.payload?.sourceLabel || ''
          };
          diagram = { ...diagram, relations: [...diagram.relations, rel] };
          break;
        }
        case 'UPDATE_RELATION': {
          const relationId = action.target?.relationId;
          if (!relationId) break;
          diagram = {
            ...diagram,
            relations: diagram.relations.map(r => r.id === relationId ? { ...r, ...(action.payload || {}) } : r)
          };
          break;
        }
        case 'DELETE_RELATION': {
          const relationId = action.target?.relationId;
          if (!relationId) break;
          diagram = { ...diagram, relations: diagram.relations.filter(r => r.id !== relationId) };
          break;
        }
        default:
          break;
      }
    });

    return { diagram };
  }),
  
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

