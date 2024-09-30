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

"""APIGW endpoints for managing models."""
import os
from typing import Annotated

import boto3
from fastapi import FastAPI, Path, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum
from utilities.common_functions import retry_config
from utilities.fastapi_middleware.aws_api_gateway_middleware import AWSAPIGatewayMiddleware

from .domain_objects import (
    CreateModelRequest,
    CreateModelResponse,
    DeleteModelResponse,
    GetModelResponse,
    ListModelsResponse,
    UpdateModelRequest,
    UpdateModelResponse,
)
from .exception import ModelAlreadyExistsError, ModelNotFoundError
from .handler import CreateModelHandler, DeleteModelHandler, GetModelHandler, ListModelsHandler, UpdateModelHandler

app = FastAPI(redirect_slashes=False, lifespan="off", docs_url="/docs", openapi_url="/openapi.json")
app.add_middleware(AWSAPIGatewayMiddleware)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

stepfunctions = boto3.client("stepfunctions", region_name=os.environ["AWS_REGION"], config=retry_config)
dynamodb = boto3.resource("dynamodb", region_name=os.environ["AWS_REGION"], config=retry_config)
model_table = dynamodb.Table(os.environ["MODEL_TABLE_NAME"])
iam_client = boto3.client("iam", region_name=os.environ["AWS_REGION"], config=retry_config)


@app.exception_handler(ModelNotFoundError)  # type: ignore
async def model_not_found_handler(request: Request, exc: ModelNotFoundError) -> JSONResponse:
    """Handle exception when model cannot be found and translate to a 404 error."""
    return JSONResponse(status_code=404, content={"message": str(exc)})


@app.exception_handler(ModelAlreadyExistsError)  # type: ignore
async def model_already_exists_handler(request: Request, exc: ModelAlreadyExistsError) -> JSONResponse:
    """Handle exception when model is found and translate to a 400 error."""
    return JSONResponse(status_code=400, content={"message": str(exc)})


@app.post(path="", include_in_schema=False)  # type: ignore
@app.post(path="/")  # type: ignore
async def create_model(create_request: CreateModelRequest) -> CreateModelResponse:
    """Endpoint to create a model."""
    create_handler = CreateModelHandler(
        stepfunctions_client=stepfunctions,
        model_table_resource=model_table,
    )
    return create_handler(create_request=create_request)


@app.get(path="", include_in_schema=False)  # type: ignore
@app.get(path="/")  # type: ignore
async def list_models() -> ListModelsResponse:
    """Endpoint to list models."""
    list_handler = ListModelsHandler(
        stepfunctions_client=stepfunctions,
        model_table_resource=model_table,
    )
    return list_handler()


@app.get(path="/{model_id}")  # type: ignore
async def get_model(
    model_id: Annotated[str, Path(title="The unique model ID of the model to get")], request: Request
) -> GetModelResponse:
    """Endpoint to describe a model."""
    get_handler = GetModelHandler(
        stepfunctions_client=stepfunctions,
        model_table_resource=model_table,
    )
    return get_handler(model_id=model_id)


@app.put(path="/{model_id}")  # type: ignore
async def update_model(
    model_id: Annotated[str, Path(title="The unique model ID of the model to update")],
    update_request: UpdateModelRequest,
) -> UpdateModelResponse:
    """Endpoint to update a model."""
    update_handler = UpdateModelHandler(
        stepfunctions_client=stepfunctions,
        model_table_resource=model_table,
    )
    return update_handler(model_id=model_id, update_request=update_request)


@app.delete(path="/{model_id}")  # type: ignore
async def delete_model(
    model_id: Annotated[str, Path(title="The unique model ID of the model to delete")], request: Request
) -> DeleteModelResponse:
    """Endpoint to delete a model."""
    delete_handler = DeleteModelHandler(
        stepfunctions_client=stepfunctions,
        model_table_resource=model_table,
    )
    return delete_handler(model_id=model_id)


handler = Mangum(app, lifespan="off", api_gateway_base_path="/models")
docs = Mangum(app, lifespan="off")