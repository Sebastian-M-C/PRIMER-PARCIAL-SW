import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { UMLDiagramJSON } from '../types/uml';
// Usar ruta relativa en lugar del alias '@/generator/...' para que ts-node/nodemon
// resuelva correctamente durante la ejecución en desarrollo.
import { generatePostmanCollection } from './postmanGenerator';


/**
 * Genera un proyecto Spring Boot a partir de un diagrama UML.
 * - Entrada: objeto UMLDiagramJSON que contiene package y clases.
 * - Acción: crea estructura temporal, genera ficheros Java/Maven, empaqueta en ZIP y limpia temporales.
 * - Salida: Buffer con el ZIP del proyecto.
 * - Lado efecto: crea y elimina directorios en temp/.
 */

export async function generateSpringBootProject(umlData: UMLDiagramJSON): Promise<Buffer> {
  const projectName = umlData.package.split('.').pop() || 'generated-project';
  const basePackage = umlData.package;

  // Create a temporary directory structure
  const tempDir = path.join(process.cwd(), 'temp', `spring-project-${Date.now()}`);
  const projectDir = path.join(tempDir, projectName);

  try {
    // Create project structure
    await createProjectStructure(projectDir, basePackage);

    // Generate Maven files
    await generateMavenFiles(projectDir, projectName, basePackage);

    // Generate application properties
    await generateApplicationProperties(projectDir, basePackage);

    // Generate entities
    await generateEntities(projectDir, basePackage, umlData.classes);

    // Generate DTOs
    await generateDTOs(projectDir, basePackage, umlData.classes);

    // Generate repositories
    await generateRepositories(projectDir, basePackage, umlData.classes);

    // Generate services
    await generateServices(projectDir, basePackage, umlData.classes);

    // Generate controllers
    await generateControllers(projectDir, basePackage, umlData.classes);


    // Generate Postman collection
    await generatePostmanCollection(projectDir, projectName, umlData.classes);

    // Create ZIP file
    const zipBuffer = await createZipFile(projectDir, projectName);

    // Clean up temporary directory
    await fs.promises.rm(tempDir, { recursive: true, force: true });

    return zipBuffer;
  } catch (error) {
    // Clean up on error
    await fs.promises.rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

/**
 * Normaliza un nombre dado a un identificador de clase Java válido (PascalCase).
 * Elimina espacios y caracteres no alfanuméricos, convierte a PascalCase y
 * asegura que comience con una letra (prefija con 'C' si comienza con dígito).
 */
function toJavaClassName(name: string): string {
  if (!name) return 'GeneratedClass';
  // Split on non-alphanumeric characters, filter empties
  const parts = name.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (parts.length === 0) return 'GeneratedClass';
  const pascal = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  // Ensure it starts with a letter
  if (!/^[A-Za-z]/.test(pascal)) return `C${pascal}`;
  return pascal;
}

/**
 * Normaliza un nombre a una variable/archivo en minúsculas sin espacios
 */
function toSafeName(name: string): string {
  return toJavaClassName(name).toLowerCase();
}

/**
 * Convierte un nombre de clase a lowerCamelCase para nombres de variables.
 * OrderItem -> orderItem
 */
function toLowerCamel(name: string): string {
  const cls = toJavaClassName(name);
  return cls.charAt(0).toLowerCase() + cls.slice(1);
}

/**
 * Pluralización muy simple para colecciones: agrega 's' por defecto.
 * No pretende cubrir todos los casos de inglés.
 */
function simplePlural(name: string): string {
  if (!name) return name;
  // casos mínimos: company -> companies
  if (/[^aeiou]y$/i.test(name)) return name.replace(/y$/i, 'ies');
  // class -> classes
  if (/s$/i.test(name)) return name + 'es';
  return name + 's';
}

/**
 * Crea la estructura de directorios estándar de un proyecto Spring Boot.
 * - projectDir: ruta base del proyecto.
 * - basePackage: paquete base Java (ej.: com.example.app) para derivar paths.
 */
async function createProjectStructure(projectDir: string, basePackage: string): Promise<void> {
  const packagePath = basePackage.replace(/\./g, '/');
  const srcMainJava = path.join(projectDir, 'src', 'main', 'java', packagePath);
  const srcMainResources = path.join(projectDir, 'src', 'main', 'resources');
  const srcTestJava = path.join(projectDir, 'src', 'test', 'java', packagePath);

  const directories = [
    srcMainJava,
    path.join(srcMainJava, 'entity'),
    path.join(srcMainJava, 'dto'),
    path.join(srcMainJava, 'repository'),
    path.join(srcMainJava, 'service'),
    path.join(srcMainJava, 'service', 'impl'),
    path.join(srcMainJava, 'controller'),
    path.join(srcMainJava, 'config'),
    srcMainResources,
    srcTestJava,
    path.join(projectDir, 'docs')
  ];

  for (const dir of directories) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}


/**
 * Genera el archivo pom.xml y la clase principal Application.java.
 * - projectDir: ruta del proyecto.
 * - projectName: nombre del artefacto Maven.
 * - basePackage: paquete base Java.
 */


async function generateMavenFiles(projectDir: string, projectName: string, basePackage: string): Promise<void> {
  // pom.xml
  const pomContent = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.5</version>
        <relativePath/>
    </parent>

    <groupId>${basePackage}</groupId>
    <artifactId>${projectName}</artifactId>
    <version>1.0.0</version>
    <name>${projectName}</name>
    <description>Generated Spring Boot project from UML diagram</description>

    <properties>
        <java.version>17</java.version>
        <lombok.version>1.18.30</lombok.version>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <!-- Spring Boot Starters -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>

        <!-- Database -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>

        <!-- Lombok -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <version>\${lombok.version}</version>
            <optional>true</optional>
        </dependency>

        <!-- Test Dependencies -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        
        <!-- H2 Database for testing -->
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
            
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.11.0</version>
                <configuration>
                    <source>17</source>
                    <target>17</target>
                    <encoding>UTF-8</encoding>
                    <annotationProcessorPaths>
                        <path>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                            <version>\${lombok.version}</version>
                        </path>
                    </annotationProcessorPaths>
                </configuration>
            </plugin>
            
            <!-- Maven Surefire Plugin for running tests -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.1.2</version>
                <configuration>
                    <includes>
                        <include>**/*Test.java</include>
                        <include>**/*Tests.java</include>
                    </includes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>`;

  await fs.promises.writeFile(path.join(projectDir, 'pom.xml'), pomContent);

  // Main application class
  const appClassName = toJavaClassName(projectName);
  const mainClassContent = `package ${basePackage};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ${appClassName}Application {

    public static void main(String[] args) {
        SpringApplication.run(${appClassName}Application.class, args);
    }
}`;

  const mainClassPath = path.join(projectDir, 'src', 'main', 'java', basePackage.replace(/\./g, '/'));
  await fs.promises.writeFile(
    path.join(mainClassPath, `${appClassName}Application.java`),
    mainClassContent
  );
}


/**
 * Crea el archivo application.properties con configuración por defecto.
 * - projectDir: ruta del proyecto.
 * - basePackage: usado para niveles de log.
 */

async function generateApplicationProperties(projectDir: string, basePackage: string): Promise<void> {
  const propertiesContent = `# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/umltool
spring.datasource.username=postgres
spring.datasource.password=
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA/Hibernate Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.properties.hibernate.format_sql=true

# Server Configuration
server.port=8080
server.servlet.context-path=/

# Logging Configuration
logging.level.${basePackage}=DEBUG
logging.level.org.springframework.web=DEBUG
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE

# Validation
spring.jpa.properties.hibernate.validator.fail_fast=true

# Jackson Configuration
spring.jackson.serialization.write-dates-as-timestamps=false
spring.jackson.time-zone=UTC`;

  await fs.promises.writeFile(
    path.join(projectDir, 'src', 'main', 'resources', 'application.properties'),
    propertiesContent
  );
}
/**
 * Genera archivos de entidades Java para cada clase UML.
 * - projectDir: ruta del proyecto.
 * - basePackage: paquete base Java.
 * - classes: arreglo de definiciones de clase UML.
 */
async function generateEntities(projectDir: string, basePackage: string, classes: any[]): Promise<void> {
  const packagePath = path.join(projectDir, 'src', 'main', 'java', basePackage.replace(/\./g, '/'), 'entity');
  // Determinar clases que actúan como superclases (targets de INHERITANCE)
  const inheritanceTargets = new Set<string>();
  for (const c of classes) {
    for (const rel of c.relations || []) {
      if (rel.type === 'INHERITANCE' && rel.target) {
        inheritanceTargets.add(toJavaClassName(rel.target));
      }
    }
  }

  for (const cls of classes) {
    const className = toJavaClassName(cls.name);
    const entityContent = generateEntityClass(basePackage, cls, className, inheritanceTargets);
    await fs.promises.writeFile(
      path.join(packagePath, `${className}.java`),
      entityContent
    );
  }
}
/**
 * Genera el contenido de la clase entidad Java a partir de la definición UML de una clase.
 * - basePackage: paquete base.
 * - cls: objeto con nombre, atributos y relaciones.
 * - Retorna: string con el código Java de la entidad.
 */
function generateEntityClass(basePackage: string, cls: any, classNameOverride?: string, inheritanceTargets?: Set<string>): string {
  const className = classNameOverride || toJavaClassName(cls.name);
  // Detectar atributo id aunque no tenga la marca isId;
  // esto evita duplicar campo cuando el usuario define 'id' pero olvida poner isId.
  const idAttribute = cls.attributes?.find((attr: any) => attr.isId || attr.name?.toLowerCase() === 'id');
  const hasId = !!idAttribute;
  // Detectar relación(es) de herencia (INHERITANCE) para extender la clase padre
  const inheritanceRels = (cls.relations || []).filter((r: any) => r.type === 'INHERITANCE');
  let parentClass: string | null = null;
  if (inheritanceRels.length > 0) {
    parentClass = toJavaClassName(inheritanceRels[0].target);
    if (inheritanceRels.length > 1) {
      console.warn(`Multiple INHERITANCE relations for ${className}. Using first: ${parentClass}`);
    }
  }

  const imports = collectImportsForAttributes(cls.attributes);
  // Always need List/ArrayList for relations
  if (!imports.includes('import java.util.List;')) {
    imports.push('import java.util.List;');
  }
  if (!imports.includes('import java.util.ArrayList;')) {
    imports.push('import java.util.ArrayList;');
  }

  // Si no hay timestamps en los atributos, se van a generar createdAt/updatedAt:
  // asegurar import de LocalDateTime para evitar error de "cannot find symbol"
  const hasTimestampsAttr = cls.attributes?.some((attr: any) =>
    attr.name === 'createdAt' || attr.name === 'updatedAt'
  );
  if (!hasTimestampsAttr && !imports.includes('import java.time.LocalDateTime;')) {
    imports.push('import java.time.LocalDateTime;');
  }

  let content = `package ${basePackage}.entity;

${imports.join('\n')}

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "${toSafeName(className)}s")
${inheritanceTargets?.has(className) ? '@Inheritance(strategy = InheritanceType.JOINED)' : ''}
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ${className}${parentClass ? ' extends ' + parentClass : ''} {`;

  // Add ID field if not present at all
  if (!hasId) {
    content += `

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;`;
  }

  // Add attributes
  for (const attr of cls.attributes || []) {
    content += `\n\n    `;

    // Add JPA annotations
    if (attr.isId || attr.name?.toLowerCase() === 'id') {
      // Si el atributo ya existe y representa el id, agregar anotaciones una sola vez.
      content += `@Id\n    @GeneratedValue(strategy = GenerationType.IDENTITY)\n    `;
    }

    if (attr.unique) {
      content += `@Column(unique = true)\n    `;
    }

    if (!attr.nullable && !attr.isId) {
      content += `@NotNull\n    `;
    }

    // Add validation annotations based on type
    if (attr.type === 'String' && !attr.nullable) {
      content += `@NotBlank\n    `;
    }

    if (attr.type === 'String' && attr.name.toLowerCase().includes('email')) {
      content += `@Email\n    `;
    }

    // Add field
    const javaType = mapTypeToJava(attr.type);
    content += `private ${javaType} ${attr.name};`;
  }

  if (!hasTimestampsAttr) {
    content += `

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;`;
  }

  // Add relationships (omitir INHERITANCE aquí porque ya se maneja con 'extends')
  const helperMethods: string[] = [];
  for (const relation of cls.relations || []) {
    if (relation.type === 'INHERITANCE') continue;
    const rel = generateRelationshipAnnotation(relation, className);
    content += rel.code;
    if (rel.helper) helperMethods.push(rel.helper);
  }

  if (helperMethods.length) {
    content += `\n\n    // Helpers para manejar colecciones hijas`;
    for (const h of helperMethods) {
      content += `\n${h}`;
    }
  }

  content += `\n}`;

  return content;
}
/**
 * Genera las anotaciones Java para relaciones entre entidades.
 * - relation: objeto con type (ONE_TO_ONE, ONE_TO_MANY, etc.), target, mappedBy, joinColumn.
 * - Retorna: snippet de código Java para insertar en la entidad.
 */

function generateRelationshipAnnotation(relation: any, ownerClassName?: string): { code: string; helper?: string } {
  let content = `\n\n    `;
  let helper: string | undefined;
  const targetClass = toJavaClassName(relation.target || 'Related');
  // nombre de variable en lowerCamelCase
  const targetVar = toLowerCamel(targetClass);
  const sourceClass = relation.source ? toJavaClassName(relation.source) : undefined;
  const sourceVar = sourceClass ? toSafeName(sourceClass) : undefined;

  // Si hay cardinalidades, ajustar el tipo de relación automáticamente
  const srcCard = (relation.sourceCardinality || '').trim();
  const tgtCard = (relation.targetCardinality || '').trim();
  const isMany = (c: string) => c === '*' || c === '0..*' || c === '1..*' || /\bmany\b/i.test(c);
  const isOne = (c: string) => c === '1' || c === '0..1';
  // No sobrescribir cuando el tipo explícito es COMPOSITION o AGGREGATION
  if (srcCard && tgtCard && relation.type !== 'COMPOSITION' && relation.type !== 'AGGREGATION') {
    if (isOne(srcCard) && isOne(tgtCard)) relation.type = 'ONE_TO_ONE';
    else if (isMany(srcCard) && isMany(tgtCard)) relation.type = 'MANY_TO_MANY';
    else if (isMany(srcCard) && isOne(tgtCard)) relation.type = ownerClassName === sourceClass ? 'MANY_TO_ONE' : 'ONE_TO_MANY';
    else if (isOne(srcCard) && isMany(tgtCard)) relation.type = ownerClassName === sourceClass ? 'ONE_TO_MANY' : 'MANY_TO_ONE';
  }

  switch (relation.type) {
    case 'ONE_TO_ONE':
      content += `@OneToOne`;
      if (relation.mappedBy) {
        content += `(mappedBy = "${relation.mappedBy}")`;
      }
      content += `\n    private ${targetClass} ${targetVar};`;
      break;

    case 'ONE_TO_MANY': {
      // Only include mappedBy if provided to avoid wrong defaults
      if (relation.mappedBy) {
        content += `@OneToMany(mappedBy = "${relation.mappedBy}", cascade = CascadeType.ALL, fetch = FetchType.LAZY)\n    `;
      } else {
        content += `@OneToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)\n    `;
      }
      content += `private List<${targetClass}> ${simplePlural(targetVar)} = new ArrayList<>();`;
      break;
    }

    case 'MANY_TO_ONE':
      content += `@ManyToOne(fetch = FetchType.LAZY)\n    `;
      if (relation.joinColumn) {
        content += `@JoinColumn(name = "${relation.joinColumn}")`;
      } else {
        // joinColumn por convención: target entity id
        content += `@JoinColumn(name = "${targetVar}_id")`;
      }
      content += `\n    private ${targetClass} ${targetVar};`;
      break;

    case 'MANY_TO_MANY': {
      // Si viene mappedBy, este lado es inverso (sin JoinTable)
      if (relation.mappedBy) {
        content += `@ManyToMany(mappedBy = "${relation.mappedBy}", fetch = FetchType.LAZY)\n    `;
        content += `private List<${targetClass}> ${simplePlural(targetVar)} = new ArrayList<>();`;
      } else {
        const owner = ownerClassName ? toSafeName(ownerClassName) : (sourceVar || 'owner');
        const joinTable = `${owner}_${targetVar}`;
        const joinColumn = `${owner}_id`;
        content += `@ManyToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)\n    `;
        content += `@JoinTable(\n        name = "${joinTable}",\n        joinColumns = @JoinColumn(name = "${joinColumn}"),\n        inverseJoinColumns = @JoinColumn(name = "${targetVar}_id")\n    )\n    `;
        content += `private List<${targetClass}> ${simplePlural(targetVar)} = new ArrayList<>();`;
      }
      break;
    }
    case 'COMPOSITION': {
      // Composición: fuerte, con orphanRemoval y helper
      const mapped = relation.mappedBy ? `(mappedBy = "${relation.mappedBy}", cascade = CascadeType.ALL, orphanRemoval = true)` : `(cascade = CascadeType.ALL, orphanRemoval = true)`;
      content += `@OneToMany${mapped}\n    private List<${targetClass}> ${simplePlural(targetVar)} = new ArrayList<>();`;
      helper = `    public void add${targetClass}(${targetClass} child) {\n        this.${simplePlural(targetVar)}.add(child);\n    }`;
      break;
    }
    case 'AGGREGATION': {
      // Agregación: débil, sin orphanRemoval y helper
      const mapped = relation.mappedBy ? `(mappedBy = "${relation.mappedBy}", cascade = CascadeType.PERSIST)` : `(cascade = CascadeType.PERSIST)`;
      content += `@OneToMany${mapped}\n    private List<${targetClass}> ${simplePlural(targetVar)} = new ArrayList<>();`;
      helper = `    public void add${targetClass}(${targetClass} child) {\n        this.${simplePlural(targetVar)}.add(child);\n    }`;
      break;
    }
  }

  return { code: content, helper };
}
/**
 * Genera DTOs (Request/Response) para cada clase UML.
 * - projectDir: ruta del proyecto.
 * - basePackage: paquete base.
 * - classes: definiciones UML.
 */
async function generateDTOs(projectDir: string, basePackage: string, classes: any[]): Promise<void> {
  const packagePath = path.join(projectDir, 'src', 'main', 'java', basePackage.replace(/\./g, '/'), 'dto');

  for (const cls of classes) {
    // Request DTO
    const requestDtoContent = generateRequestDTO(basePackage, cls);
    const className = toJavaClassName(cls.name);
    await fs.promises.writeFile(
      path.join(packagePath, `${className}Request.java`),
      requestDtoContent
    );

    // Response DTO
    const responseDtoContent = generateResponseDTO(basePackage, cls);
    await fs.promises.writeFile(
      path.join(packagePath, `${className}Response.java`),
      responseDtoContent
    );
  }
}

/**
 * Devuelve imports Java necesarios según los tipos de atributos.
 * - attrs: arreglo de atributos UML.
 * - Retorna: array de líneas de import (sin duplicados).
 */
function collectImportsForAttributes(attrs: any[] = []): string[] {
  const imports = new Set<string>();

  for (const attr of attrs) {
    const javaType = mapTypeToJava(attr.type);
    switch (javaType) {
      case 'LocalDateTime':
        imports.add('import java.time.LocalDateTime;');
        break;
      case 'LocalDate':
        imports.add('import java.time.LocalDate;');
        break;
      case 'LocalTime':
        imports.add('import java.time.LocalTime;');
        break;
      case 'BigDecimal':
        imports.add('import java.math.BigDecimal;');
        break;
      // Añadir más mapeos si se requieren imports específicos
    }
  }

  return Array.from(imports);
}

function generateRequestDTO(basePackage: string, cls: any): string {
  const imports = collectImportsForAttributes(cls.attributes);

  const className = toJavaClassName(cls.name);

  let content = `package ${basePackage}.dto;\n\n`;

  if (imports.length) {
    content += imports.join('\n') + '\n\n';
  }

  // Determine DTO fields (for Request we skip ID)
  const dtoFields = (cls.attributes || []).filter((a: any) => !a.isId);
  const hasFields = dtoFields.length > 0;

  // Add lombok annotations conditionally to avoid duplicate constructors when no fields exist
  const lombokAnnotations = ['@Data', '@NoArgsConstructor'];
  if (hasFields) {
    lombokAnnotations.push('@AllArgsConstructor', '@Builder');
  }

  content += `import jakarta.validation.constraints.*;\nimport lombok.*;\n\n${lombokAnnotations.join('\n')}\npublic class ${className}Request {`;

  for (const attr of dtoFields) {
    content += `\n\n    `;

    if (!attr.nullable) {
      content += `@NotNull\n    `;
    }

    if (attr.type === 'String' && !attr.nullable) {
      content += `@NotBlank\n    `;
    }

    if (attr.type === 'String' && attr.name.toLowerCase().includes('email')) {
      content += `@Email\n    `;
    }

    const javaType = mapTypeToJava(attr.type);
    content += `private ${javaType} ${attr.name};`;
  }

  content += `\n}`;
  return content;
}

/**
 * Genera el contenido del DTO de petición (Request) para una clase.
 * - basePackage: paquete base.
 * - cls: definición de clase UML.
 * - Retorna: string con código Java del DTO de request.
 */

function generateResponseDTO(basePackage: string, cls: any): string {
  const imports = collectImportsForAttributes(cls.attributes);
  const className = toJavaClassName(cls.name);
  let content = `package ${basePackage}.dto;\n\n`;

  if (imports.length) {
    content += imports.join('\n') + '\n\n';
  }

  const dtoFields = (cls.attributes || []);
  const hasFields = dtoFields.length > 0;

  // Siempre agregamos @Builder, aunque no haya campos, porque el ServiceImpl
  // usa `${className}Response.builder()` incluso cuando la clase no tiene atributos.
  // (@AllArgsConstructor sigue siendo opcional y solo se agrega cuando hay campos).
  const lombokAnnotations = ['@Data', '@NoArgsConstructor', '@Builder'];
  if (hasFields) {
    lombokAnnotations.push('@AllArgsConstructor');
  }

  content += `import lombok.*;\n\n${lombokAnnotations.join('\n')}\npublic class ${className}Response {`;

  for (const attr of dtoFields) {
    content += `\n\n    `;
    const javaType = mapTypeToJava(attr.type);
    content += `private ${javaType} ${attr.name};`;
  }

  content += `\n}`;
  return content;
}
/**
 * Genera interfaces de repositorio (JpaRepository) para cada entidad.
 * - projectDir: ruta del proyecto.
 * - basePackage: paquete base.
 * - classes: definiciones UML.
 */
async function generateRepositories(projectDir: string, basePackage: string, classes: any[]): Promise<void> {
  const packagePath = path.join(projectDir, 'src', 'main', 'java', basePackage.replace(/\./g, '/'), 'repository');

  for (const cls of classes) {
    const className = toJavaClassName(cls.name);
    const repositoryContent = `package ${basePackage}.repository;

import ${basePackage}.entity.${className};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ${className}Repository extends JpaRepository<${className}, Long> {
    
    // Custom query methods can be added here
    // Example: List<${className}> findBy${className}Name(String name);
}`;

    await fs.promises.writeFile(
      path.join(packagePath, `${className}Repository.java`),
      repositoryContent
    );
  }
}
/**
 * Genera interfaces de servicio y sus implementaciones para cada entidad.
 * - projectDir: ruta del proyecto.
 * - basePackage: paquete base.
 * - classes: definiciones UML.
 */
async function generateServices(projectDir: string, basePackage: string, classes: any[]): Promise<void> {
  const servicePackagePath = path.join(projectDir, 'src', 'main', 'java', basePackage.replace(/\./g, '/'), 'service');
  const implPackagePath = path.join(servicePackagePath, 'impl');

  for (const cls of classes) {
  const className = toJavaClassName(cls.name);
  // Service interface
  const serviceContent = `package ${basePackage}.service;

import ${basePackage}.dto.${className}Request;
import ${basePackage}.dto.${className}Response;
import java.util.List;

public interface ${className}Service {
    
  ${className}Response create(${className}Request request);
    
  ${className}Response findById(Long id);
    
  List<${className}Response> findAll();
    
  ${className}Response update(Long id, ${className}Request request);
    
  void delete(Long id);
}`;

  await fs.promises.writeFile(
    path.join(servicePackagePath, `${className}Service.java`),
    serviceContent
  );

  // Service implementation
  const serviceImplContent = `package ${basePackage}.service.impl;

import ${basePackage}.dto.${className}Request;
import ${basePackage}.dto.${className}Response;
import ${basePackage}.entity.${className};
import ${basePackage}.repository.${className}Repository;
import ${basePackage}.service.${className}Service;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ${className}ServiceImpl implements ${className}Service {
    
  private final ${className}Repository ${className.toLowerCase()}Repository;
    
  @Override
  public ${className}Response create(${className}Request request) {
    ${className} entity = toEntity(request);
    ${className} saved = ${className.toLowerCase()}Repository.save(entity);
    return toResponse(saved);
  }
    
  @Override
  @Transactional(readOnly = true)
  public ${className}Response findById(Long id) {
    ${className} entity = ${className.toLowerCase()}Repository.findById(id)
      .orElseThrow(() -> new RuntimeException("${className} not found with id: " + id));
    return toResponse(entity);
  }
    
  @Override
  @Transactional(readOnly = true)
  public List<${className}Response> findAll() {
    return ${className.toLowerCase()}Repository.findAll()
      .stream()
      .map(this::toResponse)
      .collect(Collectors.toList());
  }
    
  @Override
  public ${className}Response update(Long id, ${className}Request request) {
    ${className} entity = ${className.toLowerCase()}Repository.findById(id)
      .orElseThrow(() -> new RuntimeException("${className} not found with id: " + id));
        
    updateEntity(request, entity);
    ${className} updated = ${className.toLowerCase()}Repository.save(entity);
    return toResponse(updated);
  }
    
  @Override
  public void delete(Long id) {
    if (!${className.toLowerCase()}Repository.existsById(id)) {
      throw new RuntimeException("${className} not found with id: " + id);
    }
    ${className.toLowerCase()}Repository.deleteById(id);
  }
    
  private ${className} toEntity(${className}Request request) {
    return ${className}.builder()${generateBuilderFieldsForEntity(cls)}
        .build();
  }
    
  private ${className}Response toResponse(${className} entity) {
    return ${className}Response.builder()${generateBuilderFieldsForResponse(cls)}
        .build();
  }
    
  private void updateEntity(${className}Request request, ${className} entity) {${generateUpdateFieldsForEntity(cls)}
  }
}`;

  await fs.promises.writeFile(
    path.join(implPackagePath, `${className}ServiceImpl.java`),
    serviceImplContent
  );
  }
}

/**
 * Genera controladores REST para cada entidad.
 * - projectDir: ruta del proyecto.
 * - basePackage: paquete base.
 * - classes: definiciones UML.
 */

async function generateControllers(projectDir: string, basePackage: string, classes: any[]): Promise<void> {
  const packagePath = path.join(projectDir, 'src', 'main', 'java', basePackage.replace(/\./g, '/'), 'controller');

  for (const cls of classes) {
  const className = toJavaClassName(cls.name);
  const routeName = toSafeName(className);
  const controllerContent = `package ${basePackage}.controller;

import ${basePackage}.dto.${className}Request;
import ${basePackage}.dto.${className}Response;
import ${basePackage}.service.${className}Service;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/${routeName}s")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ${className}Controller {
    
  private final ${className}Service ${className.toLowerCase()}Service;
    
  @PostMapping
  public ResponseEntity<${className}Response> create(@Valid @RequestBody ${className}Request request) {
    ${className}Response response = ${className.toLowerCase()}Service.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }
    
  @GetMapping("/{id}")
  public ResponseEntity<${className}Response> findById(@PathVariable Long id) {
    ${className}Response response = ${className.toLowerCase()}Service.findById(id);
    return ResponseEntity.ok(response);
  }
    
  @GetMapping
  public ResponseEntity<List<${className}Response>> findAll() {
    List<${className}Response> responses = ${className.toLowerCase()}Service.findAll();
    return ResponseEntity.ok(responses);
  }
    
  @PutMapping("/{id}")
  public ResponseEntity<${className}Response> update(@PathVariable Long id, @Valid @RequestBody ${className}Request request) {
    ${className}Response response = ${className.toLowerCase()}Service.update(id, request);
    return ResponseEntity.ok(response);
  }
    
  @DeleteMapping("/{id}")
  public ResponseEntity<Void> delete(@PathVariable Long id) {
    ${className.toLowerCase()}Service.delete(id);
    return ResponseEntity.noContent().build();
  }
}`;

  await fs.promises.writeFile(
    path.join(packagePath, `${className}Controller.java`),
    controllerContent
  );
  }
}

/**
 * Mapea tipos del UML a tipos Java conocidos.
 * - type: cadena con el tipo UML.
 * - Retorna: tipo Java como string (por defecto 'String' y log de advertencia).
 */

function mapTypeToJava(type: string): string {
  // Normalize the type string
  const normalizedType = type?.trim() || '';

  const typeMap: { [key: string]: string } = {
    'String': 'String',
    'Long': 'Long',
    'Integer': 'Integer',
    'Boolean': 'Boolean',
    'LocalDateTime': 'LocalDateTime',
    'BigDecimal': 'BigDecimal',
    'Double': 'Double',
    'Float': 'Float',
    'Date': 'LocalDate',
    'Time': 'LocalTime',
    'Text': 'String',
    'Varchar': 'String',
    'Number': 'Long',
    'Int': 'Integer',
    'Bool': 'Boolean',
    'DateTime': 'LocalDateTime',
    'Timestamp': 'LocalDateTime',
    'Decimal': 'BigDecimal',
    'Money': 'BigDecimal',
    'Email': 'String',
    'URL': 'String',
    'UUID': 'String'
  };

  // Check for exact match first
  if (typeMap[normalizedType]) {
    return typeMap[normalizedType];
  }

  // Check for case-insensitive match
  const lowerType = normalizedType.toLowerCase();
  for (const [key, value] of Object.entries(typeMap)) {
    if (key.toLowerCase() === lowerType) {
      return value;
    }
  }

  // Handle unknown types - default to String to avoid compilation errors
  console.warn(`Unknown type "${type}" mapped to String`);
  return 'String';
}

/**
 * Genera las líneas del builder para crear la entidad desde el request.
 * - cls: definición UML de la clase.
 * - Retorna: string con llamadas al builder (.field(request.getX())).
 */


function generateBuilderFieldsForEntity(cls: any): string {
  let fields = '';

  for (const attr of cls.attributes || []) {
    if (attr.isId) continue; // Skip ID for entity creation

    fields += `\n                .${attr.name}(request.get${attr.name.charAt(0).toUpperCase() + attr.name.slice(1)}())`;
  }

  return fields;
}

/**
 * Genera las líneas del builder para el DTO de respuesta a partir de la entidad.
 * - cls: definición UML.
 * - Retorna: string con llamadas al builder (.field(entity.getX())).
 */

function generateBuilderFieldsForResponse(cls: any): string {
  let fields = '';

  for (const attr of cls.attributes || []) {
    fields += `\n                .${attr.name}(entity.get${attr.name.charAt(0).toUpperCase() + attr.name.slice(1)}())`;
  }

  return fields;
}
/**
 * Genera el código para actualizar los campos de la entidad con valores del request si no son nulos.
 * - cls: definición UML.
 * - Retorna: snippet Java para updateEntity.
 */
function generateUpdateFieldsForEntity(cls: any): string {
  let fields = '';

  for (const attr of cls.attributes || []) {
    if (attr.isId) continue;

    fields += `\n        if (request.get${attr.name.charAt(0).toUpperCase() + attr.name.slice(1)}() != null) {
            entity.set${attr.name.charAt(0).toUpperCase() + attr.name.slice(1)}(request.get${attr.name.charAt(0).toUpperCase() + attr.name.slice(1)}());
        }`;
  }

  return fields;
}
/**
 * Empaqueta el proyecto en un ZIP en memoria.
 * - projectDir: ruta del proyecto a comprimir.
 * - projectName: nombre raíz dentro del ZIP.
 * - Retorna: Promise<Buffer> con el contenido del ZIP.
 * - Nota: acumula en memoria; para proyectos grandes considerar stream a disco/response.
 */
async function createZipFile(projectDir: string, projectName: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    archive.directory(projectDir, projectName);
    archive.finalize();
  });
}

