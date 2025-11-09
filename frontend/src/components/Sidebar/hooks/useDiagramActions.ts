import type { ChangeEvent } from 'react';
import { useDiagramStore } from '../../../store/useDiagramStore';
import { findFreePosition, generateUniqueClassName } from '../utils/positionFinder';
import { serializeDiagram } from './diagramSerializer';
import type { UMLDiagram, UMLClass, UMLRelation, UMLAttribute } from '../../../types/uml';
import { modifyDiagram } from '../../../services/aiService';
import { uploadImageFile, type ParseDiagramResult } from '../../../services/aiImageService';

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

    // Generar ID único verificando que no exista
    const existingIds = new Set(diagram.classes.map((c: UMLClass) => c.id));
    let newId = `class-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let attempts = 0;
    while (existingIds.has(newId) && attempts < 10) {
      newId = `class-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      attempts++;
    }

    const newClass: UMLClass = {
      id: newId,
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
   * Convierte un diagrama del backend al formato del frontend
   * - Mapea nombres de clases a IDs existentes
   * - Preserva posiciones y dimensiones de clases existentes
   * - Genera IDs únicos para nuevas clases
   * - Normaliza relaciones con cardinalidades y campos opcionales
   * - Elimina duplicados por ID
   */
  const convertBackendDiagramToFrontend = (backendDiagram: any, currentDiagram: UMLDiagram): UMLDiagram => {
    // Crear mapas de nombres a IDs para clases existentes
    const nameToIdMap = new Map<string, string>();
    const idToClassMap = new Map<string, UMLClass>();
    const usedIds = new Set<string>(); // Rastrear IDs usados para evitar duplicados
    
    currentDiagram.classes.forEach(cls => {
      nameToIdMap.set(cls.name, cls.id);
      idToClassMap.set(cls.id, cls);
      usedIds.add(cls.id);
    });

    // Función para generar un ID único
    const generateUniqueId = (baseId: string, index: number): string => {
      if (!baseId || usedIds.has(baseId)) {
        // Generar nuevo ID único
        let newId = `ai-class-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
        let attempts = 0;
        while (usedIds.has(newId) && attempts < 10) {
          newId = `ai-class-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
          attempts++;
        }
        return newId;
      }
      return baseId;
    };

    // Convertir clases del backend
    const convertedClasses: UMLClass[] = [];
    const processedNames = new Set<string>(); // Evitar procesar la misma clase dos veces
    
    (backendDiagram.classes || []).forEach((cls: any, index: number) => {
      // Evitar procesar clases duplicadas por nombre
      if (processedNames.has(cls.name)) {
        console.warn(`Clase duplicada ignorada: ${cls.name}`);
        return;
      }
      processedNames.add(cls.name);

      // Buscar si la clase ya existe por nombre
      const existingId = nameToIdMap.get(cls.name);
      const existingClass = existingId ? idToClassMap.get(existingId) : null;

      // Si existe, preservar posición y dimensiones, actualizar solo atributos (sin métodos)
      if (existingClass) {
        const updatedClass: UMLClass = {
          ...existingClass,
          name: cls.name,
          attributes: cls.attributes || [],
          methods: [] // No incluir métodos/procedimientos
        };
        convertedClasses.push(updatedClass);
        usedIds.add(existingClass.id);
        return;
      }

      // Si no existe, es una nueva clase - generar ID único y posición
      const freePosition = findFreePosition({ classes: currentDiagram.classes });
      const newId = generateUniqueId(cls.id, index);
      const newClass: UMLClass = {
        id: newId,
        name: cls.name || `Class${index + 1}`,
        attributes: cls.attributes || [],
        methods: [], // No incluir métodos/procedimientos
        position: cls.position || { 
          x: freePosition.x + (index * 250), 
          y: freePosition.y + (index % 2) * 200 
        },
        width: cls.width || 200,
        height: cls.height || 100
      };
      
      convertedClasses.push(newClass);
      usedIds.add(newId);
      nameToIdMap.set(newClass.name, newClass.id);
      idToClassMap.set(newClass.id, newClass);
    });

    // Eliminar duplicados por ID (por si acaso)
    let uniqueClasses = Array.from(
      new Map(convertedClasses.map(cls => [cls.id, cls])).values()
    );

    // Función auxiliar para detectar si una clase es una clase intermedia (join class)
    const isJoinClass = (className: string, sourceName: string, targetName: string): boolean => {
      const normalizedName = className.toLowerCase().replace(/[_\s]/g, '');
      const normalizedSource = sourceName.toLowerCase();
      const normalizedTarget = targetName.toLowerCase();
      
      // Patrones comunes para nombres de clases intermedias
      return normalizedName.includes(normalizedSource) && normalizedName.includes(normalizedTarget) ||
             normalizedName.includes('join') ||
             normalizedName.includes('detalle') ||
             normalizedName.includes('detail');
    };

    // Convertir relaciones del backend
    const convertedRelations: UMLRelation[] = [];
    const manyToManyRelations: Array<{ rel: any; sourceId: string; targetId: string; sourceName: string; targetName: string }> = [];
    
    (backendDiagram.relations || []).forEach((rel: any, index: number) => {
      // Resolver source y target (pueden ser nombres o IDs)
      const sourceKey = rel.source || rel.sourceClassName || rel.sourceName;
      const targetKey = rel.target || rel.targetClassName || rel.targetName;
      
      const sourceId = nameToIdMap.get(sourceKey) || sourceKey;
      const targetId = nameToIdMap.get(targetKey) || targetKey;

      // Validar que ambos IDs existan
      if (!idToClassMap.has(sourceId) || !idToClassMap.has(targetId)) {
        console.warn(`Relación inválida: source=${sourceKey} (${sourceId}), target=${targetKey} (${targetId})`);
        return;
      }

      // Normalizar tipo de relación
      const validTypes = ['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', 'MANY_TO_MANY', 'INHERITANCE', 'COMPOSITION', 'AGGREGATION'];
      let relationType = (rel.type || 'ONE_TO_MANY').toUpperCase();
      if (!validTypes.includes(relationType)) {
        relationType = 'ONE_TO_MANY';
      }

      // Si es MANY_TO_MANY, guardarla para procesarla después
      if (relationType === 'MANY_TO_MANY') {
        const sourceClass = idToClassMap.get(sourceId);
        const targetClass = idToClassMap.get(targetId);
        if (sourceClass && targetClass) {
          manyToManyRelations.push({
            rel,
            sourceId,
            targetId,
            sourceName: sourceClass.name,
            targetName: targetClass.name
          });
        }
        return; // No agregar la relación MANY_TO_MANY directa
      }

      // Determinar cardinalidades: usar las proporcionadas o valores por defecto según el tipo
      let sourceCardinality: string;
      let targetCardinality: string;
      
      // Si el backend proporcionó cardinalidades, usarlas
      if (rel.sourceCardinality && rel.targetCardinality) {
        sourceCardinality = rel.sourceCardinality;
        targetCardinality = rel.targetCardinality;
      } else {
        // Si no se proporcionan, usar valores por defecto según el tipo
        switch (relationType) {
          case 'ONE_TO_ONE':
            sourceCardinality = '1';
            targetCardinality = '1';
            break;
          case 'ONE_TO_MANY':
            sourceCardinality = '1';
            targetCardinality = '*';
            break;
          case 'MANY_TO_ONE':
            sourceCardinality = '*';
            targetCardinality = '1';
            break;
          case 'INHERITANCE':
          case 'COMPOSITION':
          case 'AGGREGATION':
            // Para herencia/composición/agregación: source (hijo/parte) tiene cardinalidad 1, target (padre/todo) tiene *
            sourceCardinality = '1';
            targetCardinality = '*';
            break;
          default:
            sourceCardinality = '1';
            targetCardinality = '*';
        }
      }

      convertedRelations.push({
        id: rel.id || `ai-relation-${Date.now()}-${index}`,
        type: relationType as UMLRelation['type'],
        source: sourceId,
        target: targetId,
        sourceCardinality,
        targetCardinality,
        mappedBy: rel.mappedBy || undefined,
        joinColumn: rel.joinColumn || undefined,
        label: rel.label || rel.sourceLabel || rel.targetLabel || undefined
      } as UMLRelation);
    });

    // Procesar relaciones MANY_TO_MANY: buscar clase intermedia y crear dos relaciones ONE_TO_MANY
    manyToManyRelations.forEach((m2m, index) => {
      // Buscar clase intermedia por nombre o metadata
      let joinClass: UMLClass | null = null;
      
      // Buscar por metadata primero
      for (const cls of uniqueClasses) {
        const meta = (cls as any).metadata;
        if (meta && Array.isArray(meta.generatedJoinFor)) {
          const joinFor = meta.generatedJoinFor.map((id: string) => 
            idToClassMap.get(id)?.name || nameToIdMap.get(id) || id
          );
          if (joinFor.includes(m2m.sourceName) && joinFor.includes(m2m.targetName)) {
            joinClass = cls;
            break;
          }
        }
      }
      
      // Si no se encontró por metadata, buscar por nombre
      if (!joinClass) {
        joinClass = uniqueClasses.find(cls => 
          isJoinClass(cls.name, m2m.sourceName, m2m.targetName)
        ) || null;
      }
      
      // Si no existe clase intermedia, crearla
      if (!joinClass) {
        const joinName = `${m2m.sourceName}_${m2m.targetName}_DETALLE`;
        const sourceClass = idToClassMap.get(m2m.sourceId);
        const targetClass = idToClassMap.get(m2m.targetId);
        
        if (sourceClass && targetClass) {
          const joinId = `join-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
          const joinPosition = {
            x: Math.round((sourceClass.position.x + targetClass.position.x) / 2),
            y: Math.round((sourceClass.position.y + targetClass.position.y) / 2) - 100
          };
          
          joinClass = {
            id: joinId,
            name: joinName,
            attributes: [],
            methods: [],
            position: joinPosition,
            width: 200,
            height: 100
          } as UMLClass;
          
          // Agregar metadata para identificar como join class
          (joinClass as any).metadata = {
            generatedJoinFor: [m2m.sourceId, m2m.targetId],
            hiddenInCanvas: false
          };
          
          uniqueClasses.push(joinClass);
          nameToIdMap.set(joinClass.name, joinClass.id);
          idToClassMap.set(joinClass.id, joinClass);
        }
      } else {
        // Asegurar que la clase intermedia tenga metadata
        if (!(joinClass as any).metadata) {
          (joinClass as any).metadata = {
            generatedJoinFor: [m2m.sourceId, m2m.targetId],
            hiddenInCanvas: false
          };
        }
      }
      
      // Crear dos relaciones ONE_TO_MANY desde las clases principales hacia la clase intermedia
      if (joinClass) {
        const sourceCardinality = m2m.rel.sourceCardinality || '1';
        const targetCardinality = m2m.rel.targetCardinality || '*';
        
        // Relación 1: source -> join class
        convertedRelations.push({
          id: m2m.rel.id ? `${m2m.rel.id}_source` : `ai-relation-${Date.now()}-${index}-source`,
          type: 'ONE_TO_MANY' as const,
          source: m2m.sourceId,
          target: joinClass.id,
          sourceCardinality: sourceCardinality,
          targetCardinality: '1..*',
          mappedBy: m2m.rel.mappedBy || undefined,
          joinColumn: m2m.rel.joinColumn || undefined,
          label: m2m.rel.label || m2m.rel.sourceLabel || undefined
        } as UMLRelation);
        
        // Relación 2: target -> join class
        convertedRelations.push({
          id: m2m.rel.id ? `${m2m.rel.id}_target` : `ai-relation-${Date.now()}-${index}-target`,
          type: 'ONE_TO_MANY' as const,
          source: m2m.targetId,
          target: joinClass.id,
          sourceCardinality: targetCardinality,
          targetCardinality: '1..*',
          mappedBy: undefined,
          joinColumn: undefined,
          label: undefined
        } as UMLRelation);
      }
    });

    // Crear diagrama convertido con clases únicas
    return {
      id: currentDiagram.id,
      name: backendDiagram.name || currentDiagram.name,
      package: backendDiagram.package || currentDiagram.package,
      classes: uniqueClasses,
      relations: convertedRelations,
      createdAt: currentDiagram.createdAt,
      updatedAt: new Date()
    } as UMLDiagram;
  };

  /**
   * IA Modificar
   *
   * - Pide una instrucción al usuario (prompt sencillo).
   * - Llama al servicio modifyDiagram(text, diagram).
   * - Si el servidor devuelve `updatedDiagram`, lo convierte y aplica en el store.
   * - Si solo devuelve `actions`, muestra las acciones propuestas.
   */
  const handleAIModify = async () => {
    if (!diagram) {
      alert('No hay diagrama activo para modificar.');
      return;
    }

    const instruction = prompt('Ingrese instrucción para IA (ej: "añade email a la clase Usuario", "crea relación de herencia entre Empleado y Persona")');
    if (!instruction) return;

    try {
      // Serializar diagrama para enviar al backend (sin posiciones/dimensiones)
      const serializedDiagram = serializeDiagram(diagram);
      
      // Llamar al servicio
      const result = await modifyDiagram(instruction, serializedDiagram);
      
      // Mostrar warnings si existen
      if (result.warnings && result.warnings.length > 0) {
        console.warn('Warnings de IA:', result.warnings);
      }

      if (result.updatedDiagram) {
        // Convertir diagrama del backend al formato del frontend
        const convertedDiagram = convertBackendDiagramToFrontend(result.updatedDiagram, diagram);
        
        // Aplicar diagrama convertido
        setDiagram(convertedDiagram);
        if (typeof selectClass === 'function') selectClass(null);
        if (typeof selectRelation === 'function') selectRelation(null);
        
        // Mostrar mensaje de éxito con información adicional
        let successMsg = '✅ Diagrama actualizado por IA';
        if (result.warnings && result.warnings.length > 0) {
          successMsg += `\n\n⚠️ Advertencias: ${result.warnings.length}`;
        }
        if (result.actions && result.actions.length > 0) {
          successMsg += `\n\n📝 Acciones aplicadas: ${result.actions.length}`;
        }
        alert(successMsg);
      } else if (result.actions && result.actions.length > 0) {
        // Si el servidor no aplicó las acciones, mostrar propuesta
        const actionsSummary = result.actions.map((a, i) => 
          `${i + 1}. ${a.type}${a.reason ? ` - ${a.reason}` : ''}`
        ).join('\n');
        
        alert(`La IA propone las siguientes acciones:\n\n${actionsSummary}\n\nEl servidor no devolvió el diagrama actualizado automáticamente.`);
      } else {
        alert('La IA no devolvió acciones ni diagrama actualizado.');
      }
    } catch (err) {
      console.error('Error AI modify:', err);
      alert('Error al solicitar modificación por IA: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  /**
   * Convertir resultado del API de imagen a diagrama al formato esperado por el store
   * 
   * El API devuelve:
   * - classes con attributes: string[] (ej: ["+id: Long", "-nombre: String"])
   * - relations con from/to en lugar de source/target
   * 
   * Necesitamos convertir a:
   * - classes con attributes: UMLAttribute[]
   * - relations con source/target
   * - Agregar position, width, height a las clases
   * - Agregar métodos vacíos si no existen
   */
  const convertApiResultToUMLDiagram = (apiResult: ParseDiagramResult): UMLDiagram => {
    const apiDiagram = apiResult.diagram;
    
    // Función para parsear atributos desde strings (ej: "+id: Long" -> { name: "id", type: "Long", isId: false })
    const parseAttributeString = (attrStr: string): UMLAttribute => {
      // Formato esperado: "+id: Long", "-nombre: String", "#atributo: int"
      const match = attrStr.match(/^([+\-#~]?)(\w+):\s*(\w+)$/);
      if (match) {
        const [, visibility, name, type] = match;
        return {
          name: name.trim(),
          type: type.trim(),
          nullable: false,
          unique: false,
          isId: name.toLowerCase() === 'id' || visibility === '+'
        };
      }
      // Fallback: intentar parsear sin visibilidad
      const parts = attrStr.split(':');
      if (parts.length >= 2) {
        return {
          name: parts[0].trim().replace(/^[+\-#~]/, ''),
          type: parts[1].trim(),
          nullable: false,
          unique: false,
          isId: parts[0].toLowerCase().includes('id')
        };
      }
      // Último fallback
      return {
        name: attrStr.trim(),
        type: 'String',
        nullable: false,
        unique: false,
        isId: false
      };
    };

    // Convertir clases del API al formato UMLClass
    const umlClasses: UMLClass[] = (apiDiagram.classes || []).map((cls: any, index: number) => {
      // Parsear atributos de string[] a UMLAttribute[]
      const attributes: UMLAttribute[] = Array.isArray(cls.attributes)
        ? cls.attributes.map((attr: string | UMLAttribute) => {
            if (typeof attr === 'string') {
              return parseAttributeString(attr);
            }
            // Si ya es un objeto UMLAttribute, usarlo directamente
            return attr as UMLAttribute;
          })
        : [];

      // Calcular posición libre
      const freePosition = findFreePosition({ classes: diagram?.classes || [] });
      const position = cls.position || { 
        x: freePosition.x + (index * 250), 
        y: freePosition.y + (index % 2) * 200 
      };

      return {
        id: cls.id || `ai-class-${Date.now()}-${index}`,
        name: cls.name || `Class${index + 1}`,
        attributes,
        methods: [], // No incluir métodos/procedimientos
        position,
        width: cls.width || 200,
        height: cls.height || 100
      } as UMLClass;
    });

    // Crear mapa de nombres de clases a IDs para mapear relaciones
    const nameToIdMap = new Map<string, string>();
    umlClasses.forEach(cls => {
      nameToIdMap.set(cls.name, cls.id);
    });

    // Convertir relaciones del API al formato UMLRelation
    const umlRelations: UMLRelation[] = (apiDiagram.relations || []).map((rel: any, index: number) => {
      // El API puede usar 'from/to' o 'source/target'
      const sourceKey = rel.from || rel.source || rel.sourceName || rel.sourceClass;
      const targetKey = rel.to || rel.target || rel.targetName || rel.targetClass;
      
      // Resolver IDs desde nombres o usar directamente si ya es ID
      const sourceId = nameToIdMap.get(sourceKey) || sourceKey;
      const targetId = nameToIdMap.get(targetKey) || targetKey;

      // Normalizar tipo de relación
      const validTypes = ['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', 'MANY_TO_MANY', 'INHERITANCE', 'COMPOSITION', 'AGGREGATION'];
      let typeStr = (rel.type || 'ONE_TO_MANY').toUpperCase();
      
      // Normalizar tipos comunes del API (pueden venir con variaciones)
      if (typeStr.includes('INHERITANCE') || typeStr.includes('EXTENDS') || typeStr.includes('INHERIT')) {
        typeStr = 'INHERITANCE';
      } else if (typeStr.includes('COMPOSITION') || typeStr.includes('COMPOSE')) {
        typeStr = 'COMPOSITION';
      } else if (typeStr.includes('AGGREGATION') || typeStr.includes('AGGREGATE')) {
        typeStr = 'AGGREGATION';
      } else if (typeStr === 'ONE_TO_MANY' || typeStr.includes('ONE_TO_MANY')) {
        typeStr = 'ONE_TO_MANY';
      } else if (typeStr === 'MANY_TO_ONE' || typeStr.includes('MANY_TO_ONE')) {
        typeStr = 'MANY_TO_ONE';
      } else if (typeStr === 'MANY_TO_MANY' || typeStr.includes('MANY_TO_MANY')) {
        typeStr = 'MANY_TO_MANY';
      } else if (typeStr === 'ONE_TO_ONE' || typeStr.includes('ONE_TO_ONE')) {
        typeStr = 'ONE_TO_ONE';
      } else {
        // Por defecto, usar ONE_TO_MANY
        typeStr = 'ONE_TO_MANY';
      }
      
      // Validar que el tipo sea válido
      if (!validTypes.includes(typeStr)) {
        typeStr = 'ONE_TO_MANY';
      }

      // Determinar cardinalidades: usar las proporcionadas o valores por defecto según el tipo
      let sourceCardinality: string;
      let targetCardinality: string;
      
      // Si el API proporcionó cardinalidades, usarlas
      if (rel.sourceCardinality && rel.targetCardinality) {
        sourceCardinality = rel.sourceCardinality;
        targetCardinality = rel.targetCardinality;
      } else {
        // Si no se proporcionan, usar valores por defecto según el tipo
        switch (typeStr) {
          case 'ONE_TO_ONE':
            sourceCardinality = '1';
            targetCardinality = '1';
            break;
          case 'ONE_TO_MANY':
            sourceCardinality = '1';
            targetCardinality = '*';
            break;
          case 'MANY_TO_ONE':
            sourceCardinality = '*';
            targetCardinality = '1';
            break;
          case 'MANY_TO_MANY':
            sourceCardinality = '*';
            targetCardinality = '*';
            break;
          case 'INHERITANCE':
          case 'COMPOSITION':
          case 'AGGREGATION':
            // Para herencia/composición/agregación: source (hijo/parte) tiene cardinalidad 1, target (padre/todo) tiene *
            sourceCardinality = '1';
            targetCardinality = '*';
            break;
          default:
            sourceCardinality = '1';
            targetCardinality = '*';
        }
      }

      return {
        id: rel.id || `ai-relation-${Date.now()}-${index}`,
        type: (typeStr as UMLRelation['type']) || 'ONE_TO_MANY',
        source: sourceId,
        target: targetId,
        sourceCardinality: rel.sourceCardinality || sourceCardinality,
        targetCardinality: rel.targetCardinality || targetCardinality,
        mappedBy: rel.mappedBy || null,
        joinColumn: rel.joinColumn || null,
        label: rel.label || rel.sourceLabel || null
      } as UMLRelation;
    });

    // Separar relaciones MANY_TO_MANY del resto
    const manyToManyRelations: Array<{ rel: UMLRelation; sourceId: string; targetId: string }> = [];
    const otherRelations: UMLRelation[] = [];

    umlRelations.forEach((rel) => {
      if (rel.type === 'MANY_TO_MANY') {
        // Buscar las clases por nombre
        const sourceClass = umlClasses.find(c => c.id === rel.source || c.name === rel.source);
        const targetClass = umlClasses.find(c => c.id === rel.target || c.name === rel.target);
        
        if (sourceClass && targetClass) {
          manyToManyRelations.push({
            rel,
            sourceId: sourceClass.id,
            targetId: targetClass.id
          });
        }
      } else {
        otherRelations.push(rel);
      }
    });

    // Procesar relaciones MANY_TO_MANY: buscar clase intermedia y crear dos relaciones ONE_TO_MANY
    const finalRelations: UMLRelation[] = [...otherRelations];
    const finalClasses = [...umlClasses];

    manyToManyRelations.forEach((m2m, index) => {
      const sourceClass = finalClasses.find(c => c.id === m2m.sourceId);
      const targetClass = finalClasses.find(c => c.id === m2m.targetId);
      
      if (!sourceClass || !targetClass) return;

      // Buscar si existe una clase intermedia (join class)
      // Puede tener metadata o un nombre que sugiera que es una clase intermedia
      let joinClass = finalClasses.find(cls => {
        // Verificar metadata
        if ((cls as any).metadata?.generatedJoinFor) {
          const joinFor = (cls as any).metadata.generatedJoinFor;
          return (Array.isArray(joinFor) && 
                  (joinFor.includes(m2m.sourceId) || joinFor.includes(m2m.targetId) ||
                   joinFor.includes(sourceClass.name) || joinFor.includes(targetClass.name)));
        }
        // Verificar por nombre (puede ser algo como "Producto_Almacen_DETALLE")
        const className = cls.name.toLowerCase();
        const sourceName = sourceClass.name.toLowerCase();
        const targetName = targetClass.name.toLowerCase();
        return className.includes(sourceName) && className.includes(targetName);
      });

      // Si no existe, crear la clase intermedia
      if (!joinClass) {
        const joinClassName = `${sourceClass.name}_${targetClass.name}_DETALLE`;
        const freePosition = findFreePosition({ classes: finalClasses });
        
        joinClass = {
          id: `ai-join-class-${Date.now()}-${index}`,
          name: joinClassName,
          attributes: [],
          methods: [],
          position: freePosition,
          width: 200,
          height: 100
        };
        
        // Agregar metadata para que CanvasStage la detecte
        (joinClass as any).metadata = {
          generatedJoinFor: [m2m.sourceId, m2m.targetId],
          hiddenInCanvas: false
        };
        
        finalClasses.push(joinClass);
      } else {
        // Asegurar que la clase intermedia tenga metadata
        if (!(joinClass as any).metadata) {
          (joinClass as any).metadata = {
            generatedJoinFor: [m2m.sourceId, m2m.targetId],
            hiddenInCanvas: false
          };
        }
      }
      
      // Crear dos relaciones ONE_TO_MANY desde las clases principales hacia la clase intermedia
      if (joinClass) {
        const sourceCardinality = m2m.rel.sourceCardinality || '1';
        const targetCardinality = m2m.rel.targetCardinality || '*';
        
        // Relación 1: source -> join class
        finalRelations.push({
          id: m2m.rel.id ? `${m2m.rel.id}_source` : `ai-relation-${Date.now()}-${index}-source`,
          type: 'ONE_TO_MANY' as const,
          source: m2m.sourceId,
          target: joinClass.id,
          sourceCardinality: sourceCardinality,
          targetCardinality: '1..*',
          mappedBy: m2m.rel.mappedBy || undefined,
          joinColumn: m2m.rel.joinColumn || undefined,
          label: m2m.rel.label || undefined
        } as UMLRelation);
        
        // Relación 2: target -> join class
        finalRelations.push({
          id: m2m.rel.id ? `${m2m.rel.id}_target` : `ai-relation-${Date.now()}-${index}-target`,
          type: 'ONE_TO_MANY' as const,
          source: m2m.targetId,
          target: joinClass.id,
          sourceCardinality: targetCardinality,
          targetCardinality: '1..*',
          mappedBy: undefined,
          joinColumn: undefined,
          label: undefined
        } as UMLRelation);
      }
    });

    // Crear diagrama completo
    return {
      id: diagram?.id || `diagram-${Date.now()}`,
      name: diagram?.name || 'Diagrama desde Imagen',
      package: diagram?.package || 'com.example',
      classes: finalClasses,
      relations: finalRelations,
      createdAt: diagram?.createdAt || new Date(),
      updatedAt: new Date()
    } as UMLDiagram;
  };

  /**
   * Subir imagen y convertir a diagrama UML
   * 
   * - Recibe el evento del input file
   * - Llama al servicio uploadImageFile
   * - Convierte el resultado del API al formato UMLDiagram
   * - Actualiza el diagrama en el store
   */
  const handleUploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('❌ Por favor selecciona un archivo de imagen válido');
      return;
    }

    try {
      // Mostrar indicador de carga (opcional)
      const loadingMsg = '⏳ Analizando imagen con IA...';
      console.log(loadingMsg);

      // Llamar al servicio
      const result = await uploadImageFile(file, { lang: 'es', useLLM: true });

      // Verificar si hay error en la respuesta
      if (result.meta?.error) {
        console.error('[handleUploadImage] Error del API:', result.meta.error);
        alert(`❌ Error al procesar imagen: ${result.meta.error}`);
        return;
      }

      // Verificar si hay diagrama en la respuesta
      if (!result.diagram || !result.diagram.classes || result.diagram.classes.length === 0) {
        console.warn('[handleUploadImage] No se encontraron clases en la respuesta:', result);
        alert('⚠️ No se pudieron extraer clases del diagrama. Intenta con otra imagen.');
        return;
      }

      // Convertir resultado del API al formato UMLDiagram
      const umlDiagram = convertApiResultToUMLDiagram(result);

      // Actualizar el diagrama en el store
      setDiagram(umlDiagram);
      
      // Limpiar selección
      if (typeof selectClass === 'function') selectClass(null);
      if (typeof selectRelation === 'function') selectRelation(null);

      // Mostrar mensaje de éxito
      const successMsg = `✅ Diagrama generado exitosamente!\n\n` +
        `Clases: ${umlDiagram.classes.length}\n` +
        `Relaciones: ${umlDiagram.relations.length}\n` +
        `Motor: ${result.meta?.engine || 'unknown'}\n` +
        `Tiempo: ${result.meta?.elapsed || 'N/A'}`;
      
      alert(successMsg);
      console.log('[handleUploadImage] Diagrama generado:', umlDiagram);
      console.log('[handleUploadImage] Metadata:', result.meta);

    } catch (error: any) {
      console.error('[handleUploadImage] Error:', error);
      
      // Manejar errores específicos
      let errorMsg = '❌ Error al procesar imagen';
      if (error.status === 502) {
        errorMsg = '❌ El proveedor de IA falló. Intenta nuevamente.';
      } else if (error.status === 401) {
        errorMsg = '❌ Error de autenticación. Verifica la configuración de la API.';
      } else if (error.status === 504) {
        errorMsg = '❌ Timeout. La imagen puede ser muy grande o el servidor está ocupado.';
      } else if (error.message) {
        errorMsg = `❌ ${error.message}`;
      }
      
      alert(errorMsg);
    } finally {
      // Limpiar el input para permitir seleccionar el mismo archivo nuevamente
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return {
    handleAddClass,
    handleResetDiagram,
    handleExportUML,
    handleImportUML,
    handleAIModify,
    handleUploadImage // <-- nuevo handler exportado
  };
}