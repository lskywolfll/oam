// Importaciones opcionales de NestJS
let DynamicModule: any, Module: any, OnApplicationBootstrap: any, Provider: any;

try {
  // Intentar importar decoradores de NestJS si están disponibles
  const nestjsCommon = require("@nestjs/common");
  DynamicModule = nestjsCommon.DynamicModule;
  Module = nestjsCommon.Module;
  OnApplicationBootstrap = nestjsCommon.OnApplicationBootstrap;
  Provider = nestjsCommon.Provider;
} catch (error) {
  // Si NestJS no está disponible, crear tipos dummy
  DynamicModule = class {};
  Module = () => (target: any) => target;
  OnApplicationBootstrap = class {};
  Provider = {};
}

import {
  OamConnectionOptions,
  OamModuleAsyncOptions,
  OamOptionsFactory,
} from "./interfaces/oam-config.interface";
import { OamService } from "./services/oam.service";

export const OAM_CONNECTION_OPTIONS = "OAM_CONNECTION_OPTIONS";

@Module({})
export class OamModule implements OnApplicationBootstrap {
  constructor(private readonly oamService: OamService) {}

  async onApplicationBootstrap() {
    const options = this.oamService.getConnectionOptions();

    if (options.autoCreateTables && options.entities) {
      try {
        const results = await this.oamService.createTables(options.entities);
        const successCount = results.filter((r) => r.success).length;
        const failureCount = results.filter((r) => !r.success).length;

        console.log(
          `🚀 OAM: ${successCount} tablas creadas exitosamente, ${failureCount} fallaron`
        );

        if (failureCount > 0) {
          const failedTables = results
            .filter((r) => !r.success)
            .map((r) => r.tableName);
          console.warn(
            `⚠️  OAM: Tablas que fallaron: ${failedTables.join(", ")}`
          );
        }
      } catch (error) {
        console.error(
          "❌ OAM: Error durante la auto-creación de tablas:",
          error
        );
      }
    }
  }

  /**
   * Configuración estática del módulo
   */
  static forRoot(options: OamConnectionOptions): any {
    return {
      module: OamModule,
      providers: [
        {
          provide: OAM_CONNECTION_OPTIONS,
          useValue: options,
        },
        {
          provide: OamService,
          useFactory: (opts: OamConnectionOptions) => new OamService(opts),
          inject: [OAM_CONNECTION_OPTIONS],
        },
      ],
      exports: [OamService],
      global: true,
    };
  }

  /**
   * Configuración asíncrona del módulo
   */
  static forRootAsync(options: OamModuleAsyncOptions): any {
    return {
      module: OamModule,
      imports: options.imports || [],
      providers: [
        ...this.createAsyncProviders(options),
        {
          provide: OamService,
          useFactory: (opts: OamConnectionOptions) => new OamService(opts),
          inject: [OAM_CONNECTION_OPTIONS],
        },
      ],
      exports: [OamService],
      global: true,
    };
  }

  /**
   * Configuración de feature modules (para cargar entidades específicas)
   */
  static forFeature(entities: Function[]): any {
    return {
      module: OamModule,
      providers: [
        {
          provide: "OAM_FEATURE_ENTITIES",
          useValue: entities,
        },
      ],
      exports: ["OAM_FEATURE_ENTITIES"],
    };
  }

  private static createAsyncProviders(options: OamModuleAsyncOptions): any[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    return [];
  }

  private static createAsyncOptionsProvider(
    options: OamModuleAsyncOptions
  ): any {
    if (options.useFactory) {
      return {
        provide: OAM_CONNECTION_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    if (options.useExisting) {
      return {
        provide: OAM_CONNECTION_OPTIONS,
        useFactory: async (optionsFactory: OamOptionsFactory) =>
          await optionsFactory.createOamOptions(),
        inject: [options.useExisting],
      };
    }

    if (options.useClass) {
      return {
        provide: OAM_CONNECTION_OPTIONS,
        useFactory: async (optionsFactory: OamOptionsFactory) =>
          await optionsFactory.createOamOptions(),
        inject: [options.useClass],
      };
    }

    throw new Error("Configuración inválida para OamModule.forRootAsync()");
  }
}
