import { describe, it, expect } from 'vitest';
import { serializeDiagram } from '../diagramSerializer';
import type { UMLDiagram } from '../../../../types/uml';

describe('serializeDiagram', () => {
  it('serializa correctamente clases y relaciones (source/target como nombres de clases)', () => {
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
          source: 'c1', // ID de la clase
          target: 'c2', // ID de la clase
          sourceCardinality: '1',
          targetCardinality: '*'
        } as any
      ]
    };

    const result = serializeDiagram(mockDiagram);

    expect(result.name).toBe('TestDiagram');
    expect(result.package).toBe('com.test');
    expect(result.classes).toHaveLength(2);
    expect(result.classes[0]).toMatchObject({ id: 'c1', name: 'User' });
    expect(result.classes[1]).toMatchObject({ id: 'c2', name: 'Post' });
    expect(result.relations).toHaveLength(1);
    // El serializador convierte IDs a nombres de clases
    expect(result.relations[0]).toMatchObject({
      id: 'r1',
      source: 'User', // Convertido de 'c1' a 'User'
      target: 'Post', // Convertido de 'c2' a 'Post'
      type: 'ONE_TO_MANY',
      sourceCardinality: '1',
      targetCardinality: '*'
    });
  });
});