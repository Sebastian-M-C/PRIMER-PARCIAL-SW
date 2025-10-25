import { useState, useCallback } from 'react';
import Konva from 'konva';

/**
 * Hook personalizado para manejar la funcionalidad de zoom y panning en el lienzo.
 * 
 * @returns {Object} Objeto con el estado y funciones para controlar zoom y panning
 * @property {number} escala - Factor de escala actual (zoom)
 * @property {Object} posicion - Posición actual del stage {x, y}
 * @property {Function} manejarRueda - Handler para eventos de rueda del ratón
 * @property {Function} manejarFinArrastreStage - Handler para cuando termina el arrastre del stage
 * @property {Function} reiniciarVista - Función para resetear zoom y posición
 * 
 * @example
 * const { escala, posicion, manejarRueda, reiniciarVista } = useZoomPan();
 */
export const useZoomPan = () => {
  const [escala, setEscala] = useState(1);
  const [posicion, setPosicion] = useState({ x: 0, y: 0 });

  /**
   * Maneja el evento de rueda del ratón para controlar el zoom del lienzo.
   * - Previene el scroll de la página durante el zoom.
   * - Centra el zoom en la posición del puntero.
   * - Limita el rango de zoom para evitar valores extremos.
   * 
   * @param {Konva.KonvaEventObject<WheelEvent>} e - Evento de rueda de Konva
   */
  const manejarRueda = useCallback((e) => {
    e.evt.preventDefault();

    const factorEscala = 1.05; // Factor de zoom suavizado
    const stage = e.target.getStage();
    if (!stage) return;

    const escalaAnterior = stage.scaleX();
    const posicionPuntero = stage.getPointerPosition();
    if (!posicionPuntero) return;

    // Calcular el punto del mouse relativo al stage
    const puntoMouse = {
      x: (posicionPuntero.x - stage.x()) / escalaAnterior,
      y: (posicionPuntero.y - stage.y()) / escalaAnterior,
    };

    // Determinar nueva escala (invertir dirección: scroll up = zoom in)
    const nuevaEscala = e.evt.deltaY < 0 ? escalaAnterior * factorEscala : escalaAnterior / factorEscala;

    // Limitar escala entre 0.2 y 2.5
    const escalaLimitada = Math.max(0.2, Math.min(2.5, nuevaEscala));
    
    setEscala(escalaLimitada);
    setPosicion({
      x: posicionPuntero.x - puntoMouse.x * escalaLimitada,
      y: posicionPuntero.y - puntoMouse.y * escalaLimitada,
    });
  }, []);

  /**
   * Actualiza la posición del stage después de un arrastre (panning)
   * 
   * @param {Object} nuevaPosicion - Nueva posición {x, y}
   */
  const manejarFinArrastreStage = useCallback((nuevaPosicion) => {
    setPosicion(nuevaPosicion);
  }, []);

  /**
   * Reinicia la vista a su estado inicial (zoom 100%, posición centrada)
   */
  const reiniciarVista = useCallback(() => {
    setEscala(1);
    setPosicion({ x: 0, y: 0 });
  }, []);

  return {
    escala,
    posicion,
    manejarRueda,
    manejarFinArrastreStage,
    reiniciarVista,
  };
};