import logging
from typing import Optional
from pydantic import BaseModel, Field  # type: ignore
from ..base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from phi.tools.github import GithubTools


class GitHubCreateIssueNodeConfig(BaseNodeConfig):
    repo_name: str = Field(
        "", description="The full name of the repository (e.g. 'owner/repo')."
    )
    title_: str = Field("", description="The title of the issue.")
    body: Optional[str] = Field(None, description="The body content of the issue.")


class GitHubCreateIssueNodeInput(BaseNodeInput):
    pass


class GitHubCreateIssueNodeOutput(BaseNodeOutput):
    issue: str = Field(..., description="The created issue details in JSON format.")


class GitHubCreateIssueNode(BaseNode):
    name = "github_create_issue_node"
    display_name = "GitHubCreateIssue"
    logo = "/images/github.png"

    config_model = GitHubCreateIssueNodeConfig
    input_model = GitHubCreateIssueNodeInput
    output_model = GitHubCreateIssueNodeOutput

    async def run(self, input: BaseModel) -> BaseModel:
        try:
            gh = GithubTools()
            issue_info = gh.create_issue(
                repo_name=self.config.repo_name,
                title=self.config.title_,
                body=self.config.body,
            )
            return GitHubCreateIssueNodeOutput(issue=issue_info)
        except Exception as e:
            logging.error(f"Failed to create issue: {e}")
            return GitHubCreateIssueNodeOutput(issue="")
