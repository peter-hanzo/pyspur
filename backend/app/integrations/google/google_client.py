from pathlib import Path
from typing import Optional, List, Tuple, Union

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow  # type: ignore
from googleapiclient.discovery import build  # type: ignore
from googleapiclient.errors import HttpError  # type: ignore

# If modifying SCOPES, remember to delete your existing token file to force a re-auth.
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# Retrieve the current directory using pathlib for better path handling.
BASE_DIR = Path(__file__).resolve().parent

# Default file paths for credentials and tokens.
CREDENTIALS_FILE = BASE_DIR / "credentials.json"
TOKEN_FILE = BASE_DIR / "token.json"


class GoogleSheetsClient:
    """
    Google Sheets client that handles OAuth2 credentials and provides methods
    for reading from Google Sheets.

    Typical usage:
        client = GoogleSheetsClient()
        success, result = client.read_sheet("spreadsheet_id", "RangeA1Notation")
        if success:
            print("Sheet data:", result)
        else:
            print("Error:", result)
    """

    def __init__(
        self,
        credentials_path: Union[str, Path] = CREDENTIALS_FILE,
        token_path: Union[str, Path] = TOKEN_FILE,
        scopes: Optional[List[str]] = None,
    ) -> None:
        """
        :param credentials_path: Path to the 'credentials.json' file obtained from Google Cloud Console.
        :param token_path: Path to the file where the user's OAuth token will be stored/retrieved.
        :param scopes: A list of OAuth2 scopes required by your application.
        """
        # Convert to Path objects if given as strings.
        self.credentials_path = Path(credentials_path)
        self.token_path = Path(token_path)

        # Use provided scopes or default SCOPES if none given.
        self.scopes = scopes or SCOPES

        # Will be populated after get_credentials() is called the first time.
        self.creds: Optional[Credentials] = None

    def _load_or_request_credentials(self) -> Credentials:
        """
        Internal helper that either:
          1. Loads existing credentials from the token file, if valid.
          2. Refreshes them if they are expired but have a refresh token.
          3. Otherwise, launches the OAuth2 flow to get new credentials.

        :return: A valid Google OAuth2 Credentials object.
        """
        creds: Credentials = None # type: ignore

        # Load existing credentials from token file if it exists.
        if self.token_path.exists():
            creds = Credentials.from_authorized_user_file(str(self.token_path), self.scopes) # type: ignore

        # If there are no valid credentials, or credentials are invalid/expired, handle accordingly.
        if not creds or not creds.valid: # type: ignore
            if creds and creds.expired and creds.refresh_token: # type: ignore
                # Refresh the existing token.
                try:
                    creds.refresh(Request()) # type: ignore
                except Exception as refresh_error:
                    raise RuntimeError(f"Failed to refresh token. Error: {refresh_error}") from refresh_error
            else:
                # Run the OAuth flow to get new credentials.
                flow = InstalledAppFlow.from_client_secrets_file(str(self.credentials_path), self.scopes) # type: ignore
                creds = flow.run_local_server(port=0) # type: ignore

            # Save credentials for future use.
            self.token_path.write_text(creds.to_json()) # type: ignore

        return creds

    def get_credentials(self) -> Credentials:
        """
        Public method to ensure that valid credentials are loaded into self.creds.
        If not loaded, it will trigger the _load_or_request_credentials() method.

        :return: A valid Google OAuth2 Credentials object.
        """
        if not self.creds:
            self.creds = self._load_or_request_credentials()

        return self.creds

    def read_sheet(self, spreadsheet_id: str, range_name: str) -> Tuple[bool, str]:
        """
        Fetches data from the specified spreadsheet range.

        :param spreadsheet_id: The unique ID of the Google Spreadsheet (found in its URL).
        :param range_name: The A1 notation specifying which cells to retrieve (e.g., "Sheet1!A1:C10").
        :return: A tuple (success, data_or_error).
                 success = True if data was retrieved successfully, else False.
                 data_or_error = stringified list of values or an error message.
        """
        try:
            creds = self.get_credentials()
            service = build("sheets", "v4", credentials=creds) # type: ignore
            sheet = service.spreadsheets() # type: ignore
            result = sheet.values().get( # type: ignore
                spreadsheetId=spreadsheet_id, range=range_name
            ).execute()

            values = result.get("values", []) # type: ignore
            if not values:
                return False, "No data found."
            return True, str(values) # type: ignore

        except HttpError as http_err:
            return False, f"HTTP Error: {http_err}"
        except Exception as e:
            return False, f"An error occurred: {e}"


# Example usage (run as script):
if __name__ == "__main__":
    SAMPLE_SPREADSHEET_ID = "REPLACE_WITH_YOUR_SPREADSHEET_ID"
    SAMPLE_RANGE_NAME = "Sheet1!A1:C6"

    client = GoogleSheetsClient()
    success, data = client.read_sheet(SAMPLE_SPREADSHEET_ID, SAMPLE_RANGE_NAME)
    if success:
        print("Data from sheet:", data)
    else:
        print("Error:", data)
