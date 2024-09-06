/**
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License").
  You may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import { Stack, StackProps } from 'aws-cdk-lib';
import { Cors, EndpointType, Authorizer, RestApi, StageOptions } from 'aws-cdk-lib/aws-apigateway';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

import { CustomAuthorizer } from '../api-base/authorizer';
import { BaseProps } from '../schema';
import { AttributeType, BillingMode, ITable, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';

type LisaApiBaseStackProps = {
    vpc: IVpc;
} & BaseProps &
  StackProps;

export class LisaApiBaseStack extends Stack {
    public readonly restApi: RestApi;
    public readonly authorizer: Authorizer;
    public readonly restApiId: string;
    public readonly rootResourceId: string;
    public readonly restApiUrl: string;
    public readonly tokenTable: ITable | undefined;

    constructor (scope: Construct, id: string, props: LisaApiBaseStackProps) {
        super(scope, id, props);

        const { config, vpc } = props;

        // Create DynamoDB Table for enabling API token usage
        this.tokenTable = new Table(this, 'TokenTable', {
            tableName: `${config.deploymentName}-LISAApiTokensTable`,
            partitionKey: {
                name: 'token',
                type: AttributeType.STRING,
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            encryption: TableEncryption.AWS_MANAGED,
            removalPolicy: config.removalPolicy,
        });


        const deployOptions: StageOptions = {
            stageName: config.deploymentStage,
            throttlingRateLimit: 100,
            throttlingBurstLimit: 100,
        };

        const restApi = new RestApi(this, `${id}-RestApi`, {
            description: 'Base API Gateway for LISA.',
            endpointConfiguration: { types: [EndpointType.REGIONAL] },
            deploy: true,
            deployOptions,
            defaultCorsPreflightOptions: {
                allowOrigins: Cors.ALL_ORIGINS,
                allowHeaders: [...Cors.DEFAULT_HEADERS],
            },
            // Support binary media types used for documentation images and fonts
            binaryMediaTypes: ['font/*', 'image/*'],
        });

        // Create the authorizer Lambda for APIGW
        const authorizer = new CustomAuthorizer(this, 'LisaApiAuthorizer', {
            config: config,
            tokenTable: this.tokenTable,
            vpc,
        });

        this.restApi = restApi;
        this.restApiId = restApi.restApiId;
        this.rootResourceId = restApi.restApiRootResourceId;
        this.authorizer = authorizer.authorizer;
        this.restApiUrl = restApi.url;
    }
}
