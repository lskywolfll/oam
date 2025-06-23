import { MetadataStorage } from "../metadata/MetadataStorage";
import { OnDeleteAction, OnUpdateAction } from "../types";

export interface ForeignKeyOptions {
  referencesTable: string;
  referencesColumn: string;
  onDelete?: OnDeleteAction;
  onUpdate?: OnUpdateAction;
}

export function ForeignKey(options: ForeignKeyOptions): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const metadataStorage = MetadataStorage.getInstance();

    const foreignKeyMetadata = {
      column: propertyKey.toString(),
      referencesTable: options.referencesTable,
      referencesColumn: options.referencesColumn,
      onDelete: options.onDelete || "RESTRICT",
      onUpdate: options.onUpdate || "CASCADE",
    };

    metadataStorage.addForeignKeyMetadata(
      target.constructor,
      foreignKeyMetadata
    );
  };
}
