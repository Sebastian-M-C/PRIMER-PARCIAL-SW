import * as fs from 'fs';
import * as path from 'path';

// Helpers localizados para no depender de exports del generador principal
function toJavaClassName(name: string): string {
  if (!name) return 'GeneratedClass';
  const parts = name.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (parts.length === 0) return 'GeneratedClass';
  const pascal = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  if (!/^[A-Za-z]/.test(pascal)) return `C${pascal}`;
  return pascal;
}

function toSafeName(name: string): string {
  return toJavaClassName(name).toLowerCase();
}

function isIdLikeAttribute(attr: any): boolean {
  const name = (attr?.name || '').trim();
  if (!name) return false;
  if (attr?.isId) return true;
  const lower = name.toLowerCase();
  if (lower === 'id') return true;
  return /^id([A-Z_0-9].*)?$/.test(name);
}

function normalizeType(t: string): string {
  return (t || '').trim().toLowerCase();
}

function generateSampleJson(cls: any, includeId: boolean = true): string {
  const sample: any = {};

  for (const attr of cls.attributes || []) {
    if (!includeId && isIdLikeAttribute(attr)) continue;
    const norm = normalizeType(attr.type);
    if (['long','integer','int','number'].includes(norm)) { sample[attr.name] = 1; continue; }
    if (['float','double','decimal','bigdecimal','money'].includes(norm)) { sample[attr.name] = 99.99; continue; }
    if (['boolean','bool'].includes(norm)) { sample[attr.name] = true; continue; }
    if (['date'].includes(norm)) { sample[attr.name] = '2025-11-09'; continue; }
    if (['datetime','timestamp','localdatetime'].includes(norm)) { sample[attr.name] = '2025-11-09T12:00:00Z'; continue; }
    if (['time','localtime'].includes(norm)) { sample[attr.name] = '12:00:00'; continue; }
    // default string
    sample[attr.name] = `Sample ${attr.name}`;
  }

  return JSON.stringify(sample, null, 2);
}

export async function generatePostmanCollection(projectDir: string, projectName: string, classes: any[]): Promise<void> {
  // Base fija solicitada por el usuario
  const defaultBase = 'http://localhost:8080';

  const collection: any = {
    info: {
      name: `${projectName} API`,
      description: `Generated API collection for ${projectName}`,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    // Variable de colección para reconfigurar fácilmente
    variable: [
      { key: 'baseUrl', value: defaultBase }
    ],
    item: []
  };

  for (const cls of classes) {
    const className = toSafeName(toJavaClassName(cls.name));

    const folder = {
      name: cls.name,
      item: [
        {
          name: `Create ${cls.name}`,
          request: {
            method: 'POST',
            header: [
              { key: 'Content-Type', value: 'application/json' }
            ],
            body: {
              mode: 'raw',
              raw: generateSampleJson(cls, false)
            },
            url: {
              raw: `${defaultBase}/api/${className}s`,
              path: ['api', `${className}s`]
            }
          }
        },
        {
          name: `Get All ${cls.name}s`,
          request: {
            method: 'GET',
            url: {
              raw: `${defaultBase}/api/${className}s`,
              path: ['api', `${className}s`]
            }
          }
        },
        {
          name: `Get ${cls.name} by ID`,
          request: {
            method: 'GET',
            url: {
              raw: `${defaultBase}/api/${className}s/1`,
              path: ['api', `${className}s`, '1']
            }
          }
        },
        {
          name: `Update ${cls.name}`,
          request: {
            method: 'PUT',
            header: [
              { key: 'Content-Type', value: 'application/json' }
            ],
            body: {
              mode: 'raw',
              raw: generateSampleJson(cls, false)
            },
            url: {
              raw: `${defaultBase}/api/${className}s/1`,
              path: ['api', `${className}s`, '1']
            }
          }
        },
        {
          name: `Delete ${cls.name}`,
          request: {
            method: 'DELETE',
            url: {
              raw: `${defaultBase}/api/${className}s/1`,
              path: ['api', `${className}s`, '1']
            }
          }
        }
      ]
    };

    collection.item.push(folder as any);
  }

  // Carpeta utilitaria con healthcheck usando base por defecto y variable
  collection.item.push({
    name: 'Utilities',
    item: [
      {
        name: 'Health (fixed url)',
        request: {
          method: 'GET',
          url: { raw: `${defaultBase}/health` }
        }
      },
      {
        name: 'Health (variable baseUrl)',
        request: {
          method: 'GET',
          url: { raw: `{{baseUrl}}/health`, path: ['health'] }
        }
      }
    ]
  });

  await fs.promises.writeFile(
    path.join(projectDir, 'docs', `${projectName}-postman-collection.json`),
    JSON.stringify(collection, null, 2)
  );
}
