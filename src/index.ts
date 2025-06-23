// Importar reflect-metadata al inicio
import "reflect-metadata";

// Exportar tipos
export * from "./types";
export * from "./interfaces/oam-config.interface";

// Exportar decoradores principales
export { Entity } from "./decorators/Entity";
export { Column } from "./decorators/Column";
export { PrimaryGeneratedColumn } from "./decorators/PrimaryGeneratedColumn";
export { ForeignKey } from "./decorators/ForeignKey";

// Exportar decoradores de relaciones
export { OneToOne } from "./decorators/relations/OneToOne";
export { OneToMany } from "./decorators/relations/OneToMany";
export { ManyToOne } from "./decorators/relations/ManyToOne";

// Exportar utilidades
export { MetadataStorage } from "./metadata/MetadataStorage";
export { SchemaBuilder } from "./schema/SchemaBuilder";

// Exportar módulo y servicio de NestJS
export { OamModule } from "./oam.module";
export { OamService } from "./services/oam.service";
