import SwaggerParser from '@apidevtools/swagger-parser';
import * as YAML from 'yaml';
import { AuthManager } from './auth.js';
import { Config } from './config.js';

export interface SwaggerDoc {
  openapi?: string;
  swagger?: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
  definitions?: Record<string, any>;
  tags?: Array<{
    name: string;
    description?: string;
  }>;
}

export interface SwaggerConfig {
  configUrl?: string;
  dom_id?: string;
  urls?: Array<{
    url: string;
    name: string;
  }>;
  [key: string]: any;
}

export interface CombinedSwaggerDoc extends SwaggerDoc {
  source?: string;
}

export interface EndpointInfo {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: any[];
  requestBody?: any;
  responses?: Record<string, any>;
  tags?: string[];
}

export class SwaggerFetcher {
  private authManager: AuthManager;
  private cache: Map<string, { data: SwaggerDoc; timestamp: number }> = new Map();
  private combinedDocs: Map<string, CombinedSwaggerDoc> = new Map();
  private swaggerConfig: SwaggerConfig | null = null;

  constructor(private config: Config) {
    this.authManager = new AuthManager(config);
  }

  private async fetchSwaggerConfig(baseUrl: string): Promise<SwaggerConfig> {
    try {
      const configUrl = `${baseUrl}/swagger-config.json`;
      console.error(`[SwaggerFetcher] Fetching config from: ${configUrl}`);
      const configData = await this.authManager.authenticatedRequest(configUrl);
      
      // Parse the JSON if it's a string
      let parsedConfig: SwaggerConfig;
      if (typeof configData === 'string') {
        parsedConfig = JSON.parse(configData);
      } else {
        parsedConfig = configData;
      }
      
      console.error(`[SwaggerFetcher] Config fetched successfully:`, JSON.stringify(parsedConfig, null, 2));
      return parsedConfig;
    } catch (error) {
      console.error(`[SwaggerFetcher] Failed to fetch swagger-config.json from ${baseUrl}:`, error);
      throw new Error(`Failed to fetch swagger-config.json: ${error}`);
    }
  }

  private async fetchIndividualSwaggerDoc(baseUrl: string, path: string): Promise<SwaggerDoc> {
    try {
      const fullUrl = `${baseUrl}/${path}`;
      console.error(`[SwaggerFetcher] Fetching individual doc from: ${fullUrl}`);
      const docData = await this.authManager.authenticatedRequest(fullUrl);
      console.error(`[SwaggerFetcher] Individual doc fetched, parsing...`);
      
      // Parse the data based on content type
      let parsedData: any;
      if (typeof docData === 'string') {
        // Check if the response is empty or just whitespace
        if (!docData.trim()) {
          console.error(`[SwaggerFetcher] Empty response for ${path}, skipping`);
          throw new Error('Empty response');
        }
        // Try to parse as YAML first, then JSON
        try {
          parsedData = YAML.parse(docData);
          console.error(`[SwaggerFetcher] Parsed as YAML`);
        } catch (yamlError) {
          try {
            parsedData = JSON.parse(docData);
            console.error(`[SwaggerFetcher] Parsed as JSON`);
          } catch (jsonError) {
            console.error(`[SwaggerFetcher] Failed to parse response. First 100 chars: ${docData.substring(0, 100)}`);
            throw new Error(`Unable to parse response as YAML or JSON. YAML error: ${yamlError}, JSON error: ${jsonError}`);
          }
        }
      } else {
        parsedData = docData;
      }
      
      // Just use the parsed data without additional validation
      const parsedDoc = parsedData as SwaggerDoc;
      console.error(`[SwaggerFetcher] Individual doc validated successfully for ${path}`);
      return parsedDoc;
    } catch (error) {
      console.error(`[SwaggerFetcher] Failed to fetch individual Swagger doc from ${path}:`, error);
      throw new Error(`Failed to fetch individual Swagger doc from ${path}: ${error}`);
    }
  }

  async fetchSwaggerDoc(url: string): Promise<SwaggerDoc> {
    console.error(`[SwaggerFetcher] Starting fetchSwaggerDoc for URL: ${url}`);
    
    const cached = this.cache.get(url);
    
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      console.error(`[SwaggerFetcher] Returning cached data for ${url}`);
      return cached.data;
    }

