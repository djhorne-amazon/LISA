#   Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
#   Licensed under the Apache License, Version 2.0 (the "License").
#   You may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.

"""Functional validators for use with Pydantic."""

import botocore.session

sess = botocore.session.Session()


def validate_instance_type(type: str) -> str:
    """Validate that the type is a valid EC2 instance type."""
    if type in sess.get_service_model("ec2").shape_for("InstanceType").enum:
        return type

    raise ValueError("Invalid EC2 instance type.")