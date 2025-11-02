import { mapUmlTypeToDart, generateFromJsonCode, generateToJsonCode } from '../utils/typeMapper';
import { ProcessedRelation } from '../utils/relationMapper';

/**
 * Representa un atributo de clase UML
 */
export interface UMLAttribute {
  name: string;
  type: string;
  nullable?: boolean;
  unique?: boolean;
  isId?: boolean;
}

/**
 * Representa una clase UML completa
 */
export interface UMLClass {
  id?: string;
  name: string;
  attributes: UMLAttribute[];
  methods?: Array<{ name: string; returnType: string; parameters?: any[] }>;
}

/**
 * Genera un modelo Dart completo con:
 * - Campos de la clase
 * - Campos de relaciones
 * - Constructor con parámetros nombrados
 * - factory fromJson()
 * - Map<String, dynamic> toJson()
 * - copyWith() para inmutabilidad
 * 
 * @param umlClass - Clase UML del diagrama
 * @param relations - Relaciones procesadas donde esta clase es origen
 * @returns Código Dart del modelo
 */
export function generateModelDart(
  umlClass: UMLClass,
  relations: ProcessedRelation[] = []
): string {
  const className = umlClass.name;
  const attributes = umlClass.attributes || [];

  // ============ CAMPOS ============
  
  const attributeFields = attributes.map(attr => {
    const isId = attr.isId ?? false;
    const dartType = mapUmlTypeToDart(attr.type);
    // Si es ID lo tratamos como nullable para permitir creación sin id
    const nullSuffix = (attr.nullable || isId) ? '?' : '';
    const comment = isId ? '  /// Identificador único\n' : '';
    return `${comment}  final ${dartType}${nullSuffix} ${attr.name};`;
  });

  const relationFields = relations.map(rel => {
    const nullSuffix = rel.nullable ? '?' : '';
    return `  /// Relación con ${rel.targetClass}\n  final ${rel.dartType}${nullSuffix} ${rel.fieldName};`;
  });

  const allFields = [...attributeFields, ...relationFields].join('\n');

  // ============ CONSTRUCTOR ============
  
  const attributeParams = attributes.map(attr => {
    const isId = attr.isId ?? false;
    const required = (attr.nullable || isId) ? '' : 'required ';
    return `    ${required}this.${attr.name},`;
  });

  const relationParams = relations.map(rel => {
    const required = rel.nullable ? '' : 'required ';
    return `    ${required}this.${rel.fieldName},`;
  });

  const allParams = [...attributeParams, ...relationParams].join('\n');

  // ============ FROM JSON ============
  
  const attributesFromJson = attributes.map(attr => {
    const dartType = mapUmlTypeToDart(attr.type);
    const code = generateFromJsonCode(attr.name, dartType, attr.nullable ?? false);
    return `      ${attr.name}: ${code},`;
  });

  const relationsFromJson = relations.map(rel => {
    if (rel.isList) {
      // Lista de modelos: parsear cada elemento
      const targetClass = rel.targetClass;
      return rel.nullable
        ? `      ${rel.fieldName}: json['${rel.fieldName}'] != null ? (json['${rel.fieldName}'] as List).map((e) => ${targetClass}.fromJson(e)).toList() : null,`
        : `      ${rel.fieldName}: json['${rel.fieldName}'] != null ? (json['${rel.fieldName}'] as List).map((e) => ${targetClass}.fromJson(e)).toList() : [],`;
    } else {
      // Modelo único
      return rel.nullable
        ? `      ${rel.fieldName}: json['${rel.fieldName}'] != null ? ${rel.targetClass}.fromJson(json['${rel.fieldName}']) : null,`
        : `      ${rel.fieldName}: ${rel.targetClass}.fromJson(json['${rel.fieldName}'] ?? {}),`;
    }
  });

  const allFromJson = [...attributesFromJson, ...relationsFromJson].join('\n');

  // ============ TO JSON ============
  
  const attributesToJson = attributes.map(attr => {
    const dartType = mapUmlTypeToDart(attr.type);
    const code = generateToJsonCode(attr.name, dartType);
    return `      '${attr.name}': ${code},`;
  });

  const relationsToJson = relations.map(rel => {
    if (rel.isList) {
      return `      '${rel.fieldName}': ${rel.fieldName}?.map((e) => e.toJson()).toList(),`;
    } else {
      return `      '${rel.fieldName}': ${rel.fieldName}?.toJson(),`;
    }
  });

  const allToJson = [...attributesToJson, ...relationsToJson].join('\n');

  // ============ COPY WITH ============
  
  const copyWithParams = [
    ...attributes.map(attr => {
      const dartType = mapUmlTypeToDart(attr.type);
      const nullSuffix = attr.nullable ? '?' : '';
      return `    ${dartType}${nullSuffix}? ${attr.name},`;
    }),
    ...relations.map(rel => {
      const nullSuffix = rel.nullable ? '?' : '';
      return `    ${rel.dartType}${nullSuffix}? ${rel.fieldName},`;
    })
  ].join('\n');

  const copyWithAssignments = [
    ...attributes.map(attr => `      ${attr.name}: ${attr.name} ?? this.${attr.name},`),
    ...relations.map(rel => `      ${rel.fieldName}: ${rel.fieldName} ?? this.${rel.fieldName},`)
  ].join('\n');

  // ============ TEMPLATE FINAL ============

  return `/// Modelo generado: ${className}
/// Representa una entidad del dominio con sus atributos y relaciones
class ${className} {
${allFields}

  /// Constructor con parámetros nombrados
  const ${className}({
${allParams}
  });

  /// Crea una instancia desde un mapa JSON
  factory ${className}.fromJson(Map<String, dynamic> json) {
    return ${className}(
${allFromJson}
    );
  }

  /// Convierte la instancia a un mapa JSON
  Map<String, dynamic> toJson() {
    return {
${allToJson}
    };
  }

  /// Crea una copia con campos modificados (inmutabilidad)
  ${className} copyWith({
${copyWithParams}
  }) {
    return ${className}(
${copyWithAssignments}
    );
  }

  @override
  String toString() => '${className}(${attributes.map(a => `${a.name}: \$${a.name}`).join(', ')})';

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ${className} && ${attributes.map(a => `other.${a.name} == ${a.name}`).join(' && ')};
  }

  @override
  int get hashCode => Object.hash(${attributes.map(a => a.name).join(', ')});
}
`;
}