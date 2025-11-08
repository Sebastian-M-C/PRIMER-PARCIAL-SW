import type { ChangeEvent } from 'react';
import { useDiagramStore } from '../../../store/useDiagramStore';
import { findFreePosition, generateUniqueClassName } from '../utils/positionFinder';
import { serializeDiagram } from './diagramSerializer';
import type { UMLDiagram, UMLClass, UMLRelation } from '../../../types/uml';
import { modifyDiagram } from '../../../services/aiService';

/**
 * importUMLFromString
 *
 * Función auxiliar exportada para importar el contenido JSON de un diagrama
 * (texto) y aplicar validaciones/normalizaciones antes de persistirlo en el store.
 *
 * - Garantiza ids únicos para las clases importadas.
 * - Valida que todas las relaciones apunten a clases existentes (por id o name).
 * - Invoca setDiagram(diagram) y limpia selección mediante selectClass/selectRelation.
 *
 * @param text - contenido JSON del archivo importado
 * @param setDiagram - callback para persistir el diagrama en el store
 * @param selectClass - callback opcional para limpiar la selección de clase
 * @param selectRelation - callback opcional para limpiar la selección de relación
 */
export function importUMLFromString(
  text: string,
  setDiagram: (d: UMLDiagram) => void,
  selectClass?: (id: string | null) => void,
  selectRelation?: (id: string | null) => void
) {
  const umlJson = JSON.parse(text);
  // usar el parseador puro para obtener estructura inicial
  const parsed = parseUMLJson(umlJson);

  // Normalizar ids: asegurar unicidad
  const seen = new Set<string>();
  parsed.classes = parsed.classes.map((cls: UMLClass, idx: number) => {
    let id = cls.id;
    if (!id || seen.has(id)) {
      id = `imported-class-${Date.now()}-${idx}-${Math.random().toString(36).slice(2,6)}`;
    }
    seen.add(id);
    return { ...cls, id };
  });

  // Construir lookup por id y por name
  const ids = new Set(parsed.classes.map((c: UMLClass) => c.id));
  const names = new Map(parsed.classes.map((c: UMLClass) => [c.name, c.id]));

  // Validar y remapear relaciones a ids existentes
  parsed.relations = parsed.relations.map((rel: UMLRelation, idx: number) => {
    const sourceKey = rel.source;
    const targetKey = rel.target;

    const mappedSource = ids.has(sourceKey) ? sourceKey : (names.get(sourceKey) ?? null);
    const mappedTarget = ids.has(targetKey) ? targetKey : (names.get(targetKey) ?? null);

    if (!mappedSource || !mappedTarget) {
      throw new Error(`Relación inválida: referencia a clase inexistente (source: ${rel.source}, target: ${rel.target})`);
    }

    return { ...rel, id: rel.id || `imported-relation-${Date.now()}-${idx}`, source: mappedSource, target: mappedTarget };
  });

  // Persistir diagrama en el store y limpiar selección
  setDiagram(parsed);
  if (typeof selectClass === 'function') selectClass(null);
  if (typeof selectRelation === 'function') selectRelation(null);
}

export function parseUMLJson(umlJson: any, baseDiagramId?: string): UMLDiagram {
  if (!umlJson || !Array.isArray(umlJson.classes)) {
    throw new Error('Formato de UML inválido: falta "classes"');
  }

  const idMap: Record<string, string> = {};
  const nameMap: Record<string, string> = {};

  const importedClasses: UMLClass[] = (umlJson.classes || []).map((cls: any, index: number) => {
    const originalKey = cls.id ?? cls.name ?? `original-${index}`;
    const newId = cls.id ?? `imported-class-${Date.now()}-${index}`;
    idMap[originalKey] = newId;
    if (cls.name) nameMap[cls.name] = newId;

    return {
      id: newId,
      name: cls.name || `Class${index + 1}`,
      attributes: cls.attributes || [],
      methods: cls.methods || [],
      position: cls.position || { x: 100 + (index * 250), y: 100 },
      width: cls.width || 200,
      height: cls.height || 100
    } as UMLClass;
  });

  const importedRelations: UMLRelation[] = (umlJson.relations || []).map((rel: any, index: number) => {
    const sourceKey = rel.source ?? rel.sourceClass ?? rel.sourceName;
    const targetKey = rel.target ?? rel.targetClass ?? rel.targetName;

    const mappedSource = idMap[sourceKey] || nameMap[sourceKey] || rel.source;
    const mappedTarget = idMap[targetKey] || nameMap[targetKey] || rel.target;

    return {
      id: rel.id || `imported-relation-${Date.now()}-${index}`,
      type: rel.type || ('ONE_TO_MANY' as any),
      source: mappedSource,
      target: mappedTarget,
      sourceCardinality: rel.sourceCardinality || rel.sourceCardinality || null,
      targetCardinality: rel.targetCardinality || rel.targetCardinality || null,
      mappedBy: rel.mappedBy || null,
      joinColumn: rel.joinColumn || null,
      label: rel.label || null
    } as UMLRelation;
  });

  return {
    id: baseDiagramId || umlJson.id || `diagram-${Date.now()}`,
    name: umlJson.name || 'Diagrama Importado',
    package: umlJson.package || 'com.example',
    classes: importedClasses,
    relations: importedRelations,
    createdAt: new Date(),
    updatedAt: new Date()
  } as UMLDiagram;
}

