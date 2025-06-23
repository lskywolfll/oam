import { MetadataStorage } from "../../metadata/MetadataStorage";

export interface OneToManyOptions {
  cascade?: boolean;
  eager?: boolean;
}

export function OneToMany(
  typeFunctionOrTarget: (type?: any) => Function,
  inverseSide: string | ((object: any) => any),
  options?: OneToManyOptions
): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const metadataStorage = MetadataStorage.getInstance();

    const relationMetadata = {
      type: "one-to-many" as const,
      target: typeFunctionOrTarget,
      inverseSide: typeof inverseSide === "string" ? inverseSide : undefined,
      cascade: options?.cascade ?? false,
      eager: options?.eager ?? false,
    };

    metadataStorage.addRelationMetadata(
      target.constructor,
      propertyKey.toString(),
      relationMetadata
    );
  };
}
