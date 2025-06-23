import "reflect-metadata";
import { MetadataStorage } from "../metadata/MetadataStorage";
import { ColumnType } from "../types";

export interface ColumnOptions {
  type?: ColumnType;
  name?: string;
  length?: number;
  nullable?: boolean;
  unique?: boolean;
  default?: any;
  comment?: string;
}

export function Column(options?: ColumnOptions): PropertyDecorator;
export function Column(
  type: ColumnType,
  options?: Omit<ColumnOptions, "type">
): PropertyDecorator;
export function Column(
  typeOrOptions?: ColumnType | ColumnOptions,
  options?: Omit<ColumnOptions, "type">
): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const metadataStorage = MetadataStorage.getInstance();

    let columnOptions: ColumnOptions;

    if (typeof typeOrOptions === "string") {
      columnOptions = { type: typeOrOptions, ...options };
    } else {
      columnOptions = typeOrOptions || {};
    }

    // Inferir el tipo del TypeScript Reflect si no se especifica
    const reflectType = Reflect.getMetadata("design:type", target, propertyKey);
    let inferredType: ColumnType = "string";

    if (!columnOptions.type && reflectType) {
      switch (reflectType.name) {
        case "String":
          inferredType = "string";
          break;
        case "Number":
          inferredType = "int";
          break;
        case "Boolean":
          inferredType = "boolean";
          break;
        case "Date":
          inferredType = "datetime";
          break;
        default:
          inferredType = "string";
      }
    }

    const columnMetadata = {
      name: columnOptions.name || propertyKey.toString(),
      type: columnOptions.type || inferredType,
      length: columnOptions.length,
      nullable: columnOptions.nullable ?? true,
      unique: columnOptions.unique ?? false,
      default: columnOptions.default,
      comment: columnOptions.comment,
      required: !columnOptions.nullable,
    };

    metadataStorage.addColumnMetadata(
      target.constructor,
      propertyKey.toString(),
      columnMetadata
    );
  };
}
