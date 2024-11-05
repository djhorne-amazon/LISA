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

import { Construct } from 'constructs';
import { DockerImageCode, DockerImageFunction, IFunction } from 'aws-cdk-lib/aws-lambda';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Stack, Duration, Size } from 'aws-cdk-lib';

import { createCdkId } from '../core/utils';
import { BaseProps, Config } from '../schema';
import { Vpc } from '../networking/vpc';
import { Roles } from '../core/iam/roles';

export type ECSModelDeployerProps = {
    securityGroupId: string;
    config: Config;
    vpc: Vpc;
} & BaseProps;

export class ECSModelDeployer extends Construct {
    readonly ecsModelDeployerFn: IFunction;

    constructor (scope: Construct, id: string, props: ECSModelDeployerProps) {
        super(scope, id);
        const stackName = Stack.of(scope).stackName;
        const { config } = props;

        const stripped_config = {
            'appName': props.config.appName,
            'deploymentName': props.config.deploymentName,
            'region': props.config.region,
            'deploymentStage': props.config.deploymentStage,
            'removalPolicy': props.config.removalPolicy,
            's3BucketModels': props.config.s3BucketModels,
            'mountS3DebUrl': props.config.mountS3DebUrl,
            'permissionsBoundaryAspect': props.config.permissionsBoundaryAspect,
            'subnetIds': props.config.subnetIds,
            'taskRole': props.config.roles?.[Roles.ECS_MODEL_TASK_ROLE],
        };

        const functionId = createCdkId([stackName, 'ecs_model_deployer']);
        this.ecsModelDeployerFn = new DockerImageFunction(this, functionId, {
            functionName: functionId,
            code: DockerImageCode.fromImageAsset('./ecs_model_deployer/'),
            timeout: Duration.minutes(10),
            ephemeralStorageSize: Size.mebibytes(2048),
            memorySize: 1024,
            environment: {
                'LISA_VPC_ID': props.vpc?.vpc.vpcId,
                'LISA_SECURITY_GROUP_ID': props.securityGroupId,
                'LISA_CONFIG': JSON.stringify(stripped_config),
            },
            vpc: props.vpc?.subnetSelection ? props.vpc?.vpc : undefined,
            vpcSubnets: props.vpc?.subnetSelection,
            ...(config.roles?.[Roles.ECS_MODEL_DEPLOYER_ROLE] &&
              {
                  role: Role.fromRoleName(this, createCdkId([stackName, 'ecs-model-deployer-role']), config.roles[Roles.ECS_MODEL_DEPLOYER_ROLE]),
              }),
        });
    }

}
