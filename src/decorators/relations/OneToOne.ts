import { MetadataStorage } from "../../metadata/MetadataStorage";

export interface OneToOneOptions {
  cascade?: boolean;
  eager?: boolean;
  inverseSide?: string;
  joinColumn?: string;
}

export function OneToOne(
  typeFunctionOrTarget: (type?: any) => Function,
  inverseSide?: string | ((object: any) => any),
  options?: OneToOneOptions
): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    const metadataStorage = MetadataStorage.getInstance();

    const relationMetadata = {
      type: "one-to-one" as const,
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
