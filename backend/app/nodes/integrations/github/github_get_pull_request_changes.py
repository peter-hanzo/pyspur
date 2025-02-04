import logging
from pydantic import BaseModel, Field  # type: ignore
from ...base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from phi.tools.github import GithubTools
from typing import Optional, Dict


class GitHubGetPullRequestChangesNodeConfig(BaseNodeConfig):
    repo_name: str = Field(
        "", description="The full name of the repository (e.g. 'owner/repo')."
    )
    pr_number: Optional[int] = Field(None, description="The pull request number.")
    output_schema: Dict[str, str] = Field(
        default={"pull_request_changes": "string"},
        description="The schema for the output of the node",
    )
    has_fixed_output: bool = True


class GitHubGetPullRequestChangesNodeInput(BaseNodeInput):
    pass


class GitHubGetPullRequestChangesNodeOutput(BaseNodeOutput):
    pull_request_changes: str = Field(
        ..., description="The list of changed files in the pull request in JSON format."
    )


class GitHubGetPullRequestChangesNode(BaseNode):
    name = "github_get_pull_request_changes_node"
    display_name = "GitHubGetPullRequestChanges"
    logo = "/images/github.png"
    category = "GitHub"

    config_model = GitHubGetPullRequestChangesNodeConfig
    input_model = GitHubGetPullRequestChangesNodeInput
    output_model = GitHubGetPullRequestChangesNodeOutput

    async def run(self, input: BaseModel) -> BaseModel:
        try:
            gh = GithubTools()
            pr_changes = gh.get_pull_request_changes(
                repo_name=self.config.repo_name, pr_number=self.config.pr_number
            )
            return GitHubGetPullRequestChangesNodeOutput(
                pull_request_changes=pr_changes
            )
        except Exception as e:
            logging.error(f"Failed to get pull request changes: {e}")
            return GitHubGetPullRequestChangesNodeOutput(pull_request_changes="")
