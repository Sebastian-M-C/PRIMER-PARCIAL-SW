import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { UMLDiagramJSON } from '../types/uml';

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
  const mainClassContent = `package ${basePackage};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class ${projectName.charAt(0).toUpperCase() + projectName.slice(1)}Application {

    public static void main(String[] args) {
        SpringApplication.run(${projectName.charAt(0).toUpperCase() + projectName.slice(1)}Application.class, args);
    }
}`;

  const mainClassPath = path.join(projectDir, 'src', 'main', 'java', basePackage.replace(/\./g, '/'));
  await fs.promises.writeFile(
    path.join(mainClassPath, `${projectName.charAt(0).toUpperCase() + projectName.slice(1)}Application.java`),
    mainClassContent
  );
}

async function generateApplicationProperties(projectDir: string, basePackage: string): Promise<void> {
  const propertiesContent = `# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/umltool
spring.datasource.username=postgres
spring.datasource.password=postgres
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

async function generateEntities(projectDir: string, basePackage: string, classes: any[]): Promise<void> {
  const packagePath = path.join(projectDir, 'src', 'main', 'java', basePackage.replace(/\./g, '/'), 'entity');
  
  for (const cls of classes) {
    const entityContent = generateEntityClass(basePackage, cls);
    await fs.promises.writeFile(
      path.join(packagePath, `${cls.name}.java`),
      entityContent
    );
  }
}

function generateEntityClass(basePackage: string, cls: any): string {
  const hasId = cls.attributes?.some((attr: any) => attr.isId);
  const idAttribute = cls.attributes?.find((attr: any) => attr.isId);
  
  let content = `package ${basePackage}.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "${cls.name.toLowerCase()}s")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ${cls.name} {`;

  // Add ID field if not present
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
    if (attr.isId) {
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

  // Add timestamps if not present
  const hasTimestamps = cls.attributes?.some((attr: any) => 
    attr.name === 'createdAt' || attr.name === 'updatedAt'
  );
  
  if (!hasTimestamps) {
    content += `

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;`;
  }

  // Add relationships
  for (const relation of cls.relations || []) {
    content += generateRelationshipAnnotation(relation);
  }

  content += `\n}`;
  
  return content;
}

function generateRelationshipAnnotation(relation: any): string {
  let content = `\n\n    `;
  
  switch (relation.type) {
    case 'ONE_TO_ONE':
      content += `@OneToOne`;
      if (relation.mappedBy) {
        content += `(mappedBy = "${relation.mappedBy}")`;
      }
      content += `\n    private ${relation.target} ${relation.target.toLowerCase()};`;
      break;
      
    case 'ONE_TO_MANY':
      content += `@OneToMany(mappedBy = "${relation.mappedBy || 'id'}", cascade = CascadeType.ALL, fetch = FetchType.LAZY)\n    `;
      content += `private List<${relation.target}> ${relation.target.toLowerCase()}s = new ArrayList<>();`;
      break;
      
    case 'MANY_TO_ONE':
      content += `@ManyToOne(fetch = FetchType.LAZY)\n    `;
      if (relation.joinColumn) {
        content += `@JoinColumn(name = "${relation.joinColumn}")`;
      } else {
        content += `@JoinColumn(name = "${relation.target.toLowerCase()}_id")`;
      }
      content += `\n    private ${relation.target} ${relation.target.toLowerCase()};`;
      break;
      
    case 'MANY_TO_MANY':
      content += `@ManyToMany(cascade = CascadeType.ALL, fetch = FetchType.LAZY)\n    `;
      content += `@JoinTable(\n        name = "${relation.target.toLowerCase()}_${relation.target.toLowerCase()}",\n        joinColumns = @JoinColumn(name = "id"),\n        inverseJoinColumns = @JoinColumn(name = "${relation.target.toLowerCase()}_id")\n    )\n    `;
      content += `private List<${relation.target}> ${relation.target.toLowerCase()}s = new ArrayList<>();`;
      break;
  }
  
  return content;
}

async function generateDTOs(projectDir: string, basePackage: string, classes: any[]): Promise<void> {
  const packagePath = path.join(projectDir, 'src', 'main', 'java', basePackage.replace(/\./g, '/'), 'dto');
  
  for (const cls of classes) {
    // Request DTO
    const requestDtoContent = generateRequestDTO(basePackage, cls);
    await fs.promises.writeFile(
      path.join(packagePath, `${cls.name}Request.java`),
      requestDtoContent
    );
    
    // Response DTO
    const responseDtoContent = generateResponseDTO(basePackage, cls);
    await fs.promises.writeFile(
      path.join(packagePath, `${cls.name}Response.java`),
      responseDtoContent
    );
  }
}

function generateRequestDTO(basePackage: string, cls: any): string {
  let content = `package ${basePackage}.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ${cls.name}Request {`;

  for (const attr of cls.attributes || []) {
    if (attr.isId) continue; // Skip ID in request DTO
    
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

function generateResponseDTO(basePackage: string, cls: any): string {
  let content = `package ${basePackage}.dto;

import lombok.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ${cls.name}Response {`;

  for (const attr of cls.attributes || []) {
    content += `\n\n    `;
    const javaType = mapTypeToJava(attr.type);
    content += `private ${javaType} ${attr.name};`;
  }

  content += `\n}`;
  return content;
}

async function generateRepositories(projectDir: string, basePackage: string, classes: any[]): Promise<void> {
  const packagePath = path.join(projectDir, 'src', 'main', 'java', basePackage.replace(/\./g, '/'), 'repository');
  
  for (const cls of classes) {
    const repositoryContent = `package ${basePackage}.repository;

import ${basePackage}.entity.${cls.name};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ${cls.name}Repository extends JpaRepository<${cls.name}, Long> {
    
    // Custom query methods can be added here
    // Example: List<${cls.name}> findBy${cls.name}Name(String name);
}`;

    await fs.promises.writeFile(
      path.join(packagePath, `${cls.name}Repository.java`),
      repositoryContent
    );
  }
}

async function generateServices(projectDir: string, basePackage: string, classes: any[]): Promise<void> {
  const servicePackagePath = path.join(projectDir, 'src', 'main', 'java', basePackage.replace(/\./g, '/'), 'service');
  const implPackagePath = path.join(servicePackagePath, 'impl');
  
  for (const cls of classes) {
    // Service interface
    const serviceContent = `package ${basePackage}.service;

import ${basePackage}.dto.${cls.name}Request;
import ${basePackage}.dto.${cls.name}Response;
import java.util.List;

public interface ${cls.name}Service {
    
    ${cls.name}Response create(${cls.name}Request request);
    
    ${cls.name}Response findById(Long id);
    
    List<${cls.name}Response> findAll();
    
    ${cls.name}Response update(Long id, ${cls.name}Request request);
    
    void delete(Long id);
}`;

    await fs.promises.writeFile(
      path.join(servicePackagePath, `${cls.name}Service.java`),
      serviceContent
    );
    
    // Service implementation
    const serviceImplContent = `package ${basePackage}.service.impl;

import ${basePackage}.dto.${cls.name}Request;
import ${basePackage}.dto.${cls.name}Response;
import ${basePackage}.entity.${cls.name};
import ${basePackage}.repository.${cls.name}Repository;
import ${basePackage}.service.${cls.name}Service;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ${cls.name}ServiceImpl implements ${cls.name}Service {
    
    private final ${cls.name}Repository ${cls.name.toLowerCase()}Repository;
    
    @Override
    public ${cls.name}Response create(${cls.name}Request request) {
        ${cls.name} entity = toEntity(request);
        ${cls.name} saved = ${cls.name.toLowerCase()}Repository.save(entity);
        return toResponse(saved);
    }
    
    @Override
    @Transactional(readOnly = true)
    public ${cls.name}Response findById(Long id) {
        ${cls.name} entity = ${cls.name.toLowerCase()}Repository.findById(id)
            .orElseThrow(() -> new RuntimeException("${cls.name} not found with id: " + id));
        return toResponse(entity);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<${cls.name}Response> findAll() {
        return ${cls.name.toLowerCase()}Repository.findAll()
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }
    
    @Override
    public ${cls.name}Response update(Long id, ${cls.name}Request request) {
        ${cls.name} entity = ${cls.name.toLowerCase()}Repository.findById(id)
            .orElseThrow(() -> new RuntimeException("${cls.name} not found with id: " + id));
        
        updateEntity(request, entity);
        ${cls.name} updated = ${cls.name.toLowerCase()}Repository.save(entity);
        return toResponse(updated);
    }
    
    @Override
    public void delete(Long id) {
        if (!${cls.name.toLowerCase()}Repository.existsById(id)) {
            throw new RuntimeException("${cls.name} not found with id: " + id);
        }
        ${cls.name.toLowerCase()}Repository.deleteById(id);
    }
    
    private ${cls.name} toEntity(${cls.name}Request request) {
        return ${cls.name}.builder()${generateBuilderFieldsForEntity(cls)}
                .build();
    }
    
    private ${cls.name}Response toResponse(${cls.name} entity) {
        return ${cls.name}Response.builder()${generateBuilderFieldsForResponse(cls)}
                .build();
    }
    
    private void updateEntity(${cls.name}Request request, ${cls.name} entity) {${generateUpdateFieldsForEntity(cls)}
    }`;

    await fs.promises.writeFile(
      path.join(implPackagePath, `${cls.name}ServiceImpl.java`),
      serviceImplContent
    );
  }
}

async function generateControllers(projectDir: string, basePackage: string, classes: any[]): Promise<void> {
  const packagePath = path.join(projectDir, 'src', 'main', 'java', basePackage.replace(/\./g, '/'), 'controller');
  
  for (const cls of classes) {
    const controllerContent = `package ${basePackage}.controller;

import ${basePackage}.dto.${cls.name}Request;
import ${basePackage}.dto.${cls.name}Response;
import ${basePackage}.service.${cls.name}Service;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/${cls.name.toLowerCase()}s")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ${cls.name}Controller {
    
    private final ${cls.name}Service ${cls.name.toLowerCase()}Service;
    
    @PostMapping
    public ResponseEntity<${cls.name}Response> create(@Valid @RequestBody ${cls.name}Request request) {
        ${cls.name}Response response = ${cls.name.toLowerCase()}Service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<${cls.name}Response> findById(@PathVariable Long id) {
        ${cls.name}Response response = ${cls.name.toLowerCase()}Service.findById(id);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping
    public ResponseEntity<List<${cls.name}Response>> findAll() {
        List<${cls.name}Response> responses = ${cls.name.toLowerCase()}Service.findAll();
        return ResponseEntity.ok(responses);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<${cls.name}Response> update(@PathVariable Long id, @Valid @RequestBody ${cls.name}Request request) {
        ${cls.name}Response response = ${cls.name.toLowerCase()}Service.update(id, request);
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        ${cls.name.toLowerCase()}Service.delete(id);
        return ResponseEntity.noContent().build();
    }
}`;

    await fs.promises.writeFile(
      path.join(packagePath, `${cls.name}Controller.java`),
      controllerContent
    );
  }
}


async function generatePostmanCollection(projectDir: string, projectName: string, classes: any[]): Promise<void> {
  const collection: any = {
    info: {
      name: `${projectName} API`,
      description: `Generated API collection for ${projectName}`,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: []
  };

  for (const cls of classes) {
    const baseUrl = "{{baseUrl}}/api";
    const className = cls.name.toLowerCase();
    
    // Create folder for each entity
    const folder = {
      name: cls.name,
      item: [
        {
          name: `Create ${cls.name}`,
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: generateSampleJson(cls, false)
            },
            url: {
              raw: `${baseUrl}/${className}s`,
              host: ["{{baseUrl}}"],
              path: ["api", `${className}s`]
            }
          }
        },
        {
          name: `Get All ${cls.name}s`,
          request: {
            method: "GET",
            url: {
              raw: `${baseUrl}/${className}s`,
              host: ["{{baseUrl}}"],
              path: ["api", `${className}s`]
            }
          }
        },
        {
          name: `Get ${cls.name} by ID`,
          request: {
            method: "GET",
            url: {
              raw: `${baseUrl}/${className}s/1`,
              host: ["{{baseUrl}}"],
              path: ["api", `${className}s`, "1"]
            }
          }
        },
        {
          name: `Update ${cls.name}`,
          request: {
            method: "PUT",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: generateSampleJson(cls, false)
            },
            url: {
              raw: `${baseUrl}/${className}s/1`,
              host: ["{{baseUrl}}"],
              path: ["api", `${className}s`, "1"]
            }
          }
        },
        {
          name: `Delete ${cls.name}`,
          request: {
            method: "DELETE",
            url: {
              raw: `${baseUrl}/${className}s/1`,
              host: ["{{baseUrl}}"],
              path: ["api", `${className}s`, "1"]
            }
          }
        }
      ]
    };
    
    collection.item.push(folder);
  }

  // Add variables
  collection.item.push({
    name: "Variables",
    item: [
      {
        name: "Set Base URL",
        request: {
          method: "GET",
          url: {
            raw: "{{baseUrl}}/health",
            host: ["{{baseUrl}}"],
            path: ["health"]
          }
        }
      }
    ]
  });

  await fs.promises.writeFile(
    path.join(projectDir, 'docs', `${projectName}-postman-collection.json`),
    JSON.stringify(collection, null, 2)
  );
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
        sample[attr.name] = "2023-12-01T10:00:00";
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

function generateBuilderFieldsForEntity(cls: any): string {
  let fields = '';
  
  for (const attr of cls.attributes || []) {
    if (attr.isId) continue; // Skip ID for entity creation
    
    fields += `\n                .${attr.name}(request.get${attr.name.charAt(0).toUpperCase() + attr.name.slice(1)}())`;
  }
  
  return fields;
}

function generateBuilderFieldsForResponse(cls: any): string {
  let fields = '';
  
  for (const attr of cls.attributes || []) {
    fields += `\n                .${attr.name}(entity.get${attr.name.charAt(0).toUpperCase() + attr.name.slice(1)}())`;
  }
  
  return fields;
}

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

