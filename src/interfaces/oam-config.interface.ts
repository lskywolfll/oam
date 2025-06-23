// Tipos básicos que no dependen de NestJS
export type ModuleMetadata = {
  imports?: any[];
};

export type Type<T = {}> = new (...args: any[]) => T;

export interface OamConnectionOptions {
  /**
   * URL base de la API de database management
   * Ejemplo: 'http://localhost:8080' o 'https://api.example.com'
   */
  host: string;

  /**
   * Puerto de la API (opcional, se incluirá en la URL si se especifica)
   */
  port?: number;

  /**
   * Usuario para autenticación
   */
  username: string;

  /**
   * Contraseña para autenticación
   */
  password: string;

  /**
   * Versión de la API (por defecto: 'v2')
   */
  apiVersion?: string;

  /**
   * Prefijo de la API (por defecto: 'api')
   */
  apiPrefix?: string;

  /**
   * Timeout para las peticiones HTTP en milisegundos (por defecto: 5000)
   */
  timeout?: number;

  /**
   * Headers adicionales para las peticiones
   */
  headers?: Record<string, string>;

  /**
   * Habilitar logs de debug
   */
  debug?: boolean;

  /**
   * Entidades a registrar automáticamente
   */
  entities?: Function[];

  /**
   * Auto-crear tablas al inicializar (por defecto: false)
   */
  autoCreateTables?: boolean;

  /**
   * Ordenar automáticamente las entidades por dependencias (por defecto: true)
   */
  autoSortEntities?: boolean;
}

export interface OamOptionsFactory {
  createOamOptions(): Promise<OamConnectionOptions> | OamConnectionOptions;
}

export interface OamModuleAsyncOptions extends Pick<ModuleMetadata, "imports"> {
  useExisting?: Type<OamOptionsFactory>;
  useClass?: Type<OamOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<OamConnectionOptions> | OamConnectionOptions;
  inject?: any[];
}

export interface CreateTableResponse {
  success: boolean;
  tableName: string;
  message?: string;
  error?: string;
}
