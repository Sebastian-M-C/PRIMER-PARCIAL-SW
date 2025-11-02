/**
 * Generador de la página de formulario (FormPage) para una clase UML.
 * Produce el código Dart de una pantalla que permite crear/editar instancias
 * de la clase recibida. Los comentarios explicativos están en español.
 */

import { UMLAttribute } from '../modelGenerator';
import { makeLower, valueFromController } from './pageHelpers';

/** Genera FormPage */
export function generateFormPageDart(
  className: string,
  attributes: UMLAttribute[]
): string {
  // Nombre en minúsculas/underscore para rutas e imports de archivos
  const lowerName = makeLower(className);

  // Atributos editables: excluimos el id (isId) porque normalmente no se edita
  const editableAttrs = attributes.filter(a => !a.isId);

  // Genera declaraciones de TextEditingController para cada campo editable
  const controllers = editableAttrs
    .map(attr => `  final TextEditingController _${attr.name}Controller = TextEditingController();`)
    .join('\n');

  // Inicializa los controllers con los valores del item si estamos en edición
  const initControllers = editableAttrs
    .map(attr => `      _${attr.name}Controller.text = widget.item?.${attr.name}?.toString() ?? '';`)
    .join('\n');

  // Genera las llamadas a dispose() para cada controller
  const disposeControllers = editableAttrs
    .map(attr => `    _${attr.name}Controller.dispose();`)
    .join('\n');

  // Genera los campos del formulario (TextFormField) con su validador cuando es requerido
  const formFields = editableAttrs
    .map(attr => {
      const isRequired = !attr.nullable;
      // Validador en español: comprueba null o cadena vacía
      const validator = isRequired
        ? `validator: (value) => (value == null || value.isEmpty) ? 'Campo requerido' : null,`
        : '';
      return `            TextFormField(controller: _${attr.name}Controller, decoration: InputDecoration(labelText: '${attr.name}', border: const OutlineInputBorder()), ${validator}),`;
    })
    .join('\n            const SizedBox(height: 16),\n');

  // Construye la asignación de campos del objeto usando conversiones seguras desde los controllers
  // valueFromController devuelve la expresión Dart adecuada según el tipo (DateTime/int/double/etc.)
  const buildObject = editableAttrs
    .map(attr => `        ${attr.name}: ${valueFromController(attr)},`)
    .join('\n');

  // Plantilla Dart completa de la página de formulario
  return `import 'package:flutter/material.dart';
import '../../models/${lowerName}.dart';
import '../../services/${lowerName}_service.dart';

class ${className}FormPage extends StatefulWidget {
  // item: si se proporciona, la página funciona en modo edición; si es null, en modo creación
  final ${className}? item;
  const ${className}FormPage({Key? key, this.item}) : super(key: key);

  @override
  State<${className}FormPage> createState() => _${className}FormPageState();
}

class _${className}FormPageState extends State<${className}FormPage> {
  // Clave del formulario para validación
  final _formKey = GlobalKey<FormState>();
  final ${className}Service _service = ${className}Service();
${controllers}
  bool _isLoading = false;
  //Indicador si se trata de edición (item != null)
  bool get _isEditing => widget.item != null;

  @override
  void initState() {
    super.initState();
    // Si estamos editando, inicializamos los controllers con los valores del item
    if (_isEditing) {
${initControllers}
    }
  }

  @override
  void dispose() {
${disposeControllers}
    super.dispose();
  }

  // Función que guarda el formulario: valida, construye el objeto y llama al servicio
  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      // Construimos la instancia del modelo usando las expresiones generadas
      final item = ${className}(
${buildObject}
      );

      if (_isEditing) {
        // Si editamos, usamos el id del item original para el update
        await _service.update(widget.item!.${attributes.find(a => a.isId)?.name || 'id'}, item);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('${className} actualizado correctamente')));
      } else {
        // Si creamos, llamamos al servicio create
        await _service.create(item);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('${className} creado correctamente')));
      }

      // Volvemos con resultado true para que la lista recargue
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      // Mostramos error en snackbar si ocurre una excepción
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: \$e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEditing ? 'Editar ${className}' : 'Crear ${className}')),
      body: _isLoading ? const Center(child: CircularProgressIndicator()) : SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
${formFields}
            const SizedBox(height: 24),
            Row(children: [
              // Botón cancelar: regresa sin cambios
              Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar'))),
              const SizedBox(width: 16),
              // Botón guardar: ejecuta _save()
              Expanded(child: ElevatedButton(onPressed: _save, child: Text(_isEditing ? 'Actualizar' : 'Crear'))),
            ]),
          ]),
        ),
      ),
    );
  }
}
`;}