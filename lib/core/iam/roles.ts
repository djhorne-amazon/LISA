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

/**
 * List of all roles used for overrides
 */
export enum Roles {
    ASG_ROLE = 'ASGRole',
    DOCKER_IMAGE_BUILDER_DEPLOYMENT_ROLE = 'DockerImageBuilderDeploymentRole',
    DOCKER_IMAGE_BUILDER_EC2_ROLE = 'DockerImageBuilderEC2Role',
    DOCKER_IMAGE_BUILDER_ROLE = 'DockerImageBuilderRole',
    DOCS_ROLE = 'DocsRole',
    DOCS_DEPLOYER_ROLE = 'DocsDeployerRole',
    ECS_MODEL_DEPLOYER_ROLE = 'ECSModelDeployerRole',
    ECS_MODEL_TASK_ROLE = 'ECSModelTaskRole',
    ECS_MODEL_EXECUTION_ROLE = 'ECSModelExecutionRole',
    ECS_REST_API_ROLE = 'ECSRestApiRole',
    ECS_REST_API_EX_ROLE = 'ECSRestApiExRole',
    LAMBDA_EXECUTION_ROLE = 'LambdaExecutionRole',
    MODEL_API_ROLE = 'ModelApiRole',
    MODEL_SFN_EC2_ROLE = 'ModelSfnEC2Role',
    MODEL_SFN_LAMBDA_ROLE = 'ModelsSfnLambdaRole',
    MODEL_SFN_ROLE = 'ModelSfnRole',
    RAG_ROLE = 'RAGRole',
    RAG_LAMBDA_EXECUTION_ROLE = 'RagLambdaExecutionRole',
    RAG_API_LAMBDA_EXECUTION_ROLE = 'LISARagAPILambdaExecutionRole',
    REST_API_AUTHORIZER_ROLE = 'RestApiAuthorizerRole',
    S3_READER_ROLE = 'S3ReaderRole',
    UI_DEPLOYMENT_ROLE = 'UIDeploymentRole',
}

export function of (key: string): Roles {
    const keys = Object.keys(Roles).filter((x) => x === key);
    if (keys.length > 0)
        return Roles[keys[0] as keyof typeof Roles] as Roles;
    else {
        throw Error(`No Roles entry exists for ${key}`);
    }
}
