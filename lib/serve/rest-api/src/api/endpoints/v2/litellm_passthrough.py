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

"""Model invocation routes."""

import logging
import os
from collections.abc import Iterator
from typing import Union

import requests
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse

# Local LiteLLM installation URL. By default, LiteLLM runs on port 4000. Change the port here if the
# port was changed as part of the LiteLLM startup in entrypoint.sh
LITELLM_URL = "http://localhost:4000"

# With the introduction of the LiteLLM database for model configurations, it forces a requirement to have a
# LiteLLM-vended API key. Since we are not requiring LiteLLM keys for customers, we are using the LiteLLM key
# required for the db and injecting that into all requests instead to overcome that requirement.
LITELLM_KEY = os.environ["LITELLM_KEY"]

logger = logging.getLogger(__name__)

router = APIRouter()


def generate_response(iterator: Iterator[Union[str, bytes]]) -> Iterator[str]:
    """For streaming responses, generate strings instead of bytes objects so that clients recognize the LLM output."""
    for line in iterator:
        if isinstance(line, bytes):
            line = line.decode()
        if line:
            yield f"{line}\n\n"


@router.api_route(
    "/{api_path:path}", methods=["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE", "HEAD"]
)  # type: ignore
async def litellm_passthrough(request: Request, api_path: str) -> Response:
    """
    Pass requests directly to LiteLLM. LiteLLM and deployed models will respond here directly.

    This accepts all HTTP methods as to not put any restriction on how deployed models would act given different HTTP
    payload requirements. Results are only streamed if the OpenAI-compatible request specifies streaming as part of the
    input payload.
    """
    litellm_path = f"{LITELLM_URL}/{api_path}"
    headers = dict(request.headers.items())

    # At this point in the request, we have already validated auth with IdP or persistent token. By using LiteLLM for
    # model management, LiteLLM requires an admin key, and that forces all requests to require a key as well. To avoid
    # soliciting yet another form of auth from the user, we add the existing LiteLLM key to the headers that go directly
    # to the LiteLLM instance.
    headers["Authorization"] = f"Bearer {LITELLM_KEY}"

    http_method = request.method
    if http_method == "GET":
        return JSONResponse(requests.request(method=http_method, url=litellm_path, headers=headers).json())
    # not a GET request, so expect a JSON payload as part of the request
    params = await request.json()
    if params.get("stream", False):  # if a streaming request
        response = requests.request(method=http_method, url=litellm_path, json=params, headers=headers, stream=True)
        return StreamingResponse(generate_response(response.iter_lines()))
    else:  # not a streaming request
        return JSONResponse(requests.request(method=http_method, url=litellm_path, json=params, headers=headers).json())
