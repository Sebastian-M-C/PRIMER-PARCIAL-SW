import { create } from 'zustand';

/**
 * Store global para el diagrama UML.
 * Gestiona clases, relaciones y selección de elementos.
 */
export const useDiagramStore = create((set) => ({
  diagrama: {
    clases: [],
    relaciones: [],
  },
  claseSeleccionadaId: null,
  relacionSeleccionadaId: null,

  /**
   * Selecciona una clase por su ID.
   * @param {string} id - Identificador de la clase a seleccionar.
   */
  seleccionarClase: (id) => set({ claseSeleccionadaId: id }),

  /**
   * Selecciona una relación por su ID.
   * @param {string} id - Identificador de la relación a seleccionar.
   */
  seleccionarRelacion: (id) => set({ relacionSeleccionadaId: id }),

  /**
   * Actualiza una clase existente en el diagrama.
   * @param {string} id - Identificador de la clase a actualizar.
   * @param {Object} actualizaciones - Propiedades a modificar en la clase.
   */
  actualizarClase: (id, actualizaciones) =>
    set((state) => ({
      diagrama: {
        ...state.diagrama,
        clases: state.diagrama.clases.map((clase) =>
          clase.id === id ? { ...clase, ...actualizaciones } : clase
        ),
      },
    })),

  /**
   * Agrega una nueva clase al diagrama.
   * @param {Object} nuevaClase - Objeto de la clase UML a agregar.
   */
  agregarClase: (nuevaClase) =>
    set((state) => ({
      diagrama: {
        ...state.diagrama,
        clases: [...state.diagrama.clases, nuevaClase],
      },
    })),

  /**
   * Agrega una nueva relación al diagrama.
   * @param {Object} nuevaRelacion - Objeto de la relación UML a agregar.
   */
  agregarRelacion: (nuevaRelacion) =>
    set((state) => ({
      diagrama: {
        ...state.diagrama,
        relaciones: [...state.diagrama.relaciones, nuevaRelacion],
      },
    })),

  /**
   * Actualiza una relación existente en el diagrama.
   * @param {string} id - Identificador de la relación a actualizar.
   * @param {Object} actualizaciones - Propiedades a modificar en la relación.
   */
  actualizarRelacion: (id, actualizaciones) =>
    set((state) => ({
      diagrama: {
        ...state.diagrama,
        relaciones: state.diagrama.relaciones.map((relacion) =>
          relacion.id === id ? { ...relacion, ...actualizaciones } : relacion
        ),
      },
    })),
}));