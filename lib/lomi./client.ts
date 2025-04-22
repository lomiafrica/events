import { DefaultService, OpenAPI } from '@lomi./sdk'; // Use the actual exported service
import 'dotenv/config';

// Load API key and optional base URL from environment variables
const apiKey = process.env.LOMI_API_KEY;
const baseUrl = process.env.NEXT_PUBLIC_LOMI_API_URL || undefined; // OpenAPIConfig expects undefined, not empty string

if (!apiKey) {
  console.error('Error: LOMI_API_KEY not found in environment variables. Please check your .env file.');
  process.exit(1);
}

// Configure the OpenAPI client
OpenAPI.BASE = baseUrl || 'https://api.lomi.africa/v1'; // Set base URL if provided
OpenAPI.HEADERS = {
  'Authorization': `Bearer `,
};

// Instantiate the single service
export const lomiApi = DefaultService;

// Export the service instance (it's often used statically with configuration)
export default lomiApi;
