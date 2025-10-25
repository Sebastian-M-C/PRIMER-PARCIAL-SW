import { useCallback } from 'react';

/**
 * Hook personalizado para manejar la selección de elementos en el diagrama
 * 
 * @param {Function} seleccionarClase - Función del store para seleccionar clase
 * @param {Function} seleccionarRelacion - Función del store para seleccionar relación
 * @param {string|null} idClaseSeleccionada - ID de la clase actualmente seleccionada
 * @param {string|null} idRelacionSeleccionada - ID de la relación actualmente seleccionada
 * @returns {Object} Funciones para manejar selecciones
 * 
 * @property {Function} manejarSeleccionClase - Maneja la selección de una clase
 * @property {Function} manejarSeleccionRelacion - Maneja la selección de una relación
 * @property {Function} deseleccionarTodo - Deselecciona todos los elementos
 * @property {Function} manejarClickStage - Maneja clicks en el stage vacío
 */
export const useSeleccionElementos = (
  seleccionarClase,
  seleccionarRelacion,
  idClaseSeleccionada,
  idRelacionSeleccionada
) => {
  /**
   * Maneja la selección de una clase
   * Ahora acepta opcionalmente el evento Konva para evitar seleccionar
   * mientras el usuario está presionando el botón (evita interferir con drag).
   *
   * @param {string} idClase - ID de la clase a seleccionar
   * @param {Object} [e] - (Opcional) evento Konva (e.evt)
   */
  const manejarSeleccionClase = useCallback((idClase, e) => {
    // Si recibimos evento de Konva, asegurarnos que no hay botón presionado (evitar seleccionar durante drag)
    const evt = e && e.evt ? e.evt : null;
    if (evt) {
      if (typeof evt.buttons !== 'undefined' && evt.buttons !== 0) {
        // Hay un botón presionado -> probablemente inicio de drag; no seleccionar ahora
        return;
      }
      // fallback: algunos navegadores/entornos usan button/which
      if (typeof evt.button !== 'undefined' && evt.button > 0 && evt.type !== 'click') {
        return;
      }
    }

    seleccionarClase(idClase);
    seleccionarRelacion(null); // Deseleccionar relación si hay una seleccionada
  }, [seleccionarClase, seleccionarRelacion]);

  /**
   * Maneja la selección de una relación
   * Igual protección que en la selección de clase.
   *
   * @param {string} idRelacion - ID de la relación a seleccionar
   * @param {Object} [e] - (Opcional) evento Konva (e.evt)
   */
  const manejarSeleccionRelacion = useCallback((idRelacion, e) => {
    const evt = e && e.evt ? e.evt : null;
    if (evt) {
      if (typeof evt.buttons !== 'undefined' && evt.buttons !== 0) {
        return;
      }
      if (typeof evt.button !== 'undefined' && evt.button > 0 && evt.type !== 'click') {
        return;
      }
    }

    seleccionarRelacion(idRelacion);
    seleccionarClase(null); // Deseleccionar clase si hay una seleccionada
  }, [seleccionarClase, seleccionarRelacion]);

  /**
   * Deselecciona todos los elementos del diagrama
   */
  const deseleccionarTodo = useCallback(() => {
    seleccionarClase(null);
    seleccionarRelacion(null);
  }, [seleccionarClase, seleccionarRelacion]);

  /**
   * Maneja clicks en el stage (área vacía) para deseleccionar elementos
   * 
   * @param {Event} e - Evento de click
   */
  const manejarClickStage = useCallback((e) => {
    // Solo manejar clicks en el stage vacío (no en clases o relaciones)
    if (e.target === e.target.getStage()) {
      deseleccionarTodo();
    }
  }, [deseleccionarTodo]);

  /**
   * Verifica si una clase está actualmente seleccionada
   * 
   * @param {string} idClase - ID de la clase a verificar
   * @returns {boolean} True si la clase está seleccionada
   */
  const estaClaseSeleccionada = useCallback((idClase) => {
    return idClaseSeleccionada === idClase;
  }, [idClaseSeleccionada]);

  /**
   * Verifica si una relación está actualmente seleccionada
   * 
   * @param {string} idRelacion - ID de la relación a verificar
   * @returns {boolean} True si la relación está seleccionada
   */
  const estaRelacionSeleccionada = useCallback((idRelacion) => {
    return idRelacionSeleccionada === idRelacion;
  }, [idRelacionSeleccionada]);

  return {
    // Funciones principales (nota: ahora pueden recibir opcionalmente el evento Konva)
    manejarSeleccionClase,
    manejarSeleccionRelacion,
    deseleccionarTodo,
    manejarClickStage,
    
    // Funciones de verificación
    estaClaseSeleccionada,
    estaRelacionSeleccionada,
    
    // Estado actual
    idClaseSeleccionada,
    idRelacionSeleccionada
  };
};