interface GraphQLResponse<T = any> {
    data?: T;
    errors?: Array<{
        message: string;
        locations?: Array<{
            line: number;
            column: number;
        }>;
        path?: Array<string | number>;
    }>;
}

class ICPApiClient {
    private readonly endpoint: string;

    constructor(endpoint: string = 'http://localhost:9446/graphql') {
        this.endpoint = endpoint;
    }

    private async executeGraphQL<T = any>(
        query: string,
        variables?: Record<string, any>
    ): Promise<T> {
        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    variables,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result: GraphQLResponse<T> = await response.json();

            if (result.errors && result.errors.length > 0) {
                throw new Error(result.errors[0].message);
            }

            if (!result.data) {
                throw new Error('No data returned from GraphQL query');
            }

            return result.data;
        } catch (error) {
            console.error('GraphQL Error:', error);
            throw error;
        }
    }

    // Query method for executing GraphQL queries
    async query<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
        return this.executeGraphQL<T>(query, variables);
    }

    // Mutation method for executing GraphQL mutations
    async mutate<T = any>(mutation: string, variables?: Record<string, any>): Promise<T> {
        return this.executeGraphQL<T>(mutation, variables);
    }
}

// Create a singleton instance
export const icpApiClient = new ICPApiClient();
export default ICPApiClient;