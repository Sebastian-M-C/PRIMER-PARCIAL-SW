import type { UMLDiagram, UMLRelation, UMLClass } from '../../../types/uml';

export interface JoinConfig {
  name: string;
  attributes: Array<{ name: string; type: string }>;
  hiddenInCanvas?: boolean;
}

/**
 * Create a MANY_TO_MANY relation and optional join-class in the diagram.
 * Returns a new diagram object (does not mutate input).
 */
export function createManyToMany(
  diagram: UMLDiagram,
  relationData: Omit<UMLRelation, 'id'>,
  joinConfig?: JoinConfig
): UMLDiagram {
  const d = JSON.parse(JSON.stringify(diagram || { classes: [], relations: [] })) as UMLDiagram;

  // ensure arrays
  d.classes = Array.isArray(d.classes) ? d.classes : [];
  d.relations = Array.isArray(d.relations) ? d.relations : [];

  const newRel: UMLRelation = {
    ...relationData,
    id: `rel-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
  } as UMLRelation;

  // If joinConfig provided, create a join class with metadata
  if (joinConfig && joinConfig.name) {
    const joinId = `join-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
    const srcPos = (d.classes || []).find((c: UMLClass) => c.id === relationData.source)?.position;
    const tgtPos = (d.classes || []).find((c: UMLClass) => c.id === relationData.target)?.position;
    const pos = srcPos && tgtPos ? { x: Math.round((srcPos.x + tgtPos.x) / 2), y: Math.round((srcPos.y + tgtPos.y) / 2) } : { x: 250, y: 150 };

    const joinClass: UMLClass = {
      id: joinId,
      name: joinConfig.name,
      attributes: (joinConfig.attributes || []).map(a => ({ name: a.name, type: a.type })),
      methods: [],
      position: pos,
      width: 160,
      height: 80
    } as UMLClass;

    // attach metadata in a non-intrusive way
    (joinClass as any).metadata = {
      generatedJoinFor: [relationData.source, relationData.target],
      hiddenInCanvas: joinConfig.hiddenInCanvas !== false
    };

    d.classes.push(joinClass);
  }

  d.relations.push(newRel);
  d.updatedAt = new Date();

  return d;
}

export default createManyToMany;
