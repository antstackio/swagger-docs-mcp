# Swagger Docs MCP Server

A Model Context Protocol (MCP) server that fetches and interacts with Swagger/OpenAPI documentation with built-in authentication support.

## Features

- Fetch and parse Swagger/OpenAPI documentation from URLs
- Multiple authentication methods:
  - Basic Authentication
  - Bearer Token
  - API Key
  - No authentication
- Cache fetched documentation for improved performance
- Tools for:
  - Fetching Swagger docs
  - Listing all endpoints
  - Searching endpoints
  - Getting schema definitions
  - Validating Swagger documents
  - Getting API information

## Installation

```bash
npm install
npm run build
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Configure authentication based on your API requirements:

- **No Auth**: Set `AUTH_TYPE=none`
- **Basic Auth**: Set `AUTH_TYPE=basic` with `AUTH_USERNAME` and `AUTH_PASSWORD`
- **Bearer Token**: Set `AUTH_TYPE=bearer` with `AUTH_TOKEN`
- **API Key**: Set `AUTH_TYPE=apiKey` with `API_KEY` and optionally `API_KEY_HEADER`

### MCP Configuration

Add to your MCP settings file (e.g., `~/.config/mcp/settings.json`):

```json
{
  "mcpServers": {
    "swagger-docs": {
      "command": "node",
      "args": ["/path/to/swagger-docs-mcp/dist/index.js"],
      "env": {
        "AUTH_TYPE": "bearer",
        "AUTH_TOKEN": "your-token-here"
      }
    }
  }
}
```

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

1. Configure the MCP server with your API credentials
2. In Claude, use the tools to interact with your API documentation:

```
- First fetch the Swagger docs: fetch_swagger with your API URL
- List all endpoints: get_endpoints
- Search for specific endpoints: search_endpoints with a query
- Get schema details: get_schema with a schema name
```

## Security Notes

- Store sensitive credentials in environment variables
- Never commit `.env` files to version control
- Use appropriate authentication method for your API
- The cache TTL can be adjusted based on how frequently your API documentation changes

## License

MIT