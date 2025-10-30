# Swagger Docs MCP Server

A Model Context Protocol (MCP) server that fetches and interacts with Swagger/OpenAPI documentation with built-in authentication support.

## Features

- Fetch and parse Swagger/OpenAPI documentation from various sources:
  - Direct JSON/YAML files (e.g., `/swagger.json`, `/openapi.yaml`)
  - Swagger UI endpoints (e.g., `/api-docs`)
  - Multi-API swagger-config.json setups
- Multiple authentication methods:
  - Basic Authentication
  - Bearer Token
  - API Key
  - No authentication
- Cache fetched documentation for improved performance (configurable TTL)
- Comprehensive tools for:
  - Fetching and validating Swagger docs
  - Listing all API endpoints (with optional tag filtering)
  - Searching endpoints by keywords
  - Retrieving schema/model definitions
  - Getting API information and metadata
  - Working with multiple API sources

## Installation

```bash
npm install
npm run build
```

## Configuration

### Quick Start

There are two ways to configure this MCP server:

1. **Option A: Using .env file (Local Development)**
2. **Option B: Using MCP Settings (Recommended for Claude Desktop/Code)**

### Option A: Using .env File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and configure your Swagger URL and authentication:
   ```bash
   # Required: Your Swagger/OpenAPI documentation URL
   SWAGGER_URL=https://api.example.com/swagger.json

   # Choose authentication method
   AUTH_TYPE=basic  # or: none, bearer, apiKey

   # For Basic Auth
   AUTH_USERNAME=your_username
   AUTH_PASSWORD=your_password
   ```

3. Build and run:
   ```bash
   npm install
   npm run build
   npm start
   ```

### Option B: MCP Settings Configuration (Recommended)

Configure directly in your MCP settings file:

- **For Claude Code (CLI)**: Create `.mcp.json` at your project root
- **For Claude Desktop**: Edit settings via the app or `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
- **For other MCP clients**: Check their documentation for the correct config file location

#### Claude Code Configuration

For Claude Code CLI, create a `.mcp.json` file in your project root:

1. Create `.mcp.json` with your configuration:
   ```json
   {
     "mcpServers": {
       "swagger-docs": {
         "command": "node",
         "args": ["/absolute/path/to/swagger-docs-mcp/dist/index.js"],
         "env": {
           "SWAGGER_URL": "https://api.example.com/swagger.json",
           "AUTH_TYPE": "basic",
           "AUTH_USERNAME": "your_username",
           "AUTH_PASSWORD": "your_password"
         }
       }
     }
   }
   ```

2. Replace `/absolute/path/to/swagger-docs-mcp` with the actual path to your MCP server installation

3. **Important**: Restart Claude Code for the configuration to take effect

#### Claude Desktop Configuration Examples

For Claude Desktop, configure via the app settings or edit the config file directly:

#### Example 1: Basic Authentication
```json
{
  "mcpServers": {
    "swagger-docs": {
      "command": "node",
      "args": ["/absolute/path/to/swagger-docs-mcp/dist/index.js"],
      "env": {
        "SWAGGER_URL": "https://api.example.com/swagger.json",
        "AUTH_TYPE": "basic",
        "AUTH_USERNAME": "your_username",
        "AUTH_PASSWORD": "your_password"
      }
    }
  }
}
```

#### Example 2: Bearer Token Authentication
```json
{
  "mcpServers": {
    "swagger-docs": {
      "command": "node",
      "args": ["/absolute/path/to/swagger-docs-mcp/dist/index.js"],
      "env": {
        "SWAGGER_URL": "https://api.example.com/swagger.json",
        "AUTH_TYPE": "bearer",
        "AUTH_TOKEN": "your_bearer_token"
      }
    }
  }
}
```

#### Example 3: API Key Authentication
```json
{
  "mcpServers": {
    "swagger-docs": {
      "command": "node",
      "args": ["/absolute/path/to/swagger-docs-mcp/dist/index.js"],
      "env": {
        "SWAGGER_URL": "https://api.example.com/swagger.json",
        "AUTH_TYPE": "apiKey",
        "API_KEY": "your_api_key",
        "API_KEY_HEADER": "X-API-Key"
      }
    }
  }
}
```

#### Example 4: No Authentication
```json
{
  "mcpServers": {
    "swagger-docs": {
      "command": "node",
      "args": ["/absolute/path/to/swagger-docs-mcp/dist/index.js"],
      "env": {
        "SWAGGER_URL": "https://api.example.com/swagger.json",
        "AUTH_TYPE": "none"
      }
    }
  }
}
```

### Configuration Options

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `SWAGGER_URL` | **Yes** | URL to your Swagger/OpenAPI documentation | - |
| `AUTH_TYPE` | No | Authentication method: `none`, `basic`, `bearer`, or `apiKey` | `none` |
| `AUTH_USERNAME` | Conditional | Username for Basic Auth (required if `AUTH_TYPE=basic`) | - |
| `AUTH_PASSWORD` | Conditional | Password for Basic Auth (required if `AUTH_TYPE=basic`) | - |
| `AUTH_TOKEN` | Conditional | Bearer token (required if `AUTH_TYPE=bearer`) | - |
| `API_KEY` | Conditional | API Key (required if `AUTH_TYPE=apiKey`) | - |
| `API_KEY_HEADER` | No | Header name for API Key | `X-API-Key` |
| `CACHE_TTL` | No | Cache duration in milliseconds | `300000` (5 min) |

**Important Notes:**
- Replace `/absolute/path/to/swagger-docs-mcp` with the actual absolute path to your installation
- The `SWAGGER_URL` should point to your Swagger/OpenAPI documentation
- Sensitive credentials should be stored securely and never committed to version control

## Usage

The MCP server provides the following tools:

### 1. Fetch Swagger Documentation

```typescript
fetch_swagger({
  url: "https://api.example.com/swagger.json"
})
```

### 2. Get All Endpoints

```typescript
get_endpoints({
  tag: "users" // optional - filter by tag
})
```

### 3. Search Endpoints

```typescript
search_endpoints({
  query: "user"
})
```

### 4. Get Schema Definition

```typescript
get_schema({
  schemaName: "User"
})
```

### 5. Get API Information

```typescript
get_api_info({})
```

### 6. Validate Swagger Document

```typescript
validate_swagger({
  url: "https://api.example.com/swagger.json"
})
```

## Development

```bash
# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start
```

## Example Usage with Claude

1. **Configure the MCP server** with your `SWAGGER_URL` and authentication credentials in your MCP settings (`.mcp.json` for Claude Code or Claude Desktop settings)

2. **Build the server** if you haven't already:
   ```bash
   npm install
   npm run build
   ```

3. **Restart Claude Code/Desktop** to load the MCP server

4. **Start using the tools** in Claude:

   ```
   Claude: "Fetch the Swagger documentation from https://api.example.com/swagger.json"
   → Uses fetch_swagger({ url: "https://api.example.com/swagger.json" })

   Claude: "Show me all the user-related endpoints"
   → Uses get_endpoints({ tag: "users" })

   Claude: "Search for authentication endpoints"
   → Uses search_endpoints({ query: "auth" })

   Claude: "Show me the User schema"
   → Uses get_schema({ schemaName: "User" })

   Claude: "What's the API version and description?"
   → Uses get_api_info({})
   ```

5. **Work with the documentation** - Claude can now answer questions about your API, help generate code that uses the endpoints, explain request/response formats, and more

## Security Notes

- Store sensitive credentials in environment variables
- Never commit `.env` files to version control
- Use appropriate authentication method for your API
- The cache TTL can be adjusted based on how frequently your API documentation changes

## License

MIT