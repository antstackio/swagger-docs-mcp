import axios, { AxiosRequestConfig } from 'axios';
import { Config } from './config.js';

export class AuthManager {
  constructor(private config: Config) {}

  applyAuth(requestConfig: AxiosRequestConfig): AxiosRequestConfig {
    const { auth } = this.config;
    
    if (!auth || auth.type === 'none') {
      return requestConfig;
    }

    requestConfig.headers = requestConfig.headers || {};

    switch (auth.type) {
      case 'basic':
        if (auth.credentials?.username && auth.credentials?.password) {
          const token = Buffer.from(
            `${auth.credentials.username}:${auth.credentials.password}`
          ).toString('base64');
          requestConfig.headers['Authorization'] = `Basic ${token}`;
        }
        break;

      case 'bearer':
        if (auth.credentials?.token) {
          requestConfig.headers['Authorization'] = `Bearer ${auth.credentials.token}`;
        }
        break;

      case 'apiKey':
        if (auth.credentials?.apiKey) {
          const headerName = auth.credentials.apiKeyHeader || 'X-API-Key';
          requestConfig.headers[headerName] = auth.credentials.apiKey;
        }
        break;
    }

    return requestConfig;
  }

  async authenticatedRequest(url: string, config?: AxiosRequestConfig): Promise<any> {
    console.error(`[AuthManager] Making request to: ${url}`);
    console.error(`[AuthManager] Auth type: ${this.config.auth.type}`);
    const authConfig = this.applyAuth(config || {});
    // Force response to be text to avoid axios auto-parsing
    authConfig.responseType = 'text';
    console.error(`[AuthManager] Request config:`, JSON.stringify(authConfig, null, 2));
    try {
      const response = await axios.get(url, authConfig);
      console.error(`[AuthManager] Request successful, status: ${response.status}`);
      return response.data;
    } catch (error) {
      console.error(`[AuthManager] Request failed for ${url}:`, error);
      throw error;
    }
  }
}