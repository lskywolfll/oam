// Importaciones opcionales de NestJS
let Injectable: any, Logger: any;

try {
  // Intentar importar decoradores de NestJS si están disponibles
  const nestjsCommon = require("@nestjs/common");
  Injectable = nestjsCommon.Injectable;
  Logger = nestjsCommon.Logger;
} catch (error) {
  // Si NestJS no está disponible, crear decoradores dummy
  Injectable = () => (target: any) => target;
  Logger = class {
    constructor(private context?: string) {}
    log(message: any) {
      console.log(`[${this.context || "OAM"}] ${message}`);
    }
    debug(message: any) {
      console.debug(`[${this.context || "OAM"}] ${message}`);
    }
    warn(message: any) {
      console.warn(`[${this.context || "OAM"}] ${message}`);
    }
    error(message: any, trace?: string) {
      console.error(`[${this.context || "OAM"}] ${message}`, trace || "");
    }
  };
}

import axios, { AxiosInstance } from "axios";
import {
  OamConnectionOptions,
  CreateTableResponse,
} from "../interfaces/oam-config.interface";
import { TableCreateRequest } from "../types";
import { SchemaBuilder } from "../schema/SchemaBuilder";
import { MetadataStorage } from "../metadata/MetadataStorage";

@Injectable()
export class OamService {
  private readonly logger = new Logger(OamService.name);
  private readonly httpClient: AxiosInstance;
  private readonly schemaBuilder: SchemaBuilder;
  private readonly metadataStorage: MetadataStorage;

  constructor(private readonly options: OamConnectionOptions) {
    this.schemaBuilder = new SchemaBuilder();
    this.metadataStorage = MetadataStorage.getInstance();

    // Construir la URL base
    const baseURL = this.buildBaseUrl();

    // Configurar cliente HTTP
    this.httpClient = axios.create({
      baseURL,
      timeout: options.timeout || 5000,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    // Configurar autenticación básica
    if (options.username && options.password) {
      this.httpClient.defaults.auth = {
        username: options.username,
        password: options.password,
      };
    }

    // Interceptor para logging si debug está habilitado
    if (options.debug) {
      this.setupDebugInterceptors();
    }
  }

  private buildBaseUrl(): string {
    const { host, port, apiPrefix = "api", apiVersion = "v2" } = this.options;

    let url = host;

    // Agregar puerto si se especifica y no está ya en la URL
    if (port && !host.includes(":")) {
      url = `${url}:${port}`;
    }

    // Asegurar que comience con http:// o https://
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `http://${url}`;
    }

    return `${url}/${apiPrefix}/${apiVersion}`;
  }

  private setupDebugInterceptors(): void {
    this.httpClient.interceptors.request.use(
      (config: any) => {
        this.logger.debug(
          `Enviando petición: ${config.method?.toUpperCase()} ${config.url}`
        );
        if (config.data) {
          this.logger.debug(`Payload: ${JSON.stringify(config.data, null, 2)}`);
        }
        return config;
      },
      (error: any) => {
        this.logger.error("Error en petición:", error);
        return Promise.reject(error);
      }
    );

    this.httpClient.interceptors.response.use(
      (response: any) => {
        this.logger.debug(
          `Respuesta recibida: ${response.status} ${response.statusText}`
        );
        return response;
      },
      (error: any) => {
        this.logger.error(
          "Error en respuesta:",
          error.response?.data || error.message
        );
        return Promise.reject(error);
      }
    );
  }

  /**
   * Crear una tabla basándose en una entidad
   */
  async createTable(entityClass: Function): Promise<CreateTableResponse> {
    try {
      const metadata = this.metadataStorage.getEntityMetadata(entityClass);

      if (!metadata) {
        throw new Error(
          `No se encontraron metadatos para la entidad ${entityClass.name}`
        );
      }

      const tableName = metadata.tableName;
      const payload = this.schemaBuilder.buildTableCreateRequest(entityClass);

      this.logger.log(`Creando tabla: ${tableName}`);

      const response = await this.httpClient.post(
        `/tables/${tableName}/create`,
        payload
      );

      return {
        success: true,
        tableName,
        message: `Tabla ${tableName} creada exitosamente`,
        ...response.data,
      };
    } catch (error: any) {
      this.logger.error(
        `Error creando tabla para ${entityClass.name}:`,
        error.message
      );

      return {
        success: false,
        tableName: entityClass.name,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Crear múltiples tablas en orden de dependencias
   */
  async createTables(entities: Function[]): Promise<CreateTableResponse[]> {
    const results: CreateTableResponse[] = [];

    try {
      // Ordenar entidades por dependencias si está habilitado
      const sortedEntities =
        this.options.autoSortEntities !== false
          ? this.schemaBuilder.sortEntitiesByDependencies(entities)
          : entities;

      // Validar dependencias
      const validation =
        this.schemaBuilder.validateDependencies(sortedEntities);
      if (!validation.valid) {
        this.logger.warn("Advertencias de dependencias:", validation.errors);
      }

      this.logger.log(
        `Creando ${sortedEntities.length} tablas en orden de dependencias`
      );

      // Crear tablas una por una
      for (const entity of sortedEntities) {
        const result = await this.createTable(entity);
        results.push(result);

        if (!result.success) {
          this.logger.error(
            `Falló la creación de tabla ${result.tableName}, continuando...`
          );
        }
      }
    } catch (error: any) {
      this.logger.error("Error en creación masiva de tablas:", error.message);
    }

    return results;
  }

  /**
   * Obtener el payload de creación para una entidad sin enviar la petición
   */
  getTableCreatePayload(entityClass: Function): TableCreateRequest {
    return this.schemaBuilder.buildTableCreateRequest(entityClass);
  }

  /**
   * Generar comando cURL para una entidad
   */
  generateCurlCommand(entityClass: Function): string {
    return this.schemaBuilder.generateCurlCommand(
      entityClass,
      this.buildBaseUrl()
    );
  }

  /**
   * Verificar la conexión con la API
   */
  async checkConnection(): Promise<boolean> {
    try {
      // Intentar hacer una petición simple para verificar conectividad
      await this.httpClient.get("/health", { timeout: 3000 });
      return true;
    } catch (error) {
      this.logger.error("Error verificando conexión:", error);
      return false;
    }
  }

  /**
   * Obtener las entidades registradas
   */
  getRegisteredEntities(): Function[] {
    return this.options.entities || [];
  }

  /**
   * Obtener la configuración actual
   */
  getConnectionOptions(): OamConnectionOptions {
    return { ...this.options };
  }
}
