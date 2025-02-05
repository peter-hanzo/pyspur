import logging
from pydantic import BaseModel, Field  # type: ignore
from ...base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from phi.tools.github import GithubTools
from typing import Dict


class GitHubGetPullRequestNodeConfig(BaseNodeConfig):
    repo_name: str = Field(
        "", description="The full name of the repository (e.g. 'owner/repo')."
    )
    pr_number: str = Field("", description="The pull request number.")
    output_schema: Dict[str, str] = Field(
        default={"pull_request": "string"},
        description="The schema for the output of the node",
    )
    has_fixed_output: bool = True


class GitHubGetPullRequestNodeInput(BaseNodeInput):
    pass


class GitHubGetPullRequestNodeOutput(BaseNodeOutput):
    pull_request: str = Field(
        ..., description="Details of the requested pull request in JSON format."
    )


class GitHubGetPullRequestNode(BaseNode):
    name = "github_get_pull_request_node"
    display_name = "GitHubGetPullRequest"
    logo = "/images/github.png"
    category = "GitHub"

    config_model = GitHubGetPullRequestNodeConfig
    input_model = GitHubGetPullRequestNodeInput
    output_model = GitHubGetPullRequestNodeOutput

    async def run(self, input: BaseModel) -> BaseModel:
        try:
            gh = GithubTools()
            pr_details = gh.get_pull_request(
                repo_name=self.config.repo_name, pr_number=int(self.config.pr_number)
            )
            return GitHubGetPullRequestNodeOutput(pull_request=pr_details)
        except Exception as e:
            logging.error(f"Failed to get pull request details: {e}")
            return GitHubGetPullRequestNodeOutput(pull_request="")
