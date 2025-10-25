# Contexto de Desarrollo — Estándares de Codificación

Este documento define los estándares obligatorios que deben seguirse en todo el proyecto para mantener consistencia, claridad y calidad del código. Se aplican al backend (NestJS), frontend (React) y cualquier integración futura.

## Principios generales
- Priorizar legibilidad, evitar duplicación y favorecer la modularidad.
- Validar código contra factores de calidad: correctitud, eficiencia, fiabilidad, mantenibilidad, portabilidad y seguridad.
- Usar control de versiones con commits claros y mensajes descriptivos.

## 1. Comentarios y documentación
-Documentación: usar comentarios JSDoc/TSDoc (/** ... */) con etiquetas @param, @returns, @throws, @example.
DTOs/entidades: anotar propiedades con @ApiProperty (from @nestjs/swagger) para generar docs OpenAPI y mantener JSDoc en clases/propiedades.
Validación: combinar class-validator/class-transformer con DTOs bien documentados.



## 2. Nombres (convención en español)
- Usar nombres en español para variables, funciones y clases (ej.: `ProyectoListaCrear`, `obtenerUsuario`, `validarEntrada`).
- Evitar abreviaturas ambiguas; si se usan, documentarlas.
- Clases en PascalCase, funciones y variables en camelCase o snake_case según el lenguaje (mantener coherencia por repo).

## 3. Frontend — estructura y navegación
- Usar React Router para la navegación y rutas claras.
- Componentes reutilizables y pequeños; cada componente debe tener una sola responsabilidad.
- Mantener estructura modular: components/, pages/, hooks/, store/, services/.
- Evitar componentes monolíticos; dividir en subcomponentes cuando la longitud o la complejidad aumente.

## 4. Backend (NestJS) y APIs
- El backend debe implementarse con NestJS y TypeScript.
- Estructura modular basada en módulos, controladores, servicios y proveedores (Modules → Controllers → Services/Providers).
- Validación y transformación:
  - Usar DTOs con class-validator y class-transformer.
  - Aplicar Pipes para validación/global transform y Guards para autorización.
- Convenciones de nombres en español: DTOs y clases en PascalCase (e.g., `UsuarioCrearDto`, `DiagramaServicio`), métodos y variables en camelCase (`obtenerDiagrama`, `validarEntrada`).
- Manejo de errores y excepciones:
  - Implementar filtros de excepción (Exception Filters) y manejo centralizado de errores.
  - Registrar errores con logger estructurado.
- Persistencia:
  - Usar migrations y seeders para esquemas/datos iniciales.
- Documentación de API:
  - Integrar Swagger (OpenAPI) con decoradores de NestJS para documentar endpoints.
- Seguridad y buenas prácticas:
  - No exponer credenciales en el repo; usar variables de entorno.
  - Proteger endpoints sensibles con Guards/JWT y aplicar rate-limiting si procede.
- Pruebas:
  - Tests unitarios con Jest; tests e2e con SuperTest.

## 5. Modularidad y tamaño de archivos
- Ningún archivo debe exceder las 150 líneas de código. Si se supera, dividir en módulos o componentes adicionales.
- Mantener funciones pequeñas y con responsabilidad única.
- Exportar utilidades comunes a carpetas `utils/` o `helpers/`.

.


## 8. Seguridad y despliegue
- No subir credenciales a repositorio. Usar variables de entorno y vaults.
- Validar límites y proteger endpoints susceptibles a abuse (rate-limit, auth).
- Limpieza de recursos temporales y control de storage para artefactos generados.

---

Cumplir estos estándares garantiza código más mantenible, seguro y sencillo de revisar. Cualquier excepción debe justificarse en la PR correspondiente.