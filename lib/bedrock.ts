import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';

// Create Bedrock provider configuration
// In AWS (App Runner/Lambda/EC2), uses IAM role credentials automatically
// Locally, uses AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY from environment
const bedrockConfig: Parameters<typeof createAmazonBedrock>[0] = {
  region: process.env.AWS_REGION || 'us-west-2',
};

// Only add explicit credentials if they are provided (for local development)
// In AWS environments, the SDK will use the IAM role automatically
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  bedrockConfig.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  bedrockConfig.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (process.env.AWS_SESSION_TOKEN) {
    bedrockConfig.sessionToken = process.env.AWS_SESSION_TOKEN;
  }
}

export const bedrock = createAmazonBedrock(bedrockConfig);
