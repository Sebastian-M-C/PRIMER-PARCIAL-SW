// Utilidad para serializar el estado interno del diagrama a un objeto JSON
// independiente de la UI. Se exporta para poder reutilizar en handleExportUML
// y para facilitar tests unitarios.
import type { UMLDiagram } from '../../../types/uml';

function normalizeImportedDiagram(diagram: any): any {
  if (!diagram) return diagram;
  const rels: any[] = Array.isArray(diagram.relations) ? diagram.relations : [];
  const classes: any[] = Array.isArray(diagram.classes) ? diagram.classes : [];

  // map name -> id for exported relations that use class names
  const nameToId = new Map<string, string>();
  for (const cls of classes) {
    if (cls && cls.id) nameToId.set(cls.name || cls.id, cls.id);
  }

  // helper to obtain targetId / sourceId robustly
  const getTargetId = (r: any) => {
    if (!r) return undefined;
    if (r.targetId) return r.targetId;
    if (r.target) {
      // r.target may be class id or class name (export uses name). Normalize.
      return nameToId.get(r.target) || r.target;
    }
    return undefined;
  };
  const getSourceId = (r: any) => {
    if (!r) return undefined;
    if (r.sourceId) return r.sourceId;
    if (r.source) {
      return nameToId.get(r.source) || r.source;
    }
    return undefined;
  };

  // index relations by resolved targetId
  const incomingByTarget = new Map<string, any[]>();
  for (const r of rels) {
    const tid = getTargetId(r);
    if (!tid) continue;
    const arr = incomingByTarget.get(tid) || [];
    // attach resolved ids to relation for later use
    r._resolvedTargetId = tid;
    r._resolvedSourceId = getSourceId(r);
    arr.push(r);
    incomingByTarget.set(tid, arr);
  }

  for (const cls of classes) {
    const incoming = incomingByTarget.get(cls.id) || [];

    // Heurística: clase candidata a join si tiene exactamente 2 relaciones que apuntan a ella
    // y provienen de dos clases distintas
    if (incoming.length === 2) {
      const [r1, r2] = incoming;
      const s1 = r1._resolvedSourceId;
      const s2 = r2._resolvedSourceId;
      if (s1 && s2 && s1 !== s2) {
        cls.metadata = cls.metadata || {};
        if (!Array.isArray(cls.metadata.generatedJoinFor)) {
          cls.metadata.generatedJoinFor = [s1, s2];
        }
        r1.metadata = r1.metadata || {};
        r2.metadata = r2.metadata || {};
        r1.metadata.generatedByManyToMany = true;
        r2.metadata.generatedByManyToMany = true;
      }
    }
  }

  return diagram;
}

// Si tienes una función exportada importDiagram / deserialize, integra la normalización ahí:
export function deserializeDiagram(serialized: string): UMLDiagram {
  // ...existing code that parses...
  const parsed = JSON.parse(serialized) as UMLDiagram;
  const normalized = normalizeImportedDiagram(parsed) as UMLDiagram;
  return normalized;
}

// Si exportas con stringify, asegúrate de incluir metadata (por defecto sí se incluye):
export function serializeDiagram(diagram: UMLDiagram) {
  const classesForExport = diagram.classes.map((cls: any) => ({
    id: cls.id,
    name: cls.name,
    attributes: cls.attributes || [],
    methods: cls.methods || [],
    position: cls.position || { x: 0, y: 0 },
    width: cls.width || 200,
    height: cls.height || 100,
    metadata: cls.metadata || undefined // <-- incluir metadata si existe
  }));

  const relationsForExport = (diagram.relations || []).map((rel: any) => {
    const sourceClass = diagram.classes.find((c: any) => c.id === rel.source);
    const targetClass = diagram.classes.find((c: any) => c.id === rel.target);

    return {
      id: rel.id || `relation-${Date.now()}`,
      type: rel.type,
      // exportar nombres para backend, pero mantener los ids en metadata para reimportación fiable
      source: sourceClass?.name || rel.source,
      target: targetClass?.name || rel.target,
      sourceCardinality: rel.sourceCardinality || '1',
      targetCardinality: rel.targetCardinality || '*',
      mappedBy: rel.mappedBy || undefined,
      joinColumn: rel.joinColumn || undefined,
      label: rel.label || undefined,
      metadata: rel.metadata || undefined // <-- incluir metadata si existe
    };
  });

  return {
    id: diagram.id || `diagram-${Date.now()}`,
    name: diagram.name || 'Diagrama UML',
    package: diagram.package || 'com.example',
    createdAt: diagram.createdAt || new Date(),
    updatedAt: diagram.updatedAt || new Date(),
    classes: classesForExport,
    relations: relationsForExport
  };
}