import { UMLClass, UMLRelation, UMLDiagram } from '../../types/uml';

export const createDiagramSlice = (set: any, get: any) => ({
  // estado por defecto del diagrama (si no se inyecta desde el store principal)
  diagram: null as UMLDiagram | null,

  setDiagram: (diagram: UMLDiagram) => set({ diagram }),

  addClass: (umlClass: UMLClass) => set((state: any) => ({
    diagram: state.diagram ? { ...state.diagram, classes: [...state.diagram.classes, umlClass] } : null
  })),

  updateClass: (id: string, updates: Partial<UMLClass>) => set((state: any) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      classes: state.diagram.classes.map((cls: UMLClass) => cls.id === id ? { ...cls, ...updates } : cls)
    } : null
  })),

  deleteClass: (id: string) => set((state: any) => ({
    diagram: state.diagram ? {
      ...state.diagram,
      classes: state.diagram.classes.filter((cls: UMLClass) => cls.id !== id),
      relations: state.diagram.relations.filter((rel: UMLRelation) => rel.source !== id && rel.target !== id)
    } : null,
    selectedClassId: state.selectedClassId === id ? null : state.selectedClassId
  })),

  // Bulk / AI helpers
  addMultipleClasses: (classes: UMLClass[]) => set((state: any) => ({
    diagram: state.diagram ? { ...state.diagram, classes: [...state.diagram.classes, ...classes] } : null
  })),

  generateDiagramFromAI: (classes: any[], relations: any[]) => set((state: any) => {
    const umlClasses: UMLClass[] = classes.map((cls: any, index: number) => ({
      id: `ai-class-${Date.now()}-${index}`,
      name: cls.name,
      attributes: cls.attributes || [],
      methods: cls.methods || [],
      position: { x: 100 + (index * 250), y: 100 + (index % 2) * 200 },
      width: 200,
      height: 100
    }));

    const umlRelations: UMLRelation[] = relations.map((rel: any, index: number) => ({
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

  // utilitarios
  getClassById: (id: string) => {
    const state = get();
    return state.diagram?.classes.find((cls: UMLClass) => cls.id === id);
  },

  getRelationById: (id: string) => {
    const state = get();
    return state.diagram?.relations.find((rel: UMLRelation) => rel.id === id);
  }
});