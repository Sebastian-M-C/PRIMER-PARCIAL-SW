import { describe, it, expect } from 'vitest';
import { serializeDiagram } from '../diagramSerializer';
import type { UMLDiagram } from '../../../../types/uml';

describe('serializeDiagram', () => {
  it('serializa correctamente clases y relaciones (source/target por id)', () => {
    const mockDiagram: UMLDiagram = {
      id: 'd1',
      name: 'TestDiagram',
      package: 'com.test',
      createdAt: new Date('2020-01-01'),
      updatedAt: new Date('2020-01-02'),
      classes: [
        {
          id: 'c1',
          name: 'User',
          attributes: [{ name: 'id', type: 'Long' }],
          methods: [],
          position: { x: 10, y: 20 },
          width: 200,
          height: 100
        },
        {
          id: 'c2',
          name: 'Post',
          attributes: [],
          methods: [],
          position: { x: 300, y: 20 },
          width: 200,
          height: 100
        }
      ],
      relations: [
        {
          id: 'r1',
          type: 'ONE_TO_MANY' as any,
          source: 'c1',
          target: 'c2',
          sourceCardinality: '1',
          targetCardinality: '*'
        } as any
      ]
    };

    const result = serializeDiagram(mockDiagram);

    expect(result.name).toBe('TestDiagram');
    expect(result.classes).toHaveLength(2);
    expect(result.classes[0]).toMatchObject({ id: 'c1', name: 'User' });
    expect(result.relations).toHaveLength(1);
    expect(result.relations[0]).toMatchObject({
      sourceId: 'c1',
      targetId: 'c2',
      type: 'ONE_TO_MANY'
    });
  });
});