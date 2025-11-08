/**
 * applyUMLActions.ts
 *
 * Helper to apply a list of UMLAction objects over a UML diagram.
 * This module keeps a defensive implementation (uses `any`) to avoid
 * circular type imports and to be robust during early integration.
 *
 * The function returns a new diagram object (does not mutate the original).
 */

/**
 * Generate a simple unique id for relations
 */
function genId(prefix = 'rel'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * applyActionsToDiagram
 * ---------------------
 * Aplica una lista de acciones (propuestas por la AI) sobre una copia del
 * diagrama actual. Soporta un subconjunto de acciones habituales:
 *  - ADD_ATTRIBUTE, UPDATE_ATTRIBUTE, DELETE_ATTRIBUTE
 *  - CREATE_RELATION, UPDATE_RELATION, DELETE_RELATION
 *  - CREATE_CLASS, DELETE_CLASS, RENAME_CLASS
 *
 * Parámetros:
 *  - currentDiagram: objeto del diagrama actual (se clona internamente)
 *  - actions: array de acciones con estructura flexible (any)
 *
 * Retorna: diagrama nuevo con las modificaciones aplicadas.
 */
export function applyActionsToDiagram(currentDiagram: any, actions: any[]): any {
  // defensivo: asegurar estructura mínima
  const diagram = JSON.parse(JSON.stringify(currentDiagram || { classes: [], relations: [] }));
  diagram.classes = Array.isArray(diagram.classes) ? diagram.classes : [];
  diagram.relations = Array.isArray(diagram.relations) ? diagram.relations : [];
  const warnings: string[] = [];

  if (!Array.isArray(actions) || actions.length === 0) return diagram;

  for (const action of actions) {
    const type = (action && action.type) || '';
    const target = (action && action.target) || {};
    const payload = action.payload;

    // Helper: resolver referencia de clase por id o por name
    const resolveClassRef = (ref: any): string | null => {
      if (!ref) return null;
      // si ya es id y existe
      const byId = diagram.classes.find((c: any) => c.id === ref);
      if (byId) return byId.id;
      // buscar por name
      const byName = diagram.classes.find((c: any) => c.name === ref || c.name === (ref.name ?? ref));
      if (byName) return byName.id;
      return null;
    };

    switch (type) {
      case 'ADD_ATTRIBUTE': {
        const className = target.className;
        if (!className) break;
        const cls = diagram.classes.find((c: any) => c.name === className);
        if (!cls) break;
        cls.attributes = Array.isArray(cls.attributes) ? cls.attributes : [];
        const attr = payload || { name: 'nuevo', type: 'String', nullable: false };
        if (!cls.attributes.some((a: any) => a.name === attr.name)) {
          cls.attributes.push(attr);
        }
        break;
      }

      case 'UPDATE_ATTRIBUTE': {
        const className = target.className;
        const attrName = target.attributeName;
        if (!className || !attrName) break;
        const cls = diagram.classes.find((c: any) => c.name === className);
        if (!cls) break;
        cls.attributes = Array.isArray(cls.attributes) ? cls.attributes : [];
        const idx = cls.attributes.findIndex((a: any) => a.name === attrName);
        if (idx !== -1 && payload) {
          cls.attributes[idx] = { ...cls.attributes[idx], ...payload };
        }
        break;
      }

      case 'DELETE_ATTRIBUTE': {
        const className = target.className;
        const attrName = target.attributeName;
        if (!className || !attrName) break;
        const cls = diagram.classes.find((c: any) => c.name === className);
        if (!cls) break;
        cls.attributes = (cls.attributes || []).filter((a: any) => a.name !== attrName);
        break;
      }

      case 'CREATE_RELATION': {
        const rel = { ...(payload || {}) };
        diagram.relations = Array.isArray(diagram.relations) ? diagram.relations : [];

        // resolver referencias source/target por id o por name
        const sourceRef = rel.source || rel.sourceClassName || rel.sourceName;
        const targetRef = rel.target || rel.targetClassName || rel.targetName;
        const resolvedSource = resolveClassRef(sourceRef);
        const resolvedTarget = resolveClassRef(targetRef);

        if (!resolvedSource || !resolvedTarget) {
          warnings.push(`CREATE_RELATION skipped: missing class reference (source=${sourceRef} resolved=${resolvedSource}, target=${targetRef} resolved=${resolvedTarget})`);
          break;
        }

        rel.id = rel.id || genId('rel');
        rel.source = resolvedSource;
        rel.target = resolvedTarget;

        const exists = diagram.relations.some((r: any) => r.source === rel.source && r.target === rel.target && r.type === rel.type);
        if (!exists) diagram.relations.push(rel);
        break;
      }

      case 'UPDATE_RELATION': {
        const relId = target.relationId;
        if (relId) {
          const rel = (diagram.relations || []).find((r: any) => r.id === relId);
          if (rel && payload) Object.assign(rel, payload);
        } else {
          // intentar resolver por source/target/type
          const sourceRef = target.source || target.sourceClassName || target.sourceName || (payload && payload.source);
          const targetRef = target.target || target.targetClassName || target.targetName || (payload && payload.target);
          const resolvedSource = resolveClassRef(sourceRef);
          const resolvedTarget = resolveClassRef(targetRef);
          if (!resolvedSource || !resolvedTarget) {
            warnings.push(`UPDATE_RELATION skipped: cannot resolve source/target (source=${sourceRef}, target=${targetRef})`);
            break;
          }
          const rel = (diagram.relations || []).find((r: any) => r.source === resolvedSource && r.target === resolvedTarget && r.type === (target.type || payload?.type));
          if (rel && payload) Object.assign(rel, payload);
        }
        break;
      }

      case 'DELETE_RELATION': {
        const relId = target.relationId;
        if (relId) {
          diagram.relations = (diagram.relations || []).filter((r: any) => r.id !== relId);
        } else {
          const sourceRef = target.source || target.sourceClassName || target.sourceName;
          const targetRef = target.target || target.targetClassName || target.targetName;
          const resolvedSource = resolveClassRef(sourceRef);
          const resolvedTarget = resolveClassRef(targetRef);
          if (!resolvedSource || !resolvedTarget) {
            warnings.push(`DELETE_RELATION skipped: cannot resolve source/target (source=${sourceRef}, target=${targetRef})`);
            break;
          }
          diagram.relations = (diagram.relations || []).filter((r: any) => !(r.source === resolvedSource && r.target === resolvedTarget && r.type === target.type));
        }
        break;
      }

      case 'RENAME_CLASS': {
        const from = target.className;
        const to = target.newClassName;
        if (!from || !to) break;
        const cls = diagram.classes.find((c: any) => c.name === from);
        if (!cls) break;
        cls.name = to;
        (diagram.relations || []).forEach((r: any) => {
          if (r.source === from) r.source = to;
          if (r.target === from) r.target = to;
        });
        break;
      }

      case 'CREATE_CLASS': {
        const newCls = payload || {};
        if (!newCls.name) break;
        diagram.classes = Array.isArray(diagram.classes) ? diagram.classes : [];
        if (!diagram.classes.some((c: any) => c.name === newCls.name)) diagram.classes.push(newCls);
        break;
      }

      case 'DELETE_CLASS': {
        const className = target.className;
        if (!className) break;
        diagram.classes = (diagram.classes || []).filter((c: any) => c.name !== className);
        diagram.relations = (diagram.relations || []).filter((r: any) => r.source !== className && r.target !== className);
        break;
      }

      default:
        // ignore unknown action types
        break;
    }
  }

  if (warnings.length > 0) {
    // agregar advertencias en una propiedad no intrusiva
    (diagram as any)._aiWarnings = warnings;
  }

  return diagram;
}

export default applyActionsToDiagram;
