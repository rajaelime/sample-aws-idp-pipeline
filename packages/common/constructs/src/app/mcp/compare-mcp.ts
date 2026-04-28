import { Duration } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import * as path from 'path';
import { SSM_KEYS } from '../../constants/ssm-keys.js';

export class CompareMcp extends Construct {
  public readonly function: NodejsFunction;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const documentStorageBucketName = StringParameter.valueForStringParameter(
      this,
      SSM_KEYS.DOCUMENT_STORAGE_BUCKET_NAME,
    );
    const documentStorageBucket = Bucket.fromBucketName(
      this,
      'DocumentStorageBucket',
      documentStorageBucketName,
    );

    const backendTableName = StringParameter.valueForStringParameter(
      this,
      SSM_KEYS.BACKEND_TABLE_NAME,
    );
    const backendTable = Table.fromTableName(
      this,
      'BackendTable',
      backendTableName,
    );

    this.function = new NodejsFunction(this, 'Function', {
      entry: path.resolve(
        process.cwd(),
        '../../packages/lambda/compare-mcp/src/handler.ts',
      ),
      handler: 'handler',
      runtime: Runtime.NODEJS_22_X,
      architecture: Architecture.ARM_64,
      timeout: Duration.minutes(5),
      memorySize: 256,
      environment: {
        DOCUMENT_STORAGE_BUCKET: documentStorageBucketName,
        BACKEND_TABLE_NAME: backendTableName,
        COMPARE_MODEL_ID: 'global.anthropic.claude-sonnet-4-6',
      },
    });

    documentStorageBucket.grantRead(this.function);
    backendTable.grantReadWriteData(this.function);

    this.function.addToRolePolicy(
      new PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      }),
    );

    new StringParameter(this, 'FunctionArnParam', {
      parameterName: SSM_KEYS.COMPARE_MCP_FUNCTION_ARN,
      stringValue: this.function.functionArn,
      description: 'ARN of the Compare MCP Lambda function',
    });

    if (this.function.role) {
      new StringParameter(this, 'RoleArnParam', {
        parameterName: SSM_KEYS.COMPARE_MCP_ROLE_ARN,
        stringValue: this.function.role.roleArn,
        description: 'ARN of the Compare MCP Lambda role',
      });
    }
  }
}
