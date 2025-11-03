/**
 * Generador de la página de lista (ListPage) para una clase UML.
 * Produce una pantalla Flutter que:
 *  - Muestra una lista de objetos obtenidos desde el servicio correspondiente.
 *  - Permite crear un nuevo elemento (navegando al FormPage).
 *  - Permite editar un elemento (navegando al FormPage con el item).
 *  - Permite eliminar un elemento (llamando al servicio).
 *
 * Nota: Las plantillas generadas usan convenciones:
 *  - Archivos en lib/pages/<lower>/<lower>_list_page.dart
 *  - Modelo en lib/models/<lower>.dart con clase PascalCase
 *  - Servicio en lib/services/<lower>_service.dart con clase PascalCaseService
 */

import { UMLAttribute } from '../modelGenerator'; // Tipo que describe atributos UML
import { makeLower } from './pageHelpers'; // Helper para convertir nombres a snake_case

/** Genera el código Dart de la ListPage para la clase proporcionada */
export function generateListPageDart(
  className: string,
  attributes: UMLAttribute[]
): string {
  // Nombre en minúsculas y con guiones bajos para rutas e imports (ej: "user_profile")
  const lowerName = makeLower(className);
  // Nombre plural simple para mensajes/etiquetas (se agrega 's' al final)
  const pluralName = `${lowerName}s`;

  // Intentamos encontrar el atributo que actúa como id; si no hay, usamos el primero
  const idAttr = attributes.find(a => a.isId) || attributes[0];

  // Atributos que se mostrarán en el card de la lista (excluimos el id y tomamos hasta 3)
  const displayAttrs = attributes.filter(a => !a.isId).slice(0, 3);
  // Fragmento Dart con los Text(...) para mostrar en el subtitle del ListTile
  const displayFields = displayAttrs
    .map(attr => `                Text('${attr.name}: \${item.${attr.name}}'),`)
    .join('\n');

  // Plantilla completa retornada como string (contenido de lib/pages/<lower>/<lower>_list_page.dart)
  return `import 'package:flutter/material.dart';
import '../../models/${lowerName}.dart';
import '../../services/${lowerName}_service.dart';
import '${lowerName}_form_page.dart';

/// Página que muestra la lista de ${className}
/// - Usa ${className}Service para operaciones CRUD
/// - Permite crear, editar y eliminar items
class ${className}ListPage extends StatefulWidget {
  const ${className}ListPage({Key? key}) : super(key: key);

  @override
  State<${className}ListPage> createState() => _${className}ListPageState();
}

class _${className}ListPageState extends State<${className}ListPage> {
  // Instancia del servicio que maneja la comunicación (API/local)
  final ${className}Service _service = ${className}Service();

  // Estado local de la lista, indicador de carga y mensaje de error
  List<${className}>? _items;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Carga inicial de datos al montar el widget
    _loadData();
  }

  /// Carga los datos desde el servicio y actualiza el estado
  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final items = await _service.list();
      setState(() { _items = items; _isLoading = false; });
    } catch (e) {
      // Si hay error, lo guardamos para mostrar en UI
      setState(() { _errorMessage = e.toString(); _isLoading = false; });
    }
  }

  /**
   * Elimina un item:
   *  - Pregunta confirmación al usuario
   *  - Llama al servicio delete con el id convertido a String (el id puede ser nullable)
   *  - Actualiza la lista o muestra error en snackbar
   */
  Future<void> _deleteItem(${className} item) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar eliminación'),
        content: Text('¿Está seguro de eliminar este ${lowerName}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Eliminar'),
            style: TextButton.styleFrom(foregroundColor: Colors.red)),
        ],
      ),
    );

    if (confirm == true) {
      try {
        // Convertimos id a String por seguridad si es nullable
        await _service.delete(item.${idAttr.name}?.toString());
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('${className} eliminado correctamente')));
        _loadData();
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error al eliminar: \$e')));
      }
    }
  }

  /// Navega a la página de creación (FormPage). Si retorna true, recarga la lista.
  void _navigateToCreate() async {
    final result = await Navigator.push(context, MaterialPageRoute(builder: (context) => ${className}FormPage()));
    if (result == true) _loadData();
  }

  /// Navega a la página de edición pasando el item seleccionado
  void _navigateToEdit(${className} item) async {
    final result = await Navigator.push(context, MaterialPageRoute(builder: (context) => ${className}FormPage(item: item)));
    if (result == true) _loadData();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('${className}s'), actions: [ IconButton(icon: const Icon(Icons.add), onPressed: _navigateToCreate) ]),
      body: _buildBody(),
      floatingActionButton: FloatingActionButton(onPressed: _navigateToCreate, child: const Icon(Icons.add)),
    );
  }

  /// Construye el cuerpo de la pantalla con distintos estados (cargando, error, vacío o lista)
  Widget _buildBody() {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    if (_errorMessage != null) return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [ const Icon(Icons.error_outline, size: 64, color: Colors.red), const SizedBox(height: 16), Text('Error: \$_errorMessage'), const SizedBox(height: 16), ElevatedButton(onPressed: _loadData, child: const Text('Reintentar')) ]));

    if (_items == null || _items!.isEmpty) {
      // Estado vacío: invitamos a crear el primer elemento
      return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [ const Icon(Icons.inbox, size: 64, color: Colors.grey), const SizedBox(height: 16), const Text('No hay ${pluralName} registrados'), const SizedBox(height: 16), ElevatedButton(onPressed: _navigateToCreate, child: const Text('Crear el primero')) ]));
    }

    // Lista poblada: mostramos cada item en un Card con título, subtítulo y acciones
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        itemCount: _items!.length,
        padding: const EdgeInsets.all(8),
        itemBuilder: (context, index) {
          final item = _items![index];
          return Card(margin: const EdgeInsets.symmetric(vertical: 4), child: ListTile(
            // Título muestra el id del item
            title: Text('${className} #\${item.${idAttr.name}}'),
            // Subtítulo muestra los campos seleccionados (displayFields)
            subtitle: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
${displayFields}
            ]),
            // Botón eliminar que llama a _deleteItem
            trailing: IconButton(icon: const Icon(Icons.delete, color: Colors.red), onPressed: () => _deleteItem(item)),
            // Tap para editar
            onTap: () => _navigateToEdit(item),
          ));
        },
      ),
    );
  }
 }
`;}