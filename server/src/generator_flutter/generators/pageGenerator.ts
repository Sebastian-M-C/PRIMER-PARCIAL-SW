import { UMLAttribute } from './modelGenerator';

/**
 * Genera una página de lista (ListView) para una clase
 * Incluye:
 * - AppBar con título y botón de crear
 * - Lista de items con información clave
 * - Navegación a formulario de edición
 * - Botón de eliminar por item
 * - Manejo de estados: loading, error, vacío
 * 
 * @param className - Nombre de la clase (ej: Usuario)
 * @param attributes - Atributos de la clase
 * @returns Código Dart de la página de lista
 */
export function generateListPageDart(
  className: string,
  attributes: UMLAttribute[]
): string {
  const lowerName = className.toLowerCase();
  const pluralName = `${lowerName}s`;
  
  // Buscar atributo ID
  const idAttr = attributes.find(a => a.isId) || attributes[0];
  
  // Buscar atributos para mostrar en el card (primeros 3 no-ID)
  const displayAttrs = attributes
    .filter(a => !a.isId)
    .slice(0, 3);

  const displayFields = displayAttrs.map(attr => {
    return `                Text('${attr.name}: \${item.${attr.name}}'),`;
  }).join('\n');

  return `import 'package:flutter/material.dart';
import '../../models/${lowerName}.dart';
import '../../services/${lowerName}_service.dart';
import '${lowerName}_form_page.dart';

/// Página que muestra la lista completa de ${className}
/// Permite navegar al formulario de creación/edición y eliminar items
class ${className}ListPage extends StatefulWidget {
  const ${className}ListPage({Key? key}) : super(key: key);

  @override
  State<${className}ListPage> createState() => _${className}ListPageState();
}

class _${className}ListPageState extends State<${className}ListPage> {
  final ${className}Service _service = ${className}Service();
  List<${className}>? _items;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  /// Carga los datos desde el servicio
  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final items = await _service.getAll();
      setState(() {
        _items = items;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  /// Elimina un item y recarga la lista
  Future<void> _deleteItem(${className} item) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar eliminación'),
        content: Text('¿Está seguro de eliminar este ${lowerName}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Eliminar'),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await _service.delete(item.${idAttr.name});
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('${className} eliminado correctamente')),
        );
        _loadData();
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al eliminar: \$e')),
        );
      }
    }
  }

  /// Navega al formulario de creación
  void _navigateToCreate() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const ${className}FormPage(),
      ),
    );

    if (result == true) {
      _loadData();
    }
  }

  /// Navega al formulario de edición
  void _navigateToEdit(${className} item) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ${className}FormPage(item: item),
      ),
    );

    if (result == true) {
      _loadData();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('${className}s'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _navigateToCreate,
            tooltip: 'Crear ${className}',
          ),
        ],
      ),
      body: _buildBody(),
      floatingActionButton: FloatingActionButton(
        onPressed: _navigateToCreate,
        child: const Icon(Icons.add),
        tooltip: 'Crear ${className}',
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text('Error: \$_errorMessage'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadData,
              child: const Text('Reintentar'),
            ),
          ],
        ),
      );
    }

    if (_items == null || _items!.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.inbox, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('No hay ${pluralName} registrados'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _navigateToCreate,
              child: const Text('Crear el primero'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        itemCount: _items!.length,
        padding: const EdgeInsets.all(8),
        itemBuilder: (context, index) {
          final item = _items![index];
          return Card(
            margin: const EdgeInsets.symmetric(vertical: 4),
            child: ListTile(
              title: Text('${className} #\${item.${idAttr.name}}'),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
${displayFields}
                ],
              ),
              trailing: IconButton(
                icon: const Icon(Icons.delete, color: Colors.red),
                onPressed: () => _deleteItem(item),
              ),
              onTap: () => _navigateToEdit(item),
            ),
          );
        },
      ),
    );
  }
}
`;
}

/**
 * Genera una página de formulario (Create/Edit) para una clase
 * Incluye:
 * - Campos de entrada por cada atributo
 * - Validaciones básicas
 * - Botones de guardar y cancelar
 * - Modo creación vs edición
 * - Manejo de errores
 * 
 * @param className - Nombre de la clase
 * @param attributes - Atributos de la clase
 * @returns Código Dart de la página de formulario
 */
export function generateFormPageDart(
  className: string,
  attributes: UMLAttribute[]
): string {
  const lowerName = className.toLowerCase();
  
  // Filtrar ID (no editable)
  const editableAttrs = attributes.filter(a => !a.isId);
  
  // Generar controladores
  const controllers = editableAttrs.map(attr => {
    return `  final TextEditingController _${attr.name}Controller = TextEditingController();`;
  }).join('\n');

  // Inicializar valores en initState
  const initControllers = editableAttrs.map(attr => {
    return `      _${attr.name}Controller.text = widget.item?.${attr.name}?.toString() ?? '';`;
  }).join('\n');

  // Dispose de controladores
  const disposeControllers = editableAttrs.map(attr => {
    return `    _${attr.name}Controller.dispose();`;
  }).join('\n');

  // Generar campos del formulario
  const formFields = editableAttrs.map(attr => {
    const isRequired = !attr.nullable;
    const validator = isRequired 
      ? `validator: (value) => value?.isEmpty ?? true ? 'Campo requerido' : null,`
      : '';

    return `            TextFormField(
              controller: _${attr.name}Controller,
              decoration: InputDecoration(
                labelText: '${attr.name}',
                border: const OutlineInputBorder(),
              ),
              ${validator}
            ),`;
  }).join('\n            const SizedBox(height: 16),\n');

  // Construir objeto desde formulario
  const buildObject = editableAttrs.map(attr => {
    return `        ${attr.name}: _${attr.name}Controller.text,`;
  }).join('\n');

  return `import 'package:flutter/material.dart';
import '../../models/${lowerName}.dart';
import '../../services/${lowerName}_service.dart';

/// Página de formulario para crear o editar ${className}
/// Si se pasa un item, entra en modo edición
class ${className}FormPage extends StatefulWidget {
  final ${className}? item;

  const ${className}FormPage({Key? key, this.item}) : super(key: key);

  @override
  State<${className}FormPage> createState() => _${className}FormPageState();
}

class _${className}FormPageState extends State<${className}FormPage> {
  final _formKey = GlobalKey<FormState>();
  final ${className}Service _service = ${className}Service();
  
${controllers}
  
  bool _isLoading = false;
  bool get _isEditing => widget.item != null;

  @override
  void initState() {
    super.initState();
    if (_isEditing) {
${initControllers}
    }
  }

  @override
  void dispose() {
${disposeControllers}
    super.dispose();
  }

  /// Guarda el formulario (crea o actualiza)
  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final item = ${className}(
${buildObject}
      );

      if (_isEditing) {
        await _service.update(widget.item!.${attributes.find(a => a.isId)?.name || 'id'}, item);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('${className} actualizado correctamente')),
          );
        }
      } else {
        await _service.create(item);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('${className} creado correctamente')),
          );
        }
      }

      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: \$e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Editar ${className}' : 'Crear ${className}'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
${formFields}
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(context),
                            child: const Text('Cancelar'),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _save,
                            child: Text(_isEditing ? 'Actualizar' : 'Crear'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
`;
}