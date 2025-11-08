import { describe, it, expect } from 'vitest';
import createManyToMany from '../createManyToMany';

describe('createManyToMany helper', () => {
  it('creates relation and join class with metadata hiddenInCanvas true by default', () => {
    const diagram = {
      id: 'd1',
      name: 'D',
      package: 'com.example',
      classes: [
        { id: 'c1', name: 'Usuario', attributes: [], methods: [], position: { x: 100, y: 100 }, width: 200, height: 120 },
        { id: 'c2', name: 'Rol', attributes: [], methods: [], position: { x: 400, y: 100 }, width: 200, height: 120 }
      ],
      relations: [],
      createdAt: new Date(),
      updatedAt: new Date()
    } as any;

    const relationData = {
      source: 'c1',
      target: 'c2',
      type: 'MANY_TO_MANY',
      sourceCardinality: '*',
      targetCardinality: '*',
      label: 'tiene_roles'
    } as any;

    const joinConfig = { name: 'UsuarioRol', attributes: [{ name: 'usuario_id', type: 'Long' }, { name: 'rol_id', type: 'Long' }] };

    const res = createManyToMany(diagram, relationData, joinConfig);

    // relation created
    expect(res.relations.length).toBe(1);
    const rel = res.relations[0];
    expect(rel.type).toBe('MANY_TO_MANY');
    expect(rel.source).toBe('c1');
    expect(rel.target).toBe('c2');

    // join class created
    const join = res.classes.find((c: any) => c.name === 'UsuarioRol');
    expect(join).toBeDefined();
    expect((join as any).metadata).toBeDefined();
    expect((join as any).metadata.generatedJoinFor).toEqual(['c1', 'c2']);
    expect((join as any).metadata.hiddenInCanvas).toBe(true);

    // attributes preserved
    expect(join.attributes.some((a: any) => a.name === 'usuario_id')).toBe(true);
    expect(join.attributes.some((a: any) => a.name === 'rol_id')).toBe(true);
  });
});