    try {
      // Check if this is a direct Swagger JSON URL
      if (url.endsWith('.json') || url.endsWith('.yaml') || url.endsWith('.yml')) {
        console.error(`[SwaggerFetcher] Detected direct Swagger file URL, fetching directly`);
        try {
          const docData = await this.authManager.authenticatedRequest(url);
          console.error(`[SwaggerFetcher] Direct Swagger doc fetched, parsing...`);
          
          // Parse the data based on content type
          let parsedData: any;
          if (typeof docData === 'string') {
            // Try to parse as YAML first, then JSON
            try {
              parsedData = YAML.parse(docData);
              console.error(`[SwaggerFetcher] Parsed as YAML`);
            } catch {
              try {
                parsedData = JSON.parse(docData);
                console.error(`[SwaggerFetcher] Parsed as JSON`);
              } catch {
                throw new Error('Unable to parse response as YAML or JSON');
              }
            }
          } else {
            parsedData = docData;
          }
          
          // Just use the parsed data without additional validation
      const parsedDoc = parsedData as SwaggerDoc;
          console.error(`[SwaggerFetcher] Direct Swagger doc validated successfully`);
          
          // Cache the result
          this.cache.set(url, { data: parsedDoc, timestamp: Date.now() });
          
          return parsedDoc;
        } catch (error) {
          console.error(`[SwaggerFetcher] Failed to fetch direct Swagger doc:`, error);
          throw new Error(`Failed to fetch Swagger documentation: ${error}`);
        }
      }
      
      // Extract base URL (remove path after domain)
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      console.error(`[SwaggerFetcher] Extracted base URL: ${baseUrl} from ${url}`);
      
      // Step 1: Fetch swagger-config.json
      console.error(`[SwaggerFetcher] Step 1: Fetching swagger-config.json`);
      this.swaggerConfig = await this.fetchSwaggerConfig(baseUrl);
      
      if (!this.swaggerConfig.urls || this.swaggerConfig.urls.length === 0) {
        console.error(`[SwaggerFetcher] No API URLs found in swagger-config.json`);
        throw new Error('No API URLs found in swagger-config.json');
      }
      
      console.error(`[SwaggerFetcher] Found ${this.swaggerConfig.urls.length} API URLs to fetch`);
      
      // Step 2: Fetch all individual API docs
      console.error(`[SwaggerFetcher] Step 2: Fetching all individual API docs`);
      this.combinedDocs.clear();
      const allPaths: Record<string, any> = {};
      const allSchemas: Record<string, any> = {};
      const allTags: Array<{ name: string; description?: string }> = [];
      const tagSet = new Set<string>();
      
      for (const apiConfig of this.swaggerConfig.urls) {
        console.error(`[SwaggerFetcher] Processing API config: ${apiConfig.name} -> ${apiConfig.url}`);
        try {
          const doc = await this.fetchIndividualSwaggerDoc(baseUrl, apiConfig.url);
          
          // Store individual doc with source info
          const docWithSource: CombinedSwaggerDoc = {
            ...doc,
            source: apiConfig.name
          };
          this.combinedDocs.set(apiConfig.name, docWithSource);
          console.error(`[SwaggerFetcher] Stored doc for ${apiConfig.name} with ${Object.keys(doc.paths || {}).length} paths`);
        
        // Merge paths
        const pathCount = Object.keys(doc.paths).length;
        console.error(`[SwaggerFetcher] Merging ${pathCount} paths from ${apiConfig.name}`);
        for (const [path, pathItem] of Object.entries(doc.paths)) {
          allPaths[path] = pathItem;
        }
        
        // Merge schemas
        if (doc.components?.schemas) {
          const schemaCount = Object.keys(doc.components.schemas).length;
          console.error(`[SwaggerFetcher] Merging ${schemaCount} schemas from components for ${apiConfig.name}`);
          Object.assign(allSchemas, doc.components.schemas);
        } else if (doc.definitions) {
          const schemaCount = Object.keys(doc.definitions).length;
          console.error(`[SwaggerFetcher] Merging ${schemaCount} schemas from definitions for ${apiConfig.name}`);
          Object.assign(allSchemas, doc.definitions);
        }
        
        // Merge tags
        if (doc.tags) {
          console.error(`[SwaggerFetcher] Merging ${doc.tags.length} tags from ${apiConfig.name}`);
          for (const tag of doc.tags) {
            if (!tagSet.has(tag.name)) {
              tagSet.add(tag.name);
              allTags.push(tag);
            }
          }
        }
        } catch (error) {
          console.error(`[SwaggerFetcher] Failed to fetch ${apiConfig.name}: ${error}`);
          // Continue with other docs
        }
      }
      
      // Create combined swagger doc
      console.error(`[SwaggerFetcher] Creating combined doc with ${Object.keys(allPaths).length} total paths, ${Object.keys(allSchemas).length} schemas, ${allTags.length} tags`);
      const firstDoc = this.combinedDocs.values().next().value;
      const combinedDoc: SwaggerDoc = {
        openapi: firstDoc?.openapi,
        swagger: firstDoc?.swagger,
        info: {
          title: 'Combined API Documentation',
          version: '1.0.0',
          description: `Combined documentation from ${this.swaggerConfig.urls.length} API sources`
        },
        paths: allPaths,
        components: {
          schemas: allSchemas,
          securitySchemes: firstDoc?.components?.securitySchemes
        },
        tags: allTags
      };
      console.error(`[SwaggerFetcher] Combined doc created successfully`);
      
      this.cache.set(url, {
        data: combinedDoc,
        timestamp: Date.now(),
      });
      console.error(`[SwaggerFetcher] Cached combined doc for ${url}`);

      return combinedDoc;
    } catch (error) {
      console.error(`[SwaggerFetcher] Error in fetchSwaggerDoc:`, error);
      throw new Error(`Failed to fetch Swagger documentation: ${error}`);
    }
  }

  async validateSwaggerDoc(url: string): Promise<boolean> {
    try {
      const doc = await this.fetchSwaggerDoc(url);
      await SwaggerParser.validate(doc as any);
      return true;
    } catch (error) {
      return false;
    }
  }

  getEndpoints(swaggerDoc: SwaggerDoc): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];

    for (const [path, pathItem] of Object.entries(swaggerDoc.paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method.toLowerCase())) {
          const op = operation as any;
          endpoints.push({
            path,
            method: method.toUpperCase(),
            summary: op.summary,
            description: op.description,
            operationId: op.operationId,
            parameters: op.parameters,
            requestBody: op.requestBody,
            responses: op.responses,
            tags: op.tags,
          });
        }
      }
    }

    return endpoints;
  }

  getSchemas(swaggerDoc: SwaggerDoc): Record<string, any> {
    if (swaggerDoc.openapi) {
      return swaggerDoc.components?.schemas || {};
    } else {
      return swaggerDoc.definitions || {};
    }
  }

  getEndpointsByTag(swaggerDoc: SwaggerDoc, tag: string): EndpointInfo[] {
    const allEndpoints = this.getEndpoints(swaggerDoc);
    return allEndpoints.filter(endpoint => 
      endpoint.tags && endpoint.tags.includes(tag)
    );
  }

  searchEndpoints(swaggerDoc: SwaggerDoc, query: string): EndpointInfo[] {
    const allEndpoints = this.getEndpoints(swaggerDoc);
    const lowerQuery = query.toLowerCase();
    
    return allEndpoints.filter(endpoint => {
      const searchableText = [
        endpoint.path,
        endpoint.method,
        endpoint.summary || '',
        endpoint.description || '',
        endpoint.operationId || '',
        ...(endpoint.tags || [])
      ].join(' ').toLowerCase();
      
      return searchableText.includes(lowerQuery);
    });
  }

  getApiSources(): Array<{ name: string }> {
    if (!this.swaggerConfig || !this.swaggerConfig.urls) {
      return [];
    }
    return this.swaggerConfig.urls.map(source => ({ name: source.name }));
  }

  getDocBySource(sourceName: string): CombinedSwaggerDoc | undefined {
    return this.combinedDocs.get(sourceName);
  }
}