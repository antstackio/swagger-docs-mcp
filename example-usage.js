#!/usr/bin/env node

import { spawn } from 'child_process';
import { resolve } from 'path';

const serverPath = resolve('./dist/index.js');

console.log('Example: Fetching endpoints from Swagger documentation\n');

const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseBuffer = '';
let requestId = 1;

// Example Swagger URL (replace with your actual Swagger URL)
const SWAGGER_URL = 'https://petstore.swagger.io/v2/swagger.json';

async function sendRequest(method, params) {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: requestId++
    };
    
    const currentId = request.id;
    
    const dataHandler = (data) => {
      responseBuffer += data.toString();
      const lines = responseBuffer.split('\n');
      
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        if (line) {
          try {
            const response = JSON.parse(line);
            if (response.id === currentId) {
              server.stdout.removeListener('data', dataHandler);
              resolve(response);
            }
          } catch (e) {
            // Not a complete JSON response yet
          }
        }
      }
      responseBuffer = lines[lines.length - 1];
    };
    
    server.stdout.on('data', dataHandler);
    server.stdin.write(JSON.stringify(request) + '\n');
  });
}

async function main() {
  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 500));
  
  try {
    // Step 1: Fetch the Swagger document
    console.log(`1. Fetching Swagger documentation from: ${SWAGGER_URL}`);
    const fetchResponse = await sendRequest('tools/call', {
      name: 'fetch_swagger',
      arguments: { url: SWAGGER_URL }
    });
    
    if (fetchResponse.result) {
      const info = JSON.parse(fetchResponse.result.content[0].text);
      console.log('   ✅ Successfully fetched:', info.info.title);
      console.log('   Version:', info.info.version);
      console.log('   Total paths:', info.pathCount);
      console.log('');
    }
    
    // Step 2: Get all endpoints
    console.log('2. Getting all endpoints:');
    const endpointsResponse = await sendRequest('tools/call', {
      name: 'get_endpoints',
      arguments: {}
    });
    
    if (endpointsResponse.result) {
      const endpoints = JSON.parse(endpointsResponse.result.content[0].text);
      console.log(`   Found ${endpoints.length} endpoints:\n`);
      
      // Show first 5 endpoints as example
      endpoints.slice(0, 5).forEach(endpoint => {
        console.log(`   ${endpoint.method} ${endpoint.path}`);
        if (endpoint.summary) {
          console.log(`     Summary: ${endpoint.summary}`);
        }
      });
      
      if (endpoints.length > 5) {
        console.log(`   ... and ${endpoints.length - 5} more endpoints`);
      }
      console.log('');
    }
    
    // Step 3: Search for specific endpoints
    console.log('3. Searching for "pet" endpoints:');
    const searchResponse = await sendRequest('tools/call', {
      name: 'search_endpoints',
      arguments: { query: 'pet' }
    });
    
    if (searchResponse.result) {
      const petEndpoints = JSON.parse(searchResponse.result.content[0].text);
      console.log(`   Found ${petEndpoints.length} pet-related endpoints:`);
      petEndpoints.forEach(endpoint => {
        console.log(`   ${endpoint.method} ${endpoint.path}`);
      });
      console.log('');
    }
    
    // Step 4: Get API info
    console.log('4. Getting API information:');
    const infoResponse = await sendRequest('tools/call', {
      name: 'get_api_info',
      arguments: {}
    });
    
    if (infoResponse.result) {
      const apiInfo = JSON.parse(infoResponse.result.content[0].text);
      console.log('   API Title:', apiInfo.info.title);
      console.log('   OpenAPI Version:', apiInfo.version);
      console.log('   Total Schemas:', apiInfo.schemaCount);
      if (apiInfo.tags && apiInfo.tags.length > 0) {
        console.log('   Tags:', apiInfo.tags.map(t => t.name).join(', '));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('\n✅ Example completed successfully!');
    server.kill();
    process.exit(0);
  }
}

server.stderr.on('data', (data) => {
  const message = data.toString();
  if (!message.includes('server running')) {
    console.error('Server error:', message);
  }
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

main();