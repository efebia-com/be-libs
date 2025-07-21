/**
 * AWS utilities for the environment CLI tool
 */

import { 
    SecretsManagerClient, 
    GetSecretValueCommand,
    CreateSecretCommand,
    UpdateSecretCommand,
    Tag
} from '@aws-sdk/client-secrets-manager';

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

/**
 * Creates or updates a secret in AWS Secrets Manager
 * @param client - SecretsManagerClient instance
 * @param secretName - Name of the secret to create/update
 * @param secretData - The data to store in the secret
 * @param tags - Optional tags to apply to the secret
 * @throws Error if creation/update fails
 */
export async function createOrUpdateSecret(
    client: SecretsManagerClient, 
    secretName: string, 
    secretData: any,
    tags?: Tag[]
): Promise<void> {
    const secretString = JSON.stringify(secretData, null, 2);
    
    try {
        // Try to create the secret first
        const createCommand = new CreateSecretCommand({
            Name: secretName,
            SecretString: secretString,
            Tags: tags
        });
        
        await client.send(createCommand);
    } catch (error: any) {
        if (error.name === 'ResourceExistsException') {
            // Secret already exists, update it instead
            const updateCommand = new UpdateSecretCommand({
                SecretId: secretName,
                SecretString: secretString
            });
            
            await client.send(updateCommand);
        } else {
            throw error;
        }
    }
}