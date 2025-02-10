import logging
import json
from typing import Dict
from pydantic import BaseModel, Field  # type: ignore
from ...base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from phi.tools.github import GithubTools


class GitHubCreateIssueNodeInput(BaseNodeInput):
    title: str = Field(..., description="The title of the issue.")
    body: str = Field(..., description="The body of the issue.")


class GitHubCreateIssueNodeOutput(BaseNodeOutput):
    issue_url: str = Field(..., description="The URL of the created issue.")


class GitHubCreateIssueNodeConfig(BaseNodeConfig):
    repo_name: str = Field(
        "", description="The GitHub repository URL to create the issue in."
    )
    output_schema: Dict[str, str] = Field(
        default={"issue_url": "string"},
        description="The schema for the output of the node",
    )
    has_fixed_output: bool = True
    output_json_schema: str = Field(
        default=json.dumps(GitHubCreateIssueNodeOutput.model_json_schema()),
        description="The JSON schema for the output of the node",
    )


class GitHubCreateIssueNode(BaseNode):
    name = "github_create_issue_node"
    display_name = "GitHubCreateIssue"
    logo = "/images/github.png"
    category = "GitHub"

    config_model = GitHubCreateIssueNodeConfig
    input_model = GitHubCreateIssueNodeInput
    output_model = GitHubCreateIssueNodeOutput

    async def run(self, input: BaseModel) -> BaseModel:
        try:
            gh = GithubTools()
            issue_info = gh.create_issue(
                repo_name=self.config.repo_name,
                title=self.config.issue_title,
                body=self.config.body,
            )
            return GitHubCreateIssueNodeOutput(issue_url=issue_info)
        except Exception as e:
            logging.error(f"Failed to create issue: {e}")
            return GitHubCreateIssueNodeOutput(issue_url="")