export function useDiagramActions() {
  // selector tipado para evitar que `useDiagramStore()` devuelva `unknown`
  // y para obtener solo las propiedades necesarias del store.
  const {
    diagram,
    addClass,
    setDiagram,
    selectClass,
    selectRelation
  } = useDiagramStore((s: any) => ({
    diagram: s.diagram as UMLDiagram | null,
    addClass: s.addClass as (cls: UMLClass) => void,
    setDiagram: s.setDiagram as (d: UMLDiagram) => void,
    selectClass: s.selectClass as (id: string | null) => void,
    selectRelation: s.selectRelation as (id: string | null) => void
  }));

  /**
   * Agregar una nueva clase al diagrama
   */
  const handleAddClass = () => {
    if (!diagram) return;

    const freePosition = findFreePosition({ classes: diagram.classes });
    const existingNames = diagram.classes.map((c: UMLClass) => c.name);
    const uniqueName = generateUniqueClassName(existingNames);

    const newClass: UMLClass = {
      id: `class-${Date.now()}`,
      name: uniqueName,
      attributes: [],
      methods: [],
      position: freePosition,
      width: 200,
      height: 100
    };

    addClass(newClass);
  };

  /**
   * Resetear el diagrama a un estado por defecto
   */
  const handleResetDiagram = () => {
    if (!confirm('¿Estás seguro de que quieres resetear el diagrama? Se perderán todos los cambios.')) {
      return;
    }

    const defaultDiagram = {
      id: 'default-diagram',
      name: 'Diagrama UML',
      package: 'com.example',
      classes: [
        {
          id: 'user-class',
          name: 'Usuario',
          attributes: [
            { name: 'id', type: 'Long', isId: true },
            { name: 'nombre', type: 'String', nullable: false },
            { name: 'email', type: 'String', unique: true }
          ],
          methods: [
            { name: 'guardar', returnType: 'void', parameters: [] },
            { name: 'buscarPorEmail', returnType: 'Usuario', parameters: [{ name: 'email', type: 'String' }] }
          ],
          position: { x: 100, y: 100 },
          width: 200,
          height: 120
        },
        {
          id: 'pedido-class',
          name: 'Pedido',
          attributes: [
            { name: 'id', type: 'Long', isId: true },
            { name: 'fechaPedido', type: 'LocalDateTime', nullable: false },
            { name: 'total', type: 'BigDecimal', nullable: false }
          ],
          methods: [
            { name: 'calcularTotal', returnType: 'BigDecimal', parameters: [] }
          ],
          position: { x: 400, y: 100 },
          width: 200,
          height: 100
        }
      ],
      relations: [
        {
          id: 'user-pedido-relation',
          type: 'ONE_TO_MANY' as const,
          source: 'user-class',
          target: 'pedido-class',
          sourceCardinality: '1',
          targetCardinality: '*',
          mappedBy: 'usuario',
          label: 'realiza'
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setDiagram(defaultDiagram);
    selectClass(null);
    selectRelation(null);
  };

  /**
   * Exportar diagrama como JSON (usa serializeDiagram para consistencia y tests)
   */
  const handleExportUML = () => {
    if (!diagram) return;

    const umlJson = serializeDiagram(diagram);
    const blob = new Blob([JSON.stringify(umlJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diagram.name || 'diagram'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Importar diagrama desde JSON
   */
  const handleImportUML = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const umlJson = JSON.parse(e.target?.result as string);

        // Validar estructura básica
        if (!umlJson.classes || !Array.isArray(umlJson.classes)) {
          throw new Error('Formato de UML inválido: falta "classes"');
        }

        // Mapear IDs/nombres originales a nuevos IDs generados
        const idMap: Record<string, string> = {};
        const nameMap: Record<string, string> = {};

        const importedClasses = umlJson.classes.map((cls: any, index: number) => {
          const originalIdKey = cls.id || cls.name || `original-${index}`;
          const newId = cls.id || `imported-class-${Date.now()}-${index}`;
          idMap[originalIdKey] = newId;
          if (cls.name) nameMap[cls.name] = newId;

          return {
            ...cls,
            id: newId,
            position: cls.position || { x: 100 + (index * 250), y: 100 },
            width: cls.width || 200,
            height: cls.height || 100,
            attributes: cls.attributes || [],
            methods: cls.methods || []
          } as UMLClass;
        });

        // Procesar relaciones y re-mapear source/target usando los mapeos anteriores.
        const importedRelations = (umlJson.relations || []).map((rel: any, index: number) => {
          const sourceKey = rel.source || rel.sourceClass || rel.sourceName;
          const targetKey = rel.target || rel.targetClass || rel.targetName;

          const mappedSource = idMap[sourceKey] || nameMap[sourceKey] || rel.source;
          const mappedTarget = idMap[targetKey] || nameMap[targetKey] || rel.target;

          return {
            ...rel,
            id: rel.id || `imported-relation-${Date.now()}-${index}`,
            source: mappedSource,
            target: mappedTarget,
            sourceCardinality: rel.sourceCardinality || null,
            targetCardinality: rel.targetCardinality || null,
            mappedBy: rel.mappedBy || null,
            joinColumn: rel.joinColumn || null,
            label: rel.label || null
          } as UMLRelation;
        });

        const importedDiagram: UMLDiagram = {
          id: diagram?.id || umlJson.id || 'imported-diagram',
          name: umlJson.name || 'Diagrama Importado',
          package: umlJson.package || 'com.example',
          classes: importedClasses,
          relations: importedRelations,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        setDiagram(importedDiagram);
        // asegurarse de que las funciones existan antes de llamarlas
        if (typeof selectClass === 'function') selectClass(null);
        if (typeof selectRelation === 'function') selectRelation(null);

        alert('✅ Diagrama importado exitosamente');
      } catch (error) {
        console.error('Error importing UML:', error);
        alert('❌ Error al importar diagrama. Verifica el formato del archivo.');
      }
    };
    reader.readAsText(file);
  };

  /**
   * IA Modificar
   *
   * - Pide una instrucción al usuario (prompt sencillo).
   * - Llama al servicio modifyDiagram(text, diagram).
   * - Si el servidor devuelve `updatedDiagram`, lo aplica en el store.
   * - Si solo devuelve `actions`, muestra las acciones propuestas.
   */
  const handleAIModify = async () => {
    if (!diagram) {
      alert('No hay diagrama activo para modificar.');
      return;
    }

    const instruction = prompt('Ingrese instrucción para IA (ej: "añade email a la clase Usuario")');
    if (!instruction) return;

    try {
      // opcional: mostrar spinner / estado de generación
      const result = await modifyDiagram(instruction, diagram);
      if (result.updatedDiagram) {
        setDiagram(result.updatedDiagram);
        if (typeof selectClass === 'function') selectClass(null);
        if (typeof selectRelation === 'function') selectRelation(null);
        alert('✅ Diagrama actualizado por IA');
      } else if (result.actions && result.actions.length > 0) {
        // Si el servidor no aplicó las acciones, notificamos al usuario.
        // Puedes mejorar aplicando las acciones localmente o pidiendo al servidor que persista.
        alert(`La IA propone las siguientes acciones:\n\n${JSON.stringify(result.actions, null, 2)}\n\nEl servidor no devolvió el diagrama actualizado automáticamente.`);
      } else {
        alert('La IA no devolvió acciones ni diagrama actualizado.');
      }
    } catch (err) {
      console.error('Error AI modify:', err);
      alert('Error al solicitar modificación por IA: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return {
    handleAddClass,
    handleResetDiagram,
    handleExportUML,
    handleImportUML,
    // otros handlers...
    handleAIModify // <-- nuevo handler exportado
  };
}