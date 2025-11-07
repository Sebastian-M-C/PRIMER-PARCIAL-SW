import { describe, it, expect, vi } from 'vitest';
import { importUMLFromString } from '../useDiagramActions';

describe('importUMLFromString (integration)', () => {
  it('remapea correctamente relaciones referenciadas por id y por name', () => {
    const umlJson = {
      name: 'ImportTest',
      package: 'com.test',
      classes: [
        { id: 'orig-1', name: 'User', attributes: [{ name: 'id', type: 'Long' }] },
        { name: 'Order', attributes: [] } // sin id original -> debe generarse uno nuevo
      ],
      relations: [
        { id: 'r1', type: 'ONE_TO_MANY', source: 'orig-1', target: 'Order', sourceCardinality: '1', targetCardinality: '*' }
      ]
    };

    const text = JSON.stringify(umlJson);
    const setDiagram = vi.fn();
    const selectClass = vi.fn();
    const selectRelation = vi.fn();

    importUMLFromString(text, setDiagram, selectClass, selectRelation);

    expect(setDiagram).toHaveBeenCalled();
    const diagram = setDiagram.mock.calls[0][0];
    expect(diagram.name).toBe('ImportTest');
    expect(diagram.classes.length).toBe(2);

    const user = diagram.classes.find((c: any) => c.name === 'User');
    const order = diagram.classes.find((c: any) => c.name === 'Order');
    expect(user).toBeDefined();
    expect(order).toBeDefined();
    expect(diagram.relations.length).toBe(1);

    const rel = diagram.relations[0];
    expect(rel.source).toBe(user.id);
    expect(rel.target).toBe(order.id);

    expect(selectClass).toHaveBeenCalledWith(null);
    expect(selectRelation).toHaveBeenCalledWith(null);
  });

  it('asigna ids únicos cuando hay ids duplicados en la importación', () => {
    const umlJson = {
      classes: [
        { id: 'dup', name: 'A' },
        { id: 'dup', name: 'B' }
      ],
      relations: []
    };

    const setDiagram = vi.fn();
    importUMLFromString(JSON.stringify(umlJson), setDiagram);

    const diagram = setDiagram.mock.calls[0][0];
    expect(diagram.classes.length).toBe(2);
    const ids = diagram.classes.map((c: any) => c.id);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('lanza error si una relación referencia una clase inexistente', () => {
    const umlJson = {
      classes: [{ id: 'c1', name: 'Only' }],
      relations: [{ id: 'r1', type: 'ONE_TO_ONE', source: 'c1', target: 'Missing' }]
    };

    expect(() => importUMLFromString(JSON.stringify(umlJson), () => {})).toThrow(/Relación inválida/);
  });
});