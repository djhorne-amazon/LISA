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

import { Template } from 'aws-cdk-lib/assertions';
import MockApp from '../mocks/MockApp'; // Import your actual stack
import ConfigParser from '../mocks/ConfigParser';

const stackRolesOverrides: Record<string, number> = {
    'LisaApiBase': 1,
    'LisaServe': 3,
    'LisaUI': 1,
    'LisaDocs': 2,
};

const stackRoles: Record<string, number> = {
    'LisaApiBase': 2,
    'LisaServe': 3,
    'LisaUI': 3,
    'LisaNetworking': 0,
    'LisaChat': 1,
    'LisaCore': 0,
    'LisaApiDeployment': 0,
    'LisaIAM': 4,
    'LisaDocs': 4,
};

describe('Verify role overrides', () => {
    describe('Number of IAM Roles created with overrides', () => {
        const config = ConfigParser.parseConfig(['config.yaml', 'roles.yaml']);

        const { stacks } = MockApp.create(config);

        for (const stack of stacks) {
            const expectedRoles = stackRolesOverrides[stack.stackName] || 0;

            it(`${stack} should contain ${expectedRoles} roles`, () => {
                const template = Template.fromStack(stack);
                template.resourceCountIs('AWS::IAM::Role', expectedRoles);
            });
        }

    });
});

describe('Verify created roles', () => {
    describe('Number of IAM Roles created', () => {
        const { stacks } = MockApp.create();

        for (const stack of stacks) {
            const expectedRoles = stackRoles[stack.stackName] || 0;

            it(`${stack} should contain ${expectedRoles} roles`, () => {
                const template = Template.fromStack(stack);
                template.resourceCountIs('AWS::IAM::Role', expectedRoles);
            });
        }

    });
});
