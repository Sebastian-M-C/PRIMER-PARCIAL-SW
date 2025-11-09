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

function generateSampleJson(cls: any, includeId: boolean = true): string {
  const sample: any = {};

  for (const attr of cls.attributes || []) {
    if (attr.isId && !includeId) continue;

    switch (attr.type) {
      case 'String':
        sample[attr.name] = `Sample ${attr.name}`;
        break;
      case 'Long':
      case 'Integer':
        sample[attr.name] = 1;
        break;
      case 'Boolean':
        sample[attr.name] = true;
        break;
      case 'LocalDateTime':
        sample[attr.name] = '2023-12-01T10:00:00';
        break;
      case 'BigDecimal':
        sample[attr.name] = 99.99;
        break;
      default:
        sample[attr.name] = `Sample ${attr.name}`;
    }
  }

  return JSON.stringify(sample, null, 2);
}

export async function generatePostmanCollection(projectDir: string, projectName: string, classes: any[]): Promise<void> {
  const defaultBase = 'http://localhost:8080';
  const baseUrl = `${defaultBase}/api`;

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
              raw: `${baseUrl}/${className}s`
            }
          }
        },
        {
          name: `Get All ${cls.name}s`,
          request: {
            method: 'GET',
            url: {
              raw: `${baseUrl}/${className}s`
            }
          }
        },
        {
          name: `Get ${cls.name} by ID`,
          request: {
            method: 'GET',
            url: {
              raw: `${baseUrl}/${className}s/1`
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
              raw: `${baseUrl}/${className}s/1`
            }
          }
        },
        {
          name: `Delete ${cls.name}`,
          request: {
            method: 'DELETE',
            url: {
              raw: `${baseUrl}/${className}s/1`
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
          url: { raw: `{{baseUrl}}/health` }
        }
      }
    ]
  });

  await fs.promises.writeFile(
    path.join(projectDir, 'docs', `${projectName}-postman-collection.json`),
    JSON.stringify(collection, null, 2)
  );
}
