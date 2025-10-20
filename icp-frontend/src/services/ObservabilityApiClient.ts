// TypeScript interfaces matching the Ballerina backend types
export interface LogEntryRequest {
  startTime: string;
  endTime: string;
  logStartIndex: number;
  logCount: number;
  runtime?: string;
  component?: string;
  environment?: string;
  project?: string;
  logLevel?: string;
}

export interface LogEntry {
  time: string;
  level: string;
  runtime: string;
  component: string;
  project: string;
  environment: string;
  message: string;
  additionalTags: Record<string, any>;
}

export interface LogCount {
  total: number;
  info: number;
  debug: number;
  warn: number;
  error: number;
}

export interface LogEntriesResponse {
  logs: LogEntry[];
  logCounts: LogCount;
}

class ObservabilityApiClient {
  private readonly endpoint: string;

  constructor(endpoint?: string) {
    // In development, use relative path to leverage proxy
    const defaultEndpoint = 'https://localhost:9448/icp/observability';

    this.endpoint = endpoint || process.env.REACT_APP_OBSERVABILITY_URL || defaultEndpoint;
  }

  private async executeRequest<T = any>(
    path: string,
    method: string = 'POST',
    body?: any
  ): Promise<T> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Dynamically retrieve token from localStorage (where AuthContext stores it)
      const storedUser = localStorage.getItem('icp_auth_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser.token) {
            headers['Authorization'] = `Bearer ${parsedUser.token}`;
          }
        } catch (e) {
          console.error('Failed to parse stored user for auth header', e);
        }
      }

      const response = await fetch(`${this.endpoint}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Observability API Error:', error);
      throw error;
    }
  }

  /**
   * Fetch logs and log counts based on time range and filters with pagination support
   * @param request - Log entry request with time range and pagination parameters
   * @returns Log entries and counts for the requested page
   */
  async getLogs(request: LogEntryRequest): Promise<LogEntriesResponse> {
    return this.executeRequest<LogEntriesResponse>('/logs', 'POST', request);
  }
}

// Create a singleton instance
export const observabilityApiClient = new ObservabilityApiClient();
export default ObservabilityApiClient;
