import datetime
import json  # Import the json module
import os
from typing import List

import arxiv
import fitz  # PyMuPDF
import requests
from llama_index.core import Document, SimpleDirectoryReader
from llama_index.readers.file import PDFReader
from llama_index.readers.github import GithubClient, GithubRepositoryReader
from llama_index.readers.google import GoogleDriveReader, GoogleSheetsReader
from llama_index.readers.json import JSONReader
from llama_index.readers.reddit import RedditReader
from llama_index.readers.twitter import TwitterTweetReader
from llama_index.readers.web import SimpleWebPageReader
from llama_index.readers.wikipedia import WikipediaReader
from llama_parse import LlamaParse
from tqdm import tqdm  # For progress bar


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


def load_google_sheet(sheet_id: str) -> List[Document]:
    """Load data from a Google Sheet."""
    reader = GoogleSheetsReader()
    documents = reader.load_data(spreadsheet_ids=[sheet_id])
    return documents


def load_twitter_feed(username: str, num_tweets: int = 10) -> List[Document]:
    """Load tweets from a Twitter user's timeline."""
    reader = TwitterTweetReader(bearer_token="YOUR_TWITTER_BEARER_TOKEN")
    documents = reader.load_data(twitterhandles=[username], num_tweets=num_tweets)
    return documents


def load_github_repo(
    owner: str, repo: str, branch: str = "main", commit_sha: str = ""
) -> List[Document]:
    """Load data from a GitHub repository."""
    client = GithubClient(github_token="")
    reader = GithubRepositoryReader(github_client=client, owner=owner, repo=repo)

    if commit_sha:
        documents = reader.load_data(commit_sha=commit_sha)
    elif branch:
        documents = reader.load_data(branch=branch)
    else:
        documents = reader.load_data(branch="main")

    return documents


def parse_pdf(pdf_path, max_pages=10, use_llama_parse=False):
    """
    Parses the PDF file and extracts text.

    Args:
        pdf_path (str): Path to the PDF file.
        max_pages (int): Maximum number of pages to parse.
        use_llama_parse (bool): Whether to use LlamaParse for parsing.

    Returns:
        str: Extracted text from the PDF.
    """
    if use_llama_parse:
        parser = LlamaParse(
            api_key=os.getenv("LLAMA_CLOUD_API_KEY"),
            result_type="markdown",
            num_workers=4,
            verbose=True,
            language="en",
            target_pages=",".join(map(str, range(max_pages))),
        )
        full_text = parser.load_data(pdf_path)
    else:
        # Use fitz (PyMuPDF) to extract text
        with fitz.open(pdf_path) as doc:
            full_text = ""
            for page_num in range(min(max_pages, len(doc))):
                page = doc.load_page(page_num)
                full_text += page.get_text()
    return full_text


def load_arxiv_papers(
    categories, max_results=100, max_pages=10, days_back=5, use_llama_parse=False
):
    """
    Fetches new or recently updated papers from arXiv in the given categories.

    Args:
        categories (list): List of arXiv categories to search.
        max_results (int): Maximum number of results to return.
        max_pages (int): Maximum number of pages to parse from each PDF.
        days_back (int): Number of days back to look for new or updated papers.
        use_llama_parse (bool): Whether to use LlamaParse for parsing PDFs.

    Returns:
        list: A list of dictionaries containing paper details.
    """
    # Calculate the date range
    today = datetime.date.today()
    past_date = today - datetime.timedelta(days=days_back)

    # Build the search query
    query = " OR ".join([f"cat:{cat}" for cat in categories])
    search = arxiv.Search(
        query=query,
        max_results=max_results,
        sort_by=arxiv.SortCriterion.SubmittedDate,
    )

    new_papers = []
    temp_dir = "temp_papers"
    os.makedirs(temp_dir, exist_ok=True)

    # Check for cached results
    cached_papers = []
    cached_ids = set()
    if os.path.exists(temp_dir):
        for filename in os.listdir(temp_dir):
            if filename.endswith(".json"):
                with open(os.path.join(temp_dir, filename), "r") as cache_file:
                    paper = json.load(cache_file)
                    cached_papers.append(paper)
                    cached_ids.add(paper["id"])

    for result in tqdm(search.results(), desc="Fetching papers"):
        if result.get_short_id() in cached_ids:
            continue  # Skip already cached papers

        updated_date = result.updated.date()
        if updated_date >= past_date:
            pdf_filename = f"{result.get_short_id()}.pdf"
            pdf_path = os.path.join(temp_dir, pdf_filename)

            try:
                # Download the PDF if not already downloaded
                if not os.path.exists(pdf_path):
                    pdf_url = result.pdf_url
                    response = requests.get(pdf_url)
                    with open(pdf_path, "wb") as f:
                        f.write(response.content)

                # Use the parse_pdf function to extract text
                full_text = parse_pdf(
                    pdf_path, max_pages=max_pages, use_llama_parse=use_llama_parse
                )

                paper_details = {
                    "id": result.get_short_id(),
                    "title": result.title,
                    "abstract": result.summary,
                    "full_text": full_text,
                    "authors": [author.name for author in result.authors],
                    "url": result.entry_id,
                }

                new_papers.append(paper_details)

                # Cache the paper details locally
                cache_filename = f"{result.get_short_id()}.json"
                cache_path = os.path.join(temp_dir, cache_filename)
                with open(cache_path, "w") as cache_file:
                    json.dump(paper_details, cache_file, indent=4)
            except Exception as e:
                print(f"Error processing paper {result.title}: {e}")

    return cached_papers + new_papers
