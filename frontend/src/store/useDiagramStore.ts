import { create } from 'zustand';
import { createDiagramSlice } from './slices/diagramSlice';
import { createRelationsSlice } from './slices/relationsSlice';
import { createCollaborationSlice } from './slices/collaborationSlice';

// Nota: la definición completa de la interfaz DiagramState puede mantenerse aquí
// (para evitar importaciones circulares). Mantén la interfaz original si la usas.


/**
 * useDiagramStore
 *
 * Store principal compuesto a partir de slices independientes:
 * - createDiagramSlice: estado y operaciones sobre el diagrama (clases, relaciones, metadata)
 * - createRelationsSlice: operaciones específicas de relaciones
 * - createCollaborationSlice: estado y utilidades para colaboración en tiempo real
 *
 * Además expone campos UI de selección (selectedClassId, selectedRelationId).
 */
// Use a loose any for the store type to avoid wide-ranging 'unknown' inference issues
// TODO: replace `any` with a precise interface for better type-safety
export const useDiagramStore = create<any>((set: any, get: any) => ({
  // Inicializa/mergea todos los slices en un único store
  ...createDiagramSlice(set, get),
  ...createRelationsSlice(set),
  ...createCollaborationSlice(set, get),

  // selección UI (puede residir aquí o en un slice)
  selectedClassId: null,
  selectedRelationId: null,

  // Acción para seleccionar/deseleccionar una clase desde componentes/hooks
  selectClass: (id: string | null) => set({ selectedClassId: id }),

  // Acción para seleccionar/deseleccionar una relación (añadida aquí por consistencia;
  // si ya existe en relationsSlice no hay conflicto, esta implementación la sobrescribe)
  selectRelation: (id: string | null) => set({ selectedRelationId: id })
}));
