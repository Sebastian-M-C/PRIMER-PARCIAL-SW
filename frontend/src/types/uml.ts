/**
 * Tipos y contratos para representar diagramas UML en la aplicación frontend.
 * Contiene definiciones de clases, atributos, métodos, relaciones y el
 * formato JSON de import/export utilizado por el Sidebar y el store.
 */

/**
 * Representa un atributo de una clase UML.
 * - name: nombre del atributo
 * - type: tipo de dato (String, Long, etc.)
 * - visibility: modificador de visibilidad UML (+, -, #, ~)
 * - nullable, unique, isId: metainformación opcional
 */
export interface UMLAttribute {
  name: string;
  type: string;
  visibility?: 'public' | 'private' | 'protected' | 'package';
  nullable?: boolean;
  unique?: boolean;
  isId?: boolean;
}

/**
 * Representa un método/operación de una clase UML.
 * - name: nombre del método
 * - returnType: tipo de retorno
 * - visibility: modificador de visibilidad UML (+, -, #, ~)
 * - parameters: lista de parámetros { name, type }
 */
export interface UMLMethod {
  name: string;
  returnType: string;
  visibility?: 'public' | 'private' | 'protected' | 'package';
  parameters: Array<{
    name: string;
    type: string;
  }>;
}

/**
 * Representa una relación entre dos clases UML.
 * - id: identificador único de la relación
 * - type: tipo semántico de la relación (cardinalidades y composición)
 * - source / target: id de la clase origen y destino
 * - sourceCardinality / targetCardinality: cardinalidades (p. ej. "1", "*")
 * - mappedBy / joinColumn / label: campos opcionales para JPA/visualización
 */
export interface UMLRelation {
  id: string;
  type: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY' | 'INHERITANCE' | 'COMPOSITION' | 'AGGREGATION';
  source: string;
  target: string;
  sourceCardinality: string;
  targetCardinality: string;
  mappedBy?: string;
  joinColumn?: string;
  label?: string;
}

/**
 * Representa una clase UML en el lienzo.
 * - id: identificador único
 * - name: nombre de la clase
 * - attributes: lista de UMLAttribute
 * - methods: lista de UMLMethod
 * - position: coordenadas en el canvas
 * - width / height: dimensiones visuales
 */
export interface UMLClass {
  id: string;
  name: string;
  attributes: UMLAttribute[];
  methods: UMLMethod[];
  position: {
    x: number;
    y: number;
  };
  width: number;
  height: number;
}

/**
 * Metadatos y contenido completo de un diagrama UML.
 * Usado en el store y para import/export en formato enriquecido.
 */
export interface UMLDiagram {
  id: string;
  name: string;
  package: string;
  classes: UMLClass[];
  relations: UMLRelation[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Formato JSON simplificado para import/export:
 * - package: paquete java
 * - classes: clases sin id/posiciones/dimensiones (se regeneran al importar)
 * - relations: relaciones sin id (se pueden mapear por name/id)
 */
export interface UMLDiagramJSON {
  package: string;
  classes: Omit<UMLClass, 'id' | 'position' | 'width' | 'height'>[];
  relations: Omit<UMLRelation, 'id'>[];
}

/**
 * Tipo simplificado usado por el canvas para renderizar:
 * contiene únicamente clases y relaciones (sin metadata).
 */
export type Diagram = {
  classes: UMLClass[];
  relations: UMLRelation[];
};

/**
 * Tipos para colaboración en tiempo real (frontend store)
 */
export interface CollaborationUser {
  id: string;
  name?: string;
  color?: string;
  cursor?: { x: number; y: number } | null;
  connectedAt?: string | Date;
}

export interface CollaborationLock {
  elementId: string;
  userId: string;
  timestamp?: string | number | Date;
}

