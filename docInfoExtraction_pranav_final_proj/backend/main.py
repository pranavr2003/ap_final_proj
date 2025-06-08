import os
from base64 import b64encode
from typing import Literal, Optional, TypedDict, Union

import instructor
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from groq import Groq
from mistralai import Mistral, OCRResponse
from pydantic import Base64Str, BaseModel, create_model
from pymongo import MongoClient

from routers.users import user_router

app = FastAPI(
    title="DocInfoExtraction",
    description="This is the backend for a Document info extraction pipeline.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)


load_dotenv()

# MongoDB Client
mongo_client = MongoClient("mongodb://localhost:27017")
db = mongo_client["docinfoextraction"]
collection = db["projects"]

# LLM Clients
mistral_client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])
groq_client = instructor.from_groq(Groq(api_key=os.environ["GROQ_API_KEY"]))

# Data Types/Models
DocType = Literal["pdf", "jpg", "jpeg", "png"]


class ProjectField(BaseModel):
    name: str
    description: str
    data_type: str


class ProjectID(TypedDict):
    project_id: str


class ProjectFields(BaseModel):
    name: Optional[str] = None
    fields: list[ProjectField]


# Helper Functions
def ocr(doc_str: Base64Str, doc_type: str) -> OCRResponse:
    if doc_type == "pdf":
        document_type = "document_url"
        mime = "application/pdf"
    elif doc_type in ["jpg", "png"]:
        document_type = "image_url"
        mime = f"image/{doc_type}"
    else:
        raise NotImplementedError(f"{doc_type} is not a supported document type.")
    return mistral_client.ocr.process(
        model="mistral-ocr-latest",
        document={
            "type": document_type,
            document_type: f"data:{mime};base64,{doc_str}",
        },
    )


def get_project_from_mongo(project_id: str) -> dict:
    res = collection.find_one({"_id": ObjectId(project_id)})
    if res is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project ID not found",
        )
    return res


def type_str_to_type(type_str: str):
    match type_str:
        case "str":
            return Union[str, None]
        case "int":
            return Union[int, None]
        case "float":
            return Union[float, None]
        case "bool":
            return Union[bool, None]
        case _:
            raise NotImplementedError(f"Invalid data type {type_str}")


# Endpoints
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(NotImplementedError)
async def not_implemented_exception_handler(request: Request, exc: NotImplementedError):
    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={"detail": exc.args[0]},
    )


@app.post("/markdown")
async def markdown(file: UploadFile) -> str:
    """Converts the document into markdown."""
    # The type of document
    doc_type = file.filename.split(".")[-1] if file.filename else ""
    # Base64 string of the document
    doc_bytes = file.file.read()
    doc_str = b64encode(doc_bytes).decode()
    return "\n".join(map(lambda x: x.markdown, ocr(doc_str, doc_type).pages))


@app.post("/extract")
def extract(file: UploadFile, project_id: str):
    """Extracts the required info from the document."""
    # The type of document
    doc_type = file.filename.split(".")[-1] if file.filename else ""
    # Base64 string of the document
    doc_str = b64encode(file.file.read()).decode()
    markdown = "\n".join(map(lambda x: x.markdown, ocr(doc_str, doc_type).pages))
    res = get_project_from_mongo(project_id)
    print(res)
    modelClass = create_model(
        "DynamicModel",
        **{
            field["name"]: (type_str_to_type(field["data_type"]), ...)
            for field in res["fields"]
        },
    )
    print(modelClass.model_json_schema())
    description = ", ".join(
        f"{field['name']} ({field['description']})" for field in res["fields"]
    )
    print(description)
    resp = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "Extract the following fields in JSON format (Leave empty "
                "for null values) based on the Markdown data given by the user: "
                + description,
            },
            {"role": "user", "content": markdown},
        ],
        response_model=modelClass,
    )
    return resp


@app.get("/projectID")
def get_project(project_id: str) -> ProjectFields:
    """Gets the info of the given project."""
    res = get_project_from_mongo(project_id)
    res.pop("_id")
    return ProjectFields.model_validate(res)


@app.post("/projectID")
def add_project(fields: ProjectFields) -> ProjectID:
    """Adds a project to the database and returns the ID of the newly created project."""
    res = collection.insert_one(fields.model_dump())
    return {"project_id": str(res.inserted_id)}


@app.delete("/projectID/{project_id}")
def delete_project(project_id: str):
    """Delete a project by its ID."""
    res = collection.find_one_and_delete({"_id": ObjectId(project_id)})
    if res is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project ID not found",
        )
    return {"message": "Project deleted successfully"}
