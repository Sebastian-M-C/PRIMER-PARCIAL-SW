// Utilidad para serializar el estado interno del diagrama a un objeto JSON
// independiente de la UI. Se exporta para poder reutilizar en handleExportUML
// y para facilitar tests unitarios.
import type { UMLDiagram } from '../../../types/uml';

export function serializeDiagram(diagram: UMLDiagram) {
  const classesForExport = diagram.classes.map(cls => ({
    id: cls.id,
    name: cls.name,
    attributes: cls.attributes || [],
    methods: cls.methods || [],
    position: cls.position || { x: 0, y: 0 },
    width: cls.width || 200,
    height: cls.height || 100
  }));

  const relationsForExport = (diagram.relations || []).map(rel => {
    const sourceClass = diagram.classes.find(c => c.id === rel.source) || diagram.classes.find(c => c.name === rel.source);
    const targetClass = diagram.classes.find(c => c.id === rel.target) || diagram.classes.find(c => c.name === rel.target);

    return {
      id: rel.id || `relation-${Date.now()}`,
      type: rel.type,
      sourceId: sourceClass?.id || rel.source,
      sourceName: sourceClass?.name || rel.sourceName || sourceClass?.id || rel.source,
      targetId: targetClass?.id || rel.target,
      targetName: targetClass?.name || rel.targetName || targetClass?.id || rel.target,
      sourceCardinality: rel.sourceCardinality || null,
      targetCardinality: rel.targetCardinality || null,
      mappedBy: rel.mappedBy || null,
      joinColumn: rel.joinColumn || null,
      label: rel.label || null
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