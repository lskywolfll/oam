export type ColumnType =
  | "string"
  | "text"
  | "int"
  | "integer"
  | "float"
  | "double"
  | "boolean"
  | "date"
  | "datetime"
  | "timestamp"
  | "json";

export type OnDeleteAction = "CASCADE" | "RESTRICT" | "SET NULL" | "NO ACTION";
export type OnUpdateAction = "CASCADE" | "RESTRICT" | "SET NULL" | "NO ACTION";

export interface ColumnMetadata {
  name: string;
  type: ColumnType;
  required?: boolean;
  unique?: boolean;
  default?: any;
  length?: number;
  nullable?: boolean;
  comment?: string;
}

export interface ForeignKeyMetadata {
  column: string;
  referencesTable: string;
  referencesColumn: string;
  onDelete?: OnDeleteAction;
  onUpdate?: OnUpdateAction;
}

export interface RelationMetadata {
  type: "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";
  target: () => Function;
  inverseSide?: string;
  cascade?: boolean;
  eager?: boolean;
  joinColumn?: string;
  joinTable?: string;
}

export interface EntityMetadata {
  name: string;
  tableName: string;
  columns: Map<string, ColumnMetadata>;
  relations: Map<string, RelationMetadata>;
  foreignKeys: ForeignKeyMetadata[];
  primaryColumn?: string;
}

export interface TableCreateRequest {
  columns: Array<{
    name: string;
    type: string;
    required?: boolean;
    unique?: boolean;
    default?: any;
  }>;
  foreign_keys?: Array<{
    column: string;
    references_table: string;
    references_column: string;
    on_delete?: string;
    on_update?: string;
  }>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
