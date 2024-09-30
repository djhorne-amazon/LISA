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

import { Duration } from 'aws-cdk-lib';
import { WaitTime } from 'aws-cdk-lib/aws-stepfunctions';

export const LAMBDA_MEMORY: number = 128;
export const LAMBDA_TIMEOUT: Duration = Duration.seconds(60);
export const OUTPUT_PATH: string = '$.Payload';
export const POLLING_TIMEOUT: WaitTime = WaitTime.duration(Duration.seconds(60));