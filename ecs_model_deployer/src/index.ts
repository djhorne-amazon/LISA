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

import { spawnSync, spawn, ChildProcess } from 'child_process';
import { readdirSync, symlinkSync, rmSync } from 'fs';

/*
  cdk CLI always wants ./ to be writable in order to write cdk.context.json.
  This should really be an environment variable or something, but this function
  should give us a writable ./ without wasting tons of compute time to copy
*/
const createWritableEnv = () => {
    rmSync('/tmp/cdk.out', {recursive: true, force: true});
    const files = readdirSync('.');
    for ( const f of files ) {
        /*
          We want this file to be empty or absent so that any info needed is
          pulled from the account instead of the cache
        */
        if ( f === 'cdk.context.json' ) {
            continue;
        }
        const source = `/tmp/${f}`;
        const target = `${process.env['PWD']}/${f}`;

        try {
            symlinkSync(target, source, 'file');
        } catch ( err ) {
            if ( err instanceof Error && err.message.match(/EEXIST/) ) {
                // Writable env already established from previous call.
            } else {
                throw err;
            }
        }
    }

    process.chdir('/tmp/');
};

export const handler = async (event: any) => {
    console.log(`Event payload: ${JSON.stringify(event)}`);
    if (!event.modelConfig) {
        console.log(`modelConfig not provided in ${JSON.stringify(event)}`);
        throw new Error('modelConfig not provided');
    }
    const modelConfig = event.modelConfig;
    process.env['LISA_MODEL_CONFIG'] = JSON.stringify(modelConfig);

    if (!process.env['LISA_CONFIG']) {
        console.log('LISA_CONFIG environment variable not set');
        throw new Error('LISA_CONFIG environment variable not set');
    }
    const config = JSON.parse(process.env['LISA_CONFIG']!);

    createWritableEnv();

    const ret = spawnSync('./node_modules/aws-cdk/bin/cdk', ['synth', '-o', '/tmp/cdk.out']);

    const stderr = String(ret.output[2]);
    if ( ret.status !== 0 ) {
        console.log(`cdk synth failed with stderr: ${stderr}`);
        throw new Error('Stack failed to synthesize');
    }


    const stackName = `${config.deploymentName}-${modelConfig.modelId}`;
    const deploy_promise: Promise<ChildProcess | undefined> = new Promise( (resolve) => {
        const cp = spawn('./node_modules/aws-cdk/bin/cdk', ['deploy', stackName, '-o', '/tmp/cdk.out']);

        cp.on('close', (code) => {
            console.log(`cdk deploy exited early, code ${code}`);
            resolve(cp);
        });

        cp.stdout.on('data', (data) => {
            console.log(`Got data: ${data}`);
        });

        cp.stderr.on('data', (data) => {
            console.log(`Got err data: ${data}`);
        });

        setTimeout(() => {
            console.log('180 second timeout');
            resolve(undefined);
        }, 180 * 1000);
    });

    const cp = await deploy_promise;
    if ( cp ) {
        if ( cp.exitCode !== 0 ) {
            throw new Error('Stack failed to deploy');
        }
    }

    return {stackName: stackName};
};
