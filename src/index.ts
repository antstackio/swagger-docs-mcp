#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { loadConfig } from './config.js';
import { SwaggerFetcher, SwaggerDoc } from './swagger-fetcher.js';

const config = loadConfig();
const swaggerFetcher = new SwaggerFetcher(config);

let cachedSwaggerDoc: SwaggerDoc | null = null;

const server = new Server(
  {
    name: 'swagger-docs-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const FetchSwaggerSchema = z.object({
  url: z.string().url().describe('The URL of the Swagger/OpenAPI documentation'),
});

const GetEndpointsSchema = z.object({
  tag: z.string().optional().describe('Optional tag to filter endpoints'),
}).strict();

const SearchEndpointsSchema = z.object({
  query: z.string().describe('Search query to find endpoints'),
}).strict();

const GetSchemaSchema = z.object({
  schemaName: z.string().describe('Name of the schema to retrieve'),
}).strict();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'fetch_swagger',
        description: 'Fetch and parse Swagger/OpenAPI documentation from a URL with authentication',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL of the Swagger/OpenAPI documentation'
            }
          },
          required: ['url']
        },
      },
      {
        name: 'get_endpoints',
        description: 'Get all API endpoints from the fetched Swagger documentation',
        inputSchema: {
          type: 'object',
          properties: {
            tag: {
              type: 'string',
              description: 'Optional tag to filter endpoints'
            }
          },
          required: []
        },
      },
      {
        name: 'search_endpoints',
        description: 'Search for API endpoints by query string',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to find endpoints'
            }
          },
          required: ['query']
        },
      },
      {
        name: 'get_schema',
        description: 'Get a specific schema/model definition from the Swagger documentation',
        inputSchema: {
          type: 'object',
          properties: {
            schemaName: {
              type: 'string',
              description: 'Name of the schema to retrieve'
            }
          },
          required: ['schemaName']
        },
      },
      {
        name: 'get_api_info',
        description: 'Get general information about the API',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        },
      },
      {
        name: 'validate_swagger',
        description: 'Validate a Swagger/OpenAPI document',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL of the Swagger/OpenAPI documentation to validate'
            }
          },
          required: ['url']
        },
      },
      {
        name: 'get_api_sources',
        description: 'Get list of available API documentation sources',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        },
      },
      {
        name: 'get_doc_by_source',
        description: 'Get documentation for a specific API source',
        inputSchema: {
          type: 'object',
          properties: {
            sourceName: {
              type: 'string',
              description: 'Name of the API source'
            }
          },
          required: ['sourceName']
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'fetch_swagger': {
        if (!args) {
          throw new Error('No arguments provided for fetch_swagger');
        }
        const { url } = FetchSwaggerSchema.parse(args);
        cachedSwaggerDoc = await swaggerFetcher.fetchSwaggerDoc(url);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                info: {
                  title: cachedSwaggerDoc.info.title,
                  version: cachedSwaggerDoc.info.version,
                  description: cachedSwaggerDoc.info.description,
                },
                pathCount: Object.keys(cachedSwaggerDoc.paths).length,
                tags: cachedSwaggerDoc.tags,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_endpoints': {
        if (!cachedSwaggerDoc) {
          throw new Error('No Swagger documentation loaded. Please fetch a Swagger document first.');
        }
        
        const { tag } = GetEndpointsSchema.parse(args || {});
        const endpoints = tag 
          ? swaggerFetcher.getEndpointsByTag(cachedSwaggerDoc, tag)
          : swaggerFetcher.getEndpoints(cachedSwaggerDoc);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(endpoints, null, 2),
            },
          ],
        };
      }

      case 'search_endpoints': {
        if (!cachedSwaggerDoc) {
          throw new Error('No Swagger documentation loaded. Please fetch a Swagger document first.');
        }
        
        if (!args) {
          throw new Error('No arguments provided for search_endpoints');
        }
        const { query } = SearchEndpointsSchema.parse(args);
        const endpoints = swaggerFetcher.searchEndpoints(cachedSwaggerDoc, query);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(endpoints, null, 2),
            },
          ],
        };
      }

      case 'get_schema': {
        if (!cachedSwaggerDoc) {
          throw new Error('No Swagger documentation loaded. Please fetch a Swagger document first.');
        }
        
        if (!args) {
          throw new Error('No arguments provided for get_schema');
        }
        const { schemaName } = GetSchemaSchema.parse(args);
        const schemas = swaggerFetcher.getSchemas(cachedSwaggerDoc);
        const schema = schemas[schemaName];
        
        if (!schema) {
          throw new Error(`Schema '${schemaName}' not found`);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(schema, null, 2),
            },
          ],
        };
      }

      case 'get_api_info': {
        if (!cachedSwaggerDoc) {
          throw new Error('No Swagger documentation loaded. Please fetch a Swagger document first.');
        }
        
        const schemas = swaggerFetcher.getSchemas(cachedSwaggerDoc);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                info: cachedSwaggerDoc.info,
                version: cachedSwaggerDoc.openapi || cachedSwaggerDoc.swagger,
                tags: cachedSwaggerDoc.tags,
                pathCount: Object.keys(cachedSwaggerDoc.paths).length,
                schemaCount: Object.keys(schemas).length,
                schemaNames: Object.keys(schemas),
              }, null, 2),
            },
          ],
        };
      }

      case 'validate_swagger': {
        if (!args) {
          throw new Error('No arguments provided for validate_swagger');
        }
        const { url } = z.object({ url: z.string().url() }).parse(args);
        const isValid = await swaggerFetcher.validateSwaggerDoc(url);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                valid: isValid,
                message: isValid ? 'Swagger document is valid' : 'Swagger document is invalid',
              }, null, 2),
            },
          ],
        };
      }

      case 'get_api_sources': {
        if (!cachedSwaggerDoc) {
          throw new Error('No Swagger documentation loaded. Please fetch a Swagger document first.');
        }
        
        const sources = swaggerFetcher.getApiSources();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                sources,
                count: sources.length,
              }, null, 2),
            },
          ],
        };
      }

      case 'get_doc_by_source': {
        if (!cachedSwaggerDoc) {
          throw new Error('No Swagger documentation loaded. Please fetch a Swagger document first.');
        }
        
        if (!args) {
          throw new Error('No arguments provided for get_doc_by_source');
        }
        const { sourceName } = z.object({ sourceName: z.string() }).parse(args);
        const sourceDoc = swaggerFetcher.getDocBySource(sourceName);
        
        if (!sourceDoc) {
          throw new Error(`API source '${sourceName}' not found`);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                source: sourceName,
                info: sourceDoc.info,
                pathCount: Object.keys(sourceDoc.paths).length,
                schemas: swaggerFetcher.getSchemas(sourceDoc),
              }, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: true,
            message: error instanceof Error ? error.message : 'An unknown error occurred',
          }, null, 2),
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Swagger Docs MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});