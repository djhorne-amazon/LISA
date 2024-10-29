/**
 * List of all roles used for overrides
 */
export enum Roles {
    // API_AUTHORIZER = 'ApiAuthorizerRole',
    ASG_ROLE = 'ASGRole',
    // CHAT_LAMBDA_EXECUTION_ROLE = 'ChatLambdaExecutionRole',
    // CUSTOM_CDK_BUCKET_DEPLOYMENT = 'CustomCDKBucketDeployment',
    // CUSTOM_VPC_RESTRICT_DEFAULT_SG = 'CustomVpcRestrictDefaultSG',
    DOCKER_IMAGE_BUILDER_DEPLOYMENT_ROLE = 'DockerImageBuilderDeploymentRole',
    DOCKER_IMAGE_BUILDER_EC2_ROLE = 'DockerImageBuilderEC2Role',
    DOCKER_IMAGE_BUILDER_ROLE = 'DockerImageBuilderRole',
    ECS_MODEL_DEPLOYER_ROLE = 'ECSModelDeployerRole',
    ECS_MODEL_TASK_ROLE = 'ECSModelTaskRole',
    ECS_MODEL_EXECUTION_ROLE = 'ECSModelExecutionRole',
    ECS_REST_API_ROLE = 'ECSRestApiRole',
    ECS_REST_API_EX_ROLE = 'ECSRestApiExRole',
    // ECS_TASK_EXECUTION_ROLE = 'ECSTaskExecutionRole',
    // ECS_TASK_ROLE = 'ECSTaskRole',
    LAMBDA_EXECUTION_ROLE = 'LambdaExecutionRole',
    MODEL_API_ROLE = 'ModelApiRole',
    // MODEL_API_LAMBDA_EXECUTION_ROLE = 'ModelApiLambdaExecutionRole',
    MODEL_SFN_EC2_ROLE = 'ModelSfnEC2Role',
    MODEL_SFN_LAMBDA_ROLE = 'ModelsSfnLambdaRole',
    MODEL_SFN_ROLE = 'ModelSfnRole',
    // MODELS_API_CREATE_MODEL_WORKFLOW_ROLE = 'ModelsApiCreateModelWorkflowRole',
    // MODELS_API_DELETE_MODEL_WORKFLOW_ROLE = 'ModelsApiDeleteModelWorkflowRole',
    // MODELS_API_ECS_MODEL_DEPLOYER_ROLE = 'ModelsApiECSModelDeployerRole',
    // MODELS_API_MODELS_SFN_LAMBDA_ROLE = 'ModelsApiModelSfnLambdaRole',
    // MODELS_API_UPDATE_MODEL_WORKFLOW_ROLE = 'ModelsApiUpdateModelWorkflowRole',
    RAG_ROLE = 'RAGRole',
    RAG_LAMBDA_EXECUTION_ROLE = 'RagLambdaExecutionRole',
    RAG_API_LAMBDA_EXECUTION_ROLE = 'LISARagAPILambdaExecutionRole',
    REST_API_AUTHORIZER_ROLE = 'RestApiAuthorizerRole',
    // REST_API_ROLE = 'RestApiRole',
    // REST_API_ECS_CLUSTER_CL_ASG_DRA = 'RestApiECSClusterClASGDra',
    // REST_API_ECS_CLUSTER_CL_ASG_INS = 'RestApiECSClusterClASGIns',
    // REST_API_ECS_CLUSTER_CL_ASG_LIF = 'RestApiECSClusterClASGLif',
    // REST_API_ECS_CLUSTER_REST_EC2_T = 'RestApiECSClusterRESTEc2T',
    // REST_ROLE = 'RestRole',
    S3_READER_ROLE = 'S3ReaderRole',
    UI_DEPLOYMENT_ROLE = 'UIDeploymentRole',
    // SESSION_API_LAMBDA_EXECUTION_ROLE = 'SessionApiLambdaExecutionRole',
    // STEP_FUNCTION_ROLE = 'S3ReaderRole',
};

export namespace Roles {
    export function of(key: string): Roles {
        let keys = Object.keys(Roles).filter(x => x == key);
        if (keys.length > 0)
            return Roles[keys[0] as keyof typeof Roles] as Roles;
        else {
            throw Error(`No Roles entry exists for ${key}`);
        }
    }
}
