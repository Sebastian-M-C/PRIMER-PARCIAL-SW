import { useCallback, useState } from 'react';

/**
 * Hook personalizado para manejar el arrastre de nodos y habilitar/deshabilitar el panning del stage.
 *
 * @param {React.RefObject} referenciaStage - ref al Konva.Stage (no usado actualmente, queda por compatibilidad)
 * @param {Function} actualizarClase - función del store para actualizar una clase (id, updates)
 * @param {Object} diagrama - objeto del diagrama (puede tener .classes o .clases)
 */
export const useDragNodos = (referenciaStage, actualizarClase, diagrama) => {
  const [arrastrandoNodo, setArrastrandoNodo] = useState(false);
  const [stageArrastrable, setStageArrastrable] = useState(true);

  const manejarInicioArrastreNodo = useCallback(() => {
    // Cuando un nodo comienza a arrastrarse, deshabilitamos el panning del stage
    setArrastrandoNodo(true);
    setStageArrastrable(false);
  }, []);

  /**
   * Maneja el fin del arrastre de un nodo
   * Ahora recibe el evento con el nodo que fue arrastrado
   */
  const manejarFinArrastreNodo = useCallback((e) => {
    console.log('🔵 FINALIZANDO ARRASTRE - Hook actualizado');

    const nodo = e && e.target ? e.target : null;
    if (!nodo) {
      console.log('🟡 No hay nodo para finalizar');
      // Reactivar panning por seguridad
      setArrastrandoNodo(false);
      setStageArrastrable(true);
      return;
    }

    const id = typeof nodo.id === 'function' ? nodo.id() : nodo.id;
    const xFinal = typeof nodo.x === 'function' ? nodo.x() : nodo.attrs?.x;
    const yFinal = typeof nodo.y === 'function' ? nodo.y() : nodo.attrs?.y;

    console.log('🔵 Nodo ID:', id);
    console.log('🔵 Posición final:', { x: xFinal, y: yFinal });

    const clases = (diagrama && (diagrama.classes ?? diagrama.clases)) || [];

    if (id && Array.isArray(clases)) {
      const encontrada = clases.find(c => String(c.id) === String(id));
      if (encontrada) {
        // Redondear coordenadas para evitar floats excesivos
        const pos = { position: { x: Math.round(xFinal), y: Math.round(yFinal) } };
        try {
          actualizarClase(id, pos);
          console.log('🟢 Posición actualizada en el store', pos);
        } catch (err) {
          console.log('🔴 Error al llamar a actualizarClase', err);
        }
      } else {
        console.log('🔴 Clase no encontrada en diagrama para id:', id);
      }
    } else {
      console.log('🔴 Datos inválidos para actualizar clase', { id, diagrama });
    }

    // Reactivar panning del stage y limpiar bandera de arrastre
    setArrastrandoNodo(false);
    setStageArrastrable(true);

    console.log('🟢 Arrastre finalizado correctamente');
  }, [actualizarClase, diagrama]);

  return {
    arrastrandoNodo,
    stageArrastrable,
    manejarInicioArrastreNodo,
    manejarFinArrastreNodo
  };
};