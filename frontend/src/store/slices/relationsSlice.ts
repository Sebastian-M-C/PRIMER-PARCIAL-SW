import { UMLRelation } from '../../types/uml';

export const createRelationsSlice = (set: any, get: any) => ({
  relations: [] as UMLRelation[],

  addRelation: (relation: UMLRelation | Omit<UMLRelation, 'id'>) => set((state: any) => {
    if (!state.diagram) return { diagram: state.diagram };
    const newRelation = ('id' in relation && (relation as UMLRelation).id)
      ? (relation as UMLRelation)
      : { id: `rel_${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`, ...(relation as Omit<UMLRelation, 'id'>) } as UMLRelation;

    return { diagram: { ...state.diagram, relations: [...state.diagram.relations, newRelation] } };
  }),

  updateRelation: (id: string, updates: Partial<UMLRelation>) => set((state: any) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      relations: state.diagram.relations.map((rel: UMLRelation) => rel.id === id ? { ...rel, ...updates } : rel)
    } : null
  })),

  deleteRelation: (id: string) => set((state: any) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      relations: state.diagram.relations.filter((rel: UMLRelation) => rel.id !== id)
    } : null,
    selectedRelationId: state.selectedRelationId === id ? null : state.selectedRelationId
  })),

  selectRelation: (id: string | null) => set({ selectedRelationId: id }),

  addMultipleRelations: (relations: UMLRelation[]) => set((state: any) => ({
    diagram: state.diagram ? { ...state.diagram, relations: [...state.diagram.relations, ...relations] } : null
  }))
});