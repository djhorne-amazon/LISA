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

import {
    Choice,
    Condition,
    DefinitionBody,
    Fail,
    StateMachine,
    Succeed,
    Wait,
} from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { BaseProps } from '../../schema';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { Code, Function, ILayerVersion } from 'aws-cdk-lib/aws-lambda';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { LAMBDA_MEMORY, LAMBDA_TIMEOUT, OUTPUT_PATH, POLLING_TIMEOUT } from './constants';
import { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { IStringParameter } from 'aws-cdk-lib/aws-ssm';

type CreateModelStateMachineProps = BaseProps & {
    modelTable: ITable,
    lambdaLayers: ILayerVersion[];
    dockerImageBuilderFnArn: string;
    ecsModelDeployerFnArn: string;
    ecsModelImageRepository: Repository;
    role?: IRole,
    vpc?: IVpc,
    securityGroups?: ISecurityGroup[];
    restApiContainerEndpointPs: IStringParameter;
    managementKeyName: string
};

/**
 * State Machine for creating models.
 */
export class CreateModelStateMachine extends Construct {
    readonly stateMachineArn: string;

    constructor (scope: Construct, id: string, props: CreateModelStateMachineProps) {
        super(scope, id);

        const {config, modelTable, lambdaLayers, dockerImageBuilderFnArn, ecsModelDeployerFnArn, ecsModelImageRepository, role, vpc, securityGroups, restApiContainerEndpointPs, managementKeyName} = props;

        const environment = {
            DOCKER_IMAGE_BUILDER_FN_ARN: dockerImageBuilderFnArn,
            ECR_REPOSITORY_ARN: ecsModelImageRepository.repositoryArn,
            ECR_REPOSITORY_NAME: ecsModelImageRepository.repositoryName,
            ECS_MODEL_DEPLOYER_FN_ARN: ecsModelDeployerFnArn,
            LISA_API_URL_PS_NAME: restApiContainerEndpointPs.parameterName,
            MODEL_TABLE_NAME: modelTable.tableName,
            REST_API_VERSION: config.restApiConfig.apiVersion,
            MANAGEMENT_KEY_NAME: managementKeyName,
            RESTAPI_SSL_CERT_ARN: config.restApiConfig.loadBalancerConfig.sslCertIamArn ?? '',
        };

        const setModelToCreating = new LambdaInvoke(this, 'SetModelToCreating', {
            lambdaFunction: new Function(this, 'SetModelToCreatingFunc', {
                runtime: config.lambdaConfig.pythonRuntime,
                handler: 'models.state_machine.create_model.handle_set_model_to_creating',
                code: Code.fromAsset(config.lambdaSourcePath),
                timeout: LAMBDA_TIMEOUT,
                memorySize: LAMBDA_MEMORY,
                role: role,
                vpc: vpc,
                securityGroups: securityGroups,
                layers: lambdaLayers,
                environment: environment,
            }),
            outputPath: OUTPUT_PATH,
        });

        const createModelInfraChoice = new Choice(this, 'CreateModelInfraChoice');

        const startCopyDockerImage = new LambdaInvoke(this, 'StartCopyDockerImage', {
            lambdaFunction: new Function(this, 'StartCopyDockerImageFunc', {
                runtime: config.lambdaConfig.pythonRuntime,
                handler: 'models.state_machine.create_model.handle_start_copy_docker_image',
                code: Code.fromAsset(config.lambdaSourcePath),
                timeout: LAMBDA_TIMEOUT,
                memorySize: LAMBDA_MEMORY,
                role: role,
                vpc: vpc,
                securityGroups: securityGroups,
                layers: lambdaLayers,
                environment: environment,
            }),
            outputPath: OUTPUT_PATH,
        });

        const pollDockerImageAvailable = new LambdaInvoke(this, 'PollDockerImageAvailable', {
            lambdaFunction: new Function(this, 'PollDockerImageAvailableFunc', {
                runtime: config.lambdaConfig.pythonRuntime,
                handler: 'models.state_machine.create_model.handle_poll_docker_image_available',
                code: Code.fromAsset(config.lambdaSourcePath),
                timeout: LAMBDA_TIMEOUT,
                memorySize: LAMBDA_MEMORY,
                role: role,
                vpc: vpc,
                securityGroups: securityGroups,
                layers: lambdaLayers,
                environment: environment,
            }),
            outputPath: OUTPUT_PATH,
        });

        const handleFailureState = new LambdaInvoke(this, 'HandleFailure', {
            lambdaFunction: new Function(this, 'HandleFailureFunc', {
                runtime: config.lambdaConfig.pythonRuntime,
                handler: 'models.state_machine.create_model.handle_failure',
                code: Code.fromAsset(config.lambdaSourcePath),
                timeout: LAMBDA_TIMEOUT,
                memorySize: LAMBDA_MEMORY,
                role: role,
                vpc: vpc,
                securityGroups: securityGroups,
                layers: lambdaLayers,
                environment: environment,
            }),
            outputPath: OUTPUT_PATH,
        });

        const pollDockerImageChoice = new Choice(this, 'PollDockerImageChoice');

        const waitBeforePollingDockerImage = new Wait(this, 'WaitBeforePollingDockerImage', {
            time: POLLING_TIMEOUT,
        });

        const startCreateStack = new LambdaInvoke(this, 'StartCreateStack', {
            lambdaFunction: new Function(this, 'StartCreateStackFunc', {
                runtime: config.lambdaConfig.pythonRuntime,
                handler: 'models.state_machine.create_model.handle_start_create_stack',
                code: Code.fromAsset(config.lambdaSourcePath),
                timeout: Duration.minutes(8),
                memorySize: LAMBDA_MEMORY,
                role: role,
                vpc: vpc,
                securityGroups: securityGroups,
                layers: lambdaLayers,
                environment: environment,
            }),
            outputPath: OUTPUT_PATH,
        });

        const pollCreateStack = new LambdaInvoke(this, 'PollCreateStack', {
            lambdaFunction: new Function(this, 'PollCreateStackFunc', {
                runtime: config.lambdaConfig.pythonRuntime,
                handler: 'models.state_machine.create_model.handle_poll_create_stack',
                code: Code.fromAsset(config.lambdaSourcePath),
                timeout: LAMBDA_TIMEOUT,
                memorySize: LAMBDA_MEMORY,
                role: role,
                vpc: vpc,
                securityGroups: securityGroups,
                layers: lambdaLayers,
                environment: environment,
            }),
            outputPath: OUTPUT_PATH,
        });

        const pollCreateStackChoice = new Choice(this, 'PollCreateStackChoice');

        const waitBeforePollingCreateStack = new Wait(this, 'WaitBeforePollingCreateStack', {
            time: POLLING_TIMEOUT,
        });

        const addModelToLitellm = new LambdaInvoke(this, 'AddModelToLitellm', {
            lambdaFunction: new Function(this, 'AddModelToLitellmFunc', {
                runtime: config.lambdaConfig.pythonRuntime,
                handler: 'models.state_machine.create_model.handle_add_model_to_litellm',
                code: Code.fromAsset(config.lambdaSourcePath),
                timeout: LAMBDA_TIMEOUT,
                memorySize: LAMBDA_MEMORY,
                role: role,
                vpc: vpc,
                securityGroups: securityGroups,
                layers: lambdaLayers,
                environment: environment,
            }),
            outputPath: OUTPUT_PATH,
        });

        const successState = new Succeed(this, 'CreateSuccess');
        const failState = new Fail(this, 'CreateFailed');

        // State Machine definition
        setModelToCreating.next(createModelInfraChoice);
        createModelInfraChoice
            .when(Condition.booleanEquals('$.create_infra', true), startCopyDockerImage)
            .otherwise(addModelToLitellm);

        // poll ECR image copy status loop
        startCopyDockerImage.next(pollDockerImageAvailable);
        pollDockerImageAvailable.next(pollDockerImageChoice);
        pollDockerImageAvailable.addCatch(handleFailureState, {  // fail if exception thrown from code
            errors: ['MaxPollsExceededException'],
        });
        pollDockerImageChoice
            .when(Condition.booleanEquals('$.continue_polling_docker', true), waitBeforePollingDockerImage)
            .otherwise(startCreateStack);
        waitBeforePollingDockerImage.next(pollDockerImageAvailable);

        // poll CloudFormation stack status loop
        startCreateStack.next(pollCreateStack);
        startCreateStack.addCatch(handleFailureState, {  // fail if CDK failed to create model stack
            errors: ['StackFailedToCreateException']
        });
        pollCreateStack.next(pollCreateStackChoice);
        pollCreateStack.addCatch(handleFailureState, {  // fail if model failed or failed to create in time
            errors: [
                'MaxPollsExceededException',
                'UnexpectedCloudFormationStateException',
            ],
        });
        pollCreateStackChoice
            .when(Condition.booleanEquals('$.continue_polling_stack', true), waitBeforePollingCreateStack)
            .otherwise(addModelToLitellm);
        waitBeforePollingCreateStack.next(pollCreateStack);

        // terminal states
        handleFailureState.next(failState);
        addModelToLitellm.next(successState);

        const stateMachine = new StateMachine(this, 'CreateModelSM', {
            definitionBody: DefinitionBody.fromChainable(setModelToCreating),
        });

        this.stateMachineArn = stateMachine.stateMachineArn;
    }
}