/**
 * AWS utilities for the environment CLI tool
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

/**
 * Creates an AWS Secrets Manager client
 * @param region - AWS region
 * @param profile - Optional AWS profile
 * @returns Configured SecretsManagerClient
 */
export function createSecretsManagerClient(region: string, profile?: string): SecretsManagerClient {
    const clientConfig: any = {
        region: region,
    };
    
    if (profile) {
        // Set AWS profile environment variable
        process.env.AWS_PROFILE = profile;
    }
    
    return new SecretsManagerClient(clientConfig);
}

/**
 * Fetches a secret value from AWS Secrets Manager
 * @param client - SecretsManagerClient instance
 * @param secretName - Name of the secret to fetch
 * @returns Parsed secret data
 * @throws Error if secret not found or has no value
 */
export async function getSecretValue(client: SecretsManagerClient, secretName: string): Promise<any> {
    try {
        const command = new GetSecretValueCommand({
            SecretId: secretName,
        });
        
        const response = await client.send(command);
        
        if (response.SecretString) {
            return JSON.parse(response.SecretString);
        } else if (response.SecretBinary) {
            const buff = Buffer.from(response.SecretBinary);
            return JSON.parse(buff.toString('utf-8'));
        }
        
        throw new Error('Secret has no value');
    } catch (error: any) {
        if (error.name === 'ResourceNotFoundException') {
            throw new Error(`Secret '${secretName}' not found in AWS Secrets Manager`);
        }
        throw error;
    }
}