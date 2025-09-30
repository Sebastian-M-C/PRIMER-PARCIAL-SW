export interface UMLAttribute {
  name: string;
  type: string;
  nullable?: boolean;
  unique?: boolean;
  isId?: boolean;
}

export interface UMLMethod {
  name: string;
  returnType: string;
  parameters: Array<{
    name: string;
    type: string;
  }>;
}

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

export interface UMLDiagram {
  id: string;
  name: string;
  package: string;
  classes: UMLClass[];
  relations: UMLRelation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UMLDiagramJSON {
  package: string;
  classes: Omit<UMLClass, 'id' | 'position' | 'width' | 'height'>[];
  relations: Omit<UMLRelation, 'id'>[];
}

export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  cursor?: {
    x: number;
    y: number;
  };
}

export interface CollaborationLock {
  elementId: string;
  userId: string;
  timestamp: number;
}

