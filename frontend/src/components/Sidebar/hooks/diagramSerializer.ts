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
    // Buscar clases por ID (el formato interno usa IDs)
    const sourceClass = diagram.classes.find(c => c.id === rel.source);
    const targetClass = diagram.classes.find(c => c.id === rel.target);

    // Para el backend, usar nombres de clases en lugar de IDs
    // El backend espera nombres de clases en 'source' y 'target'
    return {
      id: rel.id || `relation-${Date.now()}`,
      type: rel.type,
      source: sourceClass?.name || rel.source, // Usar nombre de clase para el backend
      target: targetClass?.name || rel.target, // Usar nombre de clase para el backend
      sourceCardinality: rel.sourceCardinality || '1',
      targetCardinality: rel.targetCardinality || '*',
      mappedBy: rel.mappedBy || undefined,
      joinColumn: rel.joinColumn || undefined,
      label: rel.label || undefined
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