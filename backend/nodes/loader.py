from llama_index.core import SimpleDirectoryReader, Document
from llama_index.readers.google import GoogleDriveReader, GoogleSheetsReader
from llama_index.readers.web import SimpleWebPageReader
from llama_index.readers.notion import NotionPageReader
from llama_index.readers.reddit import RedditReader
from llama_index.readers.twitter import TwitterTweetReader
from llama_index.readers.wikipedia import WikipediaReader
from llama_index.readers.file import PDFReader
from llama_index.readers.json import JSONReader


def load_text_files(directory_path):
    """Load text files from a directory."""
    reader = SimpleDirectoryReader(directory_path)
    documents = reader.load_data()
    return documents


def load_pdf_file(pdf_path):
    """Load content from a PDF file."""
    reader = PDFReader()
    with open(pdf_path, "rb") as f:
        documents = reader.load_data(f)
    return documents


def load_json_file(json_path):
    """Load data from a JSON file."""
    reader = JSONReader()
    with open(json_path, "r") as f:
        documents = reader.load_data(f)
    return documents


def load_google_drive_files(drive_id, folder_id, file_ids):
    """Load files from a Google Drive folder."""
    reader = GoogleDriveReader()
    documents = reader.load_data(
        drive_id=drive_id, folder_id=folder_id, file_ids=file_ids
    )
    return documents


def load_wikipedia_page(page_title):
    """Load content from a Wikipedia page."""
    reader = WikipediaReader()
    documents = reader.load_data(pages=[page_title])
    return documents


def load_web_page(url):
    """Load content from a web page."""
    reader = SimpleWebPageReader()
    documents = reader.load_data(urls=[url])
    return documents


def load_reddit_posts(subreddit, search_keys, post_limit=10):
    """Load posts from a Reddit subreddit."""
    reader = RedditReader()
    documents = reader.load_data(
        subreddits=[subreddit], search_keys=search_keys, post_limit=post_limit
    )
    return documents


def load_google_sheet(sheet_id, range_name):
    """Load data from a Google Sheet."""
    reader = GoogleSheetsReader()
    documents = reader.load_data(spreadsheet_ids=[spreadsheet_id], ranges=[range_name])
    return documents


def load_twitter_feed(username, limit=10):
    """Load tweets from a Twitter user's timeline."""
    reader = TwitterTweetReader(bearer_token="YOUR_TWITTER_BEARER_TOKEN")
    documents = reader.load_data(usernames=[username], limit=limit)
    return documents
