import "reflect-metadata";
import {
  EntityMetadata,
  ColumnMetadata,
  RelationMetadata,
  ForeignKeyMetadata,
} from "../types";

export class MetadataStorage {
  private static instance: MetadataStorage;
  private entities = new Map<Function, EntityMetadata>();

  private constructor() {}

  static getInstance(): MetadataStorage {
    if (!MetadataStorage.instance) {
      MetadataStorage.instance = new MetadataStorage();
    }
    return MetadataStorage.instance;
  }

  addEntityMetadata(target: Function, metadata: Partial<EntityMetadata>): void {
    const existing = this.entities.get(target) || {
      name: target.name,
      tableName: target.name.toLowerCase(),
      columns: new Map(),
      relations: new Map(),
      foreignKeys: [],
    };

    this.entities.set(target, { ...existing, ...metadata });
  }

  addColumnMetadata(
    target: Function,
    propertyKey: string,
    metadata: ColumnMetadata
  ): void {
    const entityMetadata = this.getOrCreateEntityMetadata(target);
    entityMetadata.columns.set(propertyKey, metadata);
  }

  addRelationMetadata(
    target: Function,
    propertyKey: string,
    metadata: RelationMetadata
  ): void {
    const entityMetadata = this.getOrCreateEntityMetadata(target);
    entityMetadata.relations.set(propertyKey, metadata);
  }

  addForeignKeyMetadata(target: Function, metadata: ForeignKeyMetadata): void {
    const entityMetadata = this.getOrCreateEntityMetadata(target);
    entityMetadata.foreignKeys.push(metadata);
  }

  setPrimaryColumn(target: Function, propertyKey: string): void {
    const entityMetadata = this.getOrCreateEntityMetadata(target);
    entityMetadata.primaryColumn = propertyKey;
  }

  getEntityMetadata(target: Function): EntityMetadata | undefined {
    return this.entities.get(target);
  }

  getAllEntities(): Map<Function, EntityMetadata> {
    return this.entities;
  }

  private getOrCreateEntityMetadata(target: Function): EntityMetadata {
    let entityMetadata = this.entities.get(target);
    if (!entityMetadata) {
      entityMetadata = {
        name: target.name,
        tableName: target.name.toLowerCase(),
        columns: new Map(),
        relations: new Map(),
        foreignKeys: [],
      };
      this.entities.set(target, entityMetadata);
    }
    return entityMetadata;
  }

  clear(): void {
    this.entities.clear();
  }
}
