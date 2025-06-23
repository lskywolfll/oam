import { MetadataStorage } from "../metadata/MetadataStorage";
import { EntityMetadata, TableCreateRequest, ApiResponse } from "../types";

export class SchemaBuilder {
  private metadataStorage: MetadataStorage;

  constructor() {
    this.metadataStorage = MetadataStorage.getInstance();
  }

  /**
   * Genera el payload para crear una tabla basándose en una entidad
   */
  buildTableCreateRequest(entityClass: Function): TableCreateRequest {
    const metadata = this.metadataStorage.getEntityMetadata(entityClass);

    if (!metadata) {
      throw new Error(
        `No se encontraron metadatos para la entidad ${entityClass.name}`
      );
    }

    const columns: TableCreateRequest["columns"] = [];
    const foreign_keys: TableCreateRequest["foreign_keys"] = [];

    // Convertir columnas
    metadata.columns.forEach((columnMetadata, propertyKey) => {
      columns.push({
        name: columnMetadata.name,
        type: columnMetadata.type,
        required: columnMetadata.required || false,
        unique: columnMetadata.unique || false,
        default: columnMetadata.default,
      });
    });

    // Convertir claves foráneas
    metadata.foreignKeys.forEach((fk) => {
      foreign_keys.push({
        column: fk.column,
        references_table: fk.referencesTable,
        references_column: fk.referencesColumn,
        on_delete: fk.onDelete,
        on_update: fk.onUpdate,
      });
    });

    return {
      columns,
      foreign_keys: foreign_keys.length > 0 ? foreign_keys : undefined,
    };
  }

  /**
   * Genera una llamada cURL para crear la tabla
   */
  generateCurlCommand(
    entityClass: Function,
    baseUrl: string = "http://localhost:8080"
  ): string {
    const metadata = this.metadataStorage.getEntityMetadata(entityClass);

    if (!metadata) {
      throw new Error(
        `No se encontraron metadatos para la entidad ${entityClass.name}`
      );
    }

    const tableName = metadata.tableName;
    const payload = this.buildTableCreateRequest(entityClass);

    return `curl -X POST ${baseUrl}/api/v2/tables/${tableName}/create \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`;
  }

  /**
   * Genera las dependencias de una entidad (entidades que deben crearse antes)
   */
  getDependencies(entityClass: Function): Function[] {
    const metadata = this.metadataStorage.getEntityMetadata(entityClass);

    if (!metadata) {
      return [];
    }

    const dependencies: Function[] = [];

    // Buscar dependencias en las relaciones
    metadata.relations.forEach((relation) => {
      const targetEntity = relation.target();
      if (relation.type === "many-to-one" || relation.type === "one-to-one") {
        dependencies.push(targetEntity);
      }
    });

    return dependencies;
  }

  /**
   * Ordena las entidades según sus dependencias
   */
  sortEntitiesByDependencies(entities: Function[]): Function[] {
    const sorted: Function[] = [];
    const visited = new Set<Function>();
    const visiting = new Set<Function>();

    const visit = (entity: Function) => {
      if (visiting.has(entity)) {
        throw new Error(
          `Dependencia circular detectada en la entidad ${entity.name}`
        );
      }

      if (visited.has(entity)) {
        return;
      }

      visiting.add(entity);

      const dependencies = this.getDependencies(entity);
      dependencies.forEach((dep) => {
        if (entities.includes(dep)) {
          visit(dep);
        }
      });

      visiting.delete(entity);
      visited.add(entity);
      sorted.push(entity);
    };

    entities.forEach((entity) => {
      if (!visited.has(entity)) {
        visit(entity);
      }
    });

    return sorted;
  }

  /**
   * Valida que todas las dependencias estén disponibles
   */
  validateDependencies(entities: Function[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    entities.forEach((entity) => {
      const dependencies = this.getDependencies(entity);
      dependencies.forEach((dep) => {
        if (!entities.includes(dep)) {
          errors.push(
            `La entidad ${entity.name} depende de ${dep.name} que no está incluida en el esquema`
          );
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
