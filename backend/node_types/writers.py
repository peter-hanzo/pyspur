from typing import Any, List, Optional
import os
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow

# Define the scopes required for the Google APIs
SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/spreadsheets",
]


def google_authenticate(
    token_path: str = "token.json", credentials_path: str = "credentials.json"
) -> Credentials:
    """Authenticate and return Google API credentials."""
    creds: Optional[Credentials] = None
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    # If credentials are invalid or don't exist, prompt login.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for future use
        with open(token_path, "w") as token_file:
            token_file.write(creds.to_json())
    return creds


def write_to_google_docs(
    text: str, document_id: Optional[str] = None, creds: Optional[Credentials] = None
) -> str:
    """Write the provided text to a Google Docs file."""
    if creds is None:
        creds = google_authenticate()
    docs_service = build("docs", "v1", credentials=creds)

    if document_id:
        # Append text to an existing document
        requests = [
            {
                "insertText": {
                    "location": {
                        "index": 1,
                    },
                    "text": text,
                }
            }
        ]
        docs_service.documents().batchUpdate(
            documentId=document_id, body={"requests": requests}
        ).execute()
    else:
        # Create a new document and write text
        doc = {"title": "New Document"}
        created_doc = docs_service.documents().create(body=doc).execute()
        document_id = created_doc.get("documentId")
        requests = [
            {
                "insertText": {
                    "location": {
                        "index": 1,
                    },
                    "text": text,
                }
            }
        ]
        docs_service.documents().batchUpdate(
            documentId=document_id, body={"requests": requests}
        ).execute()
    return document_id


def write_to_google_sheets(
    data: List[List[Any]],
    spreadsheet_id: Optional[str] = None,
    range_name: str = "Sheet1!A1",
    creds: Optional[Credentials] = None,
) -> str:
    """Write the provided data to a Google Sheets file."""
    if creds is None:
        creds = google_authenticate()
    sheets_service = build("sheets", "v4", credentials=creds)
    if spreadsheet_id:
        # Update existing spreadsheet
        body = {"values": data}
        sheets_service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=range_name,
            valueInputOption="RAW",
            body=body,
        ).execute()
    else:
        # Create a new spreadsheet and write data
        spreadsheet = {"properties": {"title": "New Spreadsheet"}}
        spreadsheet = (
            sheets_service.spreadsheets()
            .create(body=spreadsheet, fields="spreadsheetId")
            .execute()
        )
        spreadsheet_id = spreadsheet.get("spreadsheetId")
        body = {"values": data}
        sheets_service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=range_name,
            valueInputOption="RAW",
            body=body,
        ).execute()
    return spreadsheet_id


def update_google_sheets(
    data: List[List[Any]],
    spreadsheet_id: str,
    range_name: str,
    creds: Optional[Credentials] = None,
) -> None:
    """Update an existing Google Sheets file with provided data."""
    if creds is None:
        creds = google_authenticate()
    sheets_service = build("sheets", "v4", credentials=creds)
    body = {"values": data}
    sheets_service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range=range_name,
        valueInputOption="RAW",
        body=body,
    ).execute()
