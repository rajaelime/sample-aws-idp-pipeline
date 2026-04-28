import json

import boto3
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import get_config

router = APIRouter(prefix="/projects/{project_id}/compare", tags=["compare"])

_lambda_client = None


def _get_lambda_client():
    global _lambda_client
    if _lambda_client is None:
        config = get_config()
        _lambda_client = boto3.client("lambda", region_name=config.aws_region)
    return _lambda_client


def _invoke_compare_lambda(payload: dict) -> dict:
    config = get_config()
    if not config.compare_mcp_function_arn:
        raise HTTPException(status_code=503, detail="Compare function not configured")

    client = _get_lambda_client()
    response = client.invoke(
        FunctionName=config.compare_mcp_function_arn,
        InvocationType="RequestResponse",
        Payload=json.dumps(payload),
    )

    result = json.loads(response["Payload"].read())

    if "errorMessage" in result:
        raise HTTPException(status_code=400, detail=result["errorMessage"])

    return result


class SetReferenceRequest(BaseModel):
    document_id: str


class SetReferenceResponse(BaseModel):
    message: str
    reference_document_id: str


class CompareRequest(BaseModel):
    target_document_id: str
    reference_document_id: str | None = None
    fields: list[str] | None = None


class ChecklistItem(BaseModel):
    field: str
    description: str = ""
    severity: str = "medium"


class SetChecklistRequest(BaseModel):
    items: list[ChecklistItem]


class SetChecklistResponse(BaseModel):
    message: str
    items: list[ChecklistItem]


class GetChecklistResponse(BaseModel):
    project_id: str
    items: list[ChecklistItem]


class ChecklistResult(BaseModel):
    field: str
    description: str
    expected_severity: str
    status: str
    reference_value: str
    target_value: str
    explanation: str


class FieldMismatch(BaseModel):
    field: str
    reference_value: str
    target_value: str
    severity: str
    status: str = "fail"
    explanation: str


class CompareResponse(BaseModel):
    reference_document_id: str
    target_document_id: str
    reference_name: str
    target_name: str
    total_mismatches: int
    checklist_results: list[ChecklistResult] | None = None
    mismatches: list[FieldMismatch]
    summary: str


@router.post("/reference")
def set_reference(project_id: str, request: SetReferenceRequest) -> SetReferenceResponse:
    """Set a document as the reference (baseline) for comparison."""
    result = _invoke_compare_lambda({
        "project_id": project_id,
        "document_id": request.document_id,
        "action": "set_reference",
    })
    return SetReferenceResponse(**result)


@router.post("/checklist")
def set_checklist(project_id: str, request: SetChecklistRequest) -> SetChecklistResponse:
    """Set the inspection checklist for document comparison."""
    result = _invoke_compare_lambda({
        "project_id": project_id,
        "items": [item.model_dump() for item in request.items],
        "action": "set_checklist",
    })
    return SetChecklistResponse(**result)


@router.get("/checklist")
def get_checklist(project_id: str) -> GetChecklistResponse:
    """Get the current inspection checklist for a project."""
    result = _invoke_compare_lambda({
        "project_id": project_id,
        "action": "get_checklist",
    })
    return GetChecklistResponse(**result)


@router.post("")
def compare_documents(project_id: str, request: CompareRequest) -> CompareResponse:
    """Compare a target document against the reference document."""
    payload: dict = {
        "project_id": project_id,
        "target_document_id": request.target_document_id,
        "action": "compare",
    }
    if request.reference_document_id:
        payload["reference_document_id"] = request.reference_document_id
    if request.fields:
        payload["fields"] = request.fields

    result = _invoke_compare_lambda(payload)
    return CompareResponse(**result)
