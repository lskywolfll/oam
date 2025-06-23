import { MetadataStorage } from "../../metadata/MetadataStorage";

export interface ManyToOneOptions {
  cascade?: boolean;
  eager?: boolean;
  joinColumn?: string;
}

export function ManyToOne(
  typeFunctionOrTarget: (type?: any) => Function,
  inverseSide?: string | ((object: any) => any),
  options?: ManyToOneOptions
): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const metadataStorage = MetadataStorage.getInstance();

    const relationMetadata = {
      type: "many-to-one" as const,
      target: typeFunctionOrTarget,
      inverseSide: typeof inverseSide === "string" ? inverseSide : undefined,
      cascade: options?.cascade ?? false,
      eager: options?.eager ?? false,
      joinColumn: options?.joinColumn,
    };

    metadataStorage.addRelationMetadata(
      target.constructor,
      propertyKey.toString(),
      relationMetadata
    );
  };
}
