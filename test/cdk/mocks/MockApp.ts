import * as cdk from 'aws-cdk-lib';
import { LisaNetworkingStack } from '../../../lib/networking/index';
import { LisaApiBaseStack } from '../../../lib/core/api_base';
import { LisaChatApplicationStack } from '../../../lib/chat/index';
import { ARCHITECTURE, CoreStack } from '../../../lib/core/index';
import { LisaApiDeploymentStack } from '../../../lib/core/api_deployment';
import { LisaServeIAMStack } from '../../../lib/iam_stack';
import { LisaServeApplicationStack } from '../../../lib/serve/index';
import { UserInterfaceStack } from '../../../lib/user-interface/index';
import ConfigParser from './ConfigParser';
import { Config } from '../../../lib/schema';

export default class MockApp {

    static create (config?: Config) {
        const app = new cdk.App();
        config = config || ConfigParser.parseConfig();
        const baseStackProps = {
            env: {
                account: '012345678901',
                region: config.region,
            },
            config,
        };

        const networkingStack = new LisaNetworkingStack(app, `LisaNetworking`, {
            ...baseStackProps,
            stackName: 'LisaNetworking'
        });
        const apiBaseStack = new LisaApiBaseStack(app, 'LisaApiBase', {
            ...baseStackProps,
            stackName: 'LisaApiBase',
            vpc: networkingStack.vpc,
        });
        const chatStack = new LisaChatApplicationStack(app, 'LisaChat', {
            ...baseStackProps,
            authorizer: apiBaseStack.authorizer,
            stackName: 'LisaChat',
            restApiId: apiBaseStack.restApiId,
            rootResourceId: apiBaseStack.rootResourceId,
            vpc: networkingStack.vpc,
        });
        const coreStack = new CoreStack(app, 'LisaCore', {
            ...baseStackProps,
            stackName: 'LisaCore',
            vpc: networkingStack.vpc,
        });
        const apiDeploymentStack = new LisaApiDeploymentStack(app, 'LisaApiDeployment', {
            ...baseStackProps,
            stackName: 'LisaApiDeployment',
            restApiId: apiBaseStack.restApiId,
        });
        const iamStack = new LisaServeIAMStack(app, 'LisaIAM', {
            ...baseStackProps,
            stackName: 'LisaIAM',
            config: config,
        });
        const serveStack = new LisaServeApplicationStack(app, 'LisaServe', {
            ...baseStackProps,
            stackName: 'LisaServe',
            vpc: networkingStack.vpc,
        });
        const uiStack = new UserInterfaceStack(app, 'LisaUI', {
            ...baseStackProps,
            architecture: ARCHITECTURE,
            stackName: 'LisaUI',
            restApiId: apiBaseStack.restApiId,
            rootResourceId: apiBaseStack.rootResourceId,
        });

        const stacks = [
            networkingStack,
            iamStack,
            apiBaseStack,
            apiDeploymentStack,
            chatStack,
            coreStack,
            serveStack,
            uiStack
        ];

        return { app, stacks };
    }
}
