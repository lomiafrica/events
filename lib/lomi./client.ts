import { DefaultService, OpenAPI } from "@lomi./sdk";
import "dotenv/config";

const apiKey = process.env.LOMI_API_KEY;
const baseUrl = process.env.NEXT_PUBLIC_LOMI_API_URL;

if (!apiKey) {
  console.error(
    "Error: LOMI_API_KEY not found in environment variables. Please check your .env file.",
  );
  process.exit(1);
}

OpenAPI.BASE = baseUrl || "https://api.lomi.africa/v1";
OpenAPI.HEADERS = {
  Authorization: `Bearer `,
};

export const lomiApi = DefaultService;

export default lomiApi;
