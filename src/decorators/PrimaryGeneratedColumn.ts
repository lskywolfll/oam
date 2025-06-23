import { MetadataStorage } from "../metadata/MetadataStorage";

export interface PrimaryGeneratedColumnOptions {
  name?: string;
  type?: "int" | "integer";
}

export function PrimaryGeneratedColumn(
  options?: PrimaryGeneratedColumnOptions
): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const metadataStorage = MetadataStorage.getInstance();

    const columnMetadata = {
      name: options?.name || propertyKey.toString(),
      type: options?.type || ("int" as const),
      required: true,
      unique: true,
      nullable: false,
    };

    metadataStorage.addColumnMetadata(
      target.constructor,
      propertyKey.toString(),
      columnMetadata
    );
    metadataStorage.setPrimaryColumn(
      target.constructor,
      propertyKey.toString()
    );
  };
}
