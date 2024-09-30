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


import { BaseProps } from '../../schema';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { Code, Function, ILayerVersion } from 'aws-cdk-lib/aws-lambda';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { ISecurityGroup, IVpc } from 'aws-cdk-lib/aws-ec2';
import { IStringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { LAMBDA_MEMORY, LAMBDA_TIMEOUT, OUTPUT_PATH, POLLING_TIMEOUT } from './constants';
import { Choice, Condition, DefinitionBody, StateMachine, Succeed, Wait } from 'aws-cdk-lib/aws-stepfunctions';


type UpdateModelStateMachineProps = BaseProps & {
    modelTable: ITable,
    lambdaLayers: ILayerVersion[],
    role?: IRole,
    vpc?: IVpc,
    securityGroups?: ISecurityGroup[];
    restApiContainerEndpointPs: IStringParameter;
    managementKeyName: string;
};


/**
 * State Machine for updating models.
 */
export class UpdateModelStateMachine extends Construct {
    readonly stateMachineArn: string;

    constructor (scope: Construct, id: string, props: UpdateModelStateMachineProps) {
        super(scope, id);

        const {
            config,
            modelTable,
            lambdaLayers,
            role,
            vpc,
            securityGroups,
            restApiContainerEndpointPs,
            managementKeyName
        } = props;

        const environment = {  // Environment variables to set in all Lambda functions
            MODEL_TABLE_NAME: modelTable.tableName,
            LISA_API_URL_PS_NAME: restApiContainerEndpointPs.parameterName,
            REST_API_VERSION: config.restApiConfig.apiVersion,
            MANAGEMENT_KEY_NAME: managementKeyName,
            RESTAPI_SSL_CERT_ARN: config.restApiConfig.loadBalancerConfig.sslCertIamArn ?? '',
        };

        const handleJobIntake = new LambdaInvoke(this, 'HandleJobIntake', {
            lambdaFunction: new Function(this, 'HandleJobIntakeFunc', {
                runtime: config.lambdaConfig.pythonRuntime,
                handler: 'models.state_machine.update_model.handle_job_intake',
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

        const handlePollCapacity = new LambdaInvoke(this, 'HandlePollCapacity', {
            lambdaFunction: new Function(this, 'HandlePollCapacityFunc', {
                runtime: config.lambdaConfig.pythonRuntime,
                handler: 'models.state_machine.update_model.handle_poll_capacity',
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

        const handleFinishUpdate = new LambdaInvoke(this, 'HandleFinishUpdate', {
            lambdaFunction: new Function(this, 'HandleFinishUpdateFunc', {
                runtime: config.lambdaConfig.pythonRuntime,
                handler: 'models.state_machine.update_model.handle_finish_update',
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

        // terminal states
        const successState = new Succeed(this, 'UpdateSuccess');

        // choice states
        const hasCapacityUpdateChoice = new Choice(this, 'HasCapacityUpdateChoice');
        const pollAsgChoice = new Choice(this, 'PollAsgChoice');

        // wait states
        const waitBeforePollAsg = new Wait(this, 'WaitBeforePollAsg', {
            time: POLLING_TIMEOUT
        });

        // State Machine definition
        handleJobIntake.next(hasCapacityUpdateChoice);
        hasCapacityUpdateChoice
            .when(Condition.booleanEquals('$.has_capacity_update', true), handlePollCapacity)
            .otherwise(handleFinishUpdate);

        handlePollCapacity.next(pollAsgChoice);
        pollAsgChoice.when(Condition.booleanEquals('$.should_continue_capacity_polling', true), waitBeforePollAsg)
            .otherwise(handleFinishUpdate);
        waitBeforePollAsg.next(handlePollCapacity);

        handleFinishUpdate.next(successState);

        const stateMachine = new StateMachine(this, 'UpdateModelSM', {
            definitionBody: DefinitionBody.fromChainable(handleJobIntake),
        });

        this.stateMachineArn = stateMachine.stateMachineArn;

    }
}