import { Template } from 'aws-cdk-lib/assertions';
import MockApp from '../mocks/MockApp'; // Import your actual stack
import ConfigParser from '../mocks/ConfigParser';
import { CfnIPAMScope } from 'aws-cdk-lib/aws-ec2';

const stackRolesOverrides: Record<string, number> = {
    "LisaApiBase": 1,
    "LisaServe": 3,
    "LisaUI": 1
}

const stackRoles: Record<string, number> = {
    "LisaApiBase": 2,
    "LisaServe": 3,
    "LisaUI": 3,
    "LisaNetworking": 0,
    "LisaChat": 1,
    "LisaCore": 0,
    "LisaApiDeployment": 0,
    "LisaIAM": 4,
    "LisaDocs": 0,
}

describe('Verify role overrides', () => {
    describe('Number of IAM Roles created with overrides', () => {
        const config = ConfigParser.parseConfig(['config.yaml', 'roles.yaml']);

        let { stacks } = MockApp.create(config);

        for (const stack of stacks) {
            const expectedRoles = stackRolesOverrides[stack.stackName] || 0;

            it(`${stack} should contain ${expectedRoles} roles`, ()=>{
                const template = Template.fromStack(stack);
                template.resourceCountIs('AWS::IAM::Role', expectedRoles);
            })
        }

    });
});

describe('Verify created roles', () => {
    describe('Number of IAM Roles created', () => {
        let { stacks } = MockApp.create();

        for (const stack of stacks) {
            const expectedRoles = stackRoles[stack.stackName] || 0;

            it(`${stack} should contain ${expectedRoles} roles`, ()=>{
                const template = Template.fromStack(stack);
                template.resourceCountIs('AWS::IAM::Role', expectedRoles);
            })
        }

    });
});
