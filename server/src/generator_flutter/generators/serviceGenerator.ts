/**
 * Genera un servicio Dart para consumir API REST
 * Incluye métodos CRUD completos:
 * - getAll() → GET /api/<resource>
 * - getById(id) → GET /api/<resource>/:id
 * - create(model) → POST /api/<resource>
 * - update(id, model) → PUT /api/<resource>/:id
 * - delete(id) → DELETE /api/<resource>/:id
 * 
 * @param className - Nombre de la clase (ej: Usuario)
 * @param baseUrl - URL base de la API (ej: http://localhost:3000)
 * @param resourcePath - Path del recurso (ej: usuarios)
 * @returns Código Dart del servicio
 */
export function generateServiceDart(
  className: string,
  baseUrl: string = 'http://localhost:3000',
  resourcePath?: string
): string {
  // Normalizar a snake_case para nombres de archivo/import y resourcePath
  const makeLower = (n: string) =>
    n.replace(/[^\w\s]/g, '').replace(/\s+/g, '_').toLowerCase();
  const lowerName = makeLower(className);
  const resource = resourcePath || `${lowerName}s`;
  const serviceName = `${className}Service`;
  const modelImport = lowerName;

  return `import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/${modelImport}.dart';

/// Servicio para gestionar operaciones CRUD de ${className}
/// Consume la API REST del backend
class ${serviceName} {
  /// URL base de la API
  static const String baseUrl = '${baseUrl}';
  
  /// Path del recurso en la API
  static const String resourcePath = '${resource}';
  
  /// URL completa del endpoint
  static String get endpoint => '\$baseUrl/api/\$resourcePath';

  /// Obtiene todas las instancias de ${className}
  /// 
  /// Realiza GET /api/${resource}
  /// @returns Lista de objetos ${className}
  /// @throws Exception si falla la petición
  Future<List<${className}>> getAll() async {
    try {
      final response = await http.get(
        Uri.parse(endpoint),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final List<dynamic> jsonList = json.decode(response.body);
        return jsonList.map((json) => ${className}.fromJson(json)).toList();
      } else {
        throw Exception('Error al obtener ${resource}: \${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de red al obtener ${resource}: \$e');
    }
  }

  /// Obtiene una instancia específica de ${className} por ID
  /// 
  /// Realiza GET /api/${resource}/:id
  /// @param id - Identificador único
  /// @returns Objeto ${className}
  /// @throws Exception si falla la petición o no existe
  Future<${className}> getById(dynamic id) async {
    try {
      final response = await http.get(
        Uri.parse('\$endpoint/\$id'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        return ${className}.fromJson(json.decode(response.body));
      } else if (response.statusCode == 404) {
        throw Exception('${className} con ID \$id no encontrado');
      } else {
        throw Exception('Error al obtener ${className}: \${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error de red al obtener ${className}: \$e');
    }
  }

  /// Crea una nueva instancia de ${className}
  /// 
  /// Realiza POST /api/${resource}
  /// @param item - Objeto ${className} a crear
  /// @returns Objeto ${className} creado (con ID asignado)
  /// @throws Exception si falla la petición
  Future<${className}> create(${className} item) async {
    try {
      final response = await http.post(
        Uri.parse(endpoint),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(item.toJson()),
      );

      if (response.statusCode == 201 || response.statusCode == 200) {
        return ${className}.fromJson(json.decode(response.body));
      } else {
        throw Exception('Error al crear ${className}: \${response.statusCode} - \${response.body}');
      }
    } catch (e) {
      throw Exception('Error de red al crear ${className}: \$e');
    }
  }

  /// Actualiza una instancia existente de ${className}
  /// 
  /// Realiza PUT /api/${resource}/:id
  /// @param id - Identificador único
  /// @param item - Objeto ${className} con datos actualizados
  /// @returns Objeto ${className} actualizado
  /// @throws Exception si falla la petición
  Future<${className}> update(dynamic id, ${className} item) async {
    try {
      final response = await http.put(
        Uri.parse('\$endpoint/\$id'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode(item.toJson()),
      );

      if (response.statusCode == 200) {
        return ${className}.fromJson(json.decode(response.body));
      } else if (response.statusCode == 404) {
        throw Exception('${className} con ID \$id no encontrado');
      } else {
        throw Exception('Error al actualizar ${className}: \${response.statusCode} - \${response.body}');
      }
    } catch (e) {
      throw Exception('Error de red al actualizar ${className}: \$e');
    }
  }

  /// Elimina una instancia de ${className}
  /// 
  /// Realiza DELETE /api/${resource}/:id
  /// @param id - Identificador único
  /// @throws Exception si falla la petición
  Future<void> delete(dynamic id) async {
    try {
      final response = await http.delete(
        Uri.parse('\$endpoint/\$id'),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode != 200 && response.statusCode != 204) {
        if (response.statusCode == 404) {
          throw Exception('${className} con ID \$id no encontrado');
        } else {
          throw Exception('Error al eliminar ${className}: \${response.statusCode}');
        }
      }
    } catch (e) {
      throw Exception('Error de red al eliminar ${className}: \$e');
    }
  }
}
`;
}