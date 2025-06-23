import { MetadataStorage } from "../metadata/MetadataStorage";

export interface EntityOptions {
  name?: string;
  tableName?: string;
}

export function Entity(options?: EntityOptions): ClassDecorator {
  return function (target: any) {
    const metadataStorage = MetadataStorage.getInstance();

    const entityName = options?.name || target.name;
    const tableName = options?.tableName || target.name.toLowerCase();

    metadataStorage.addEntityMetadata(target, {
      name: entityName,
      tableName: tableName,
    });
  };
}
