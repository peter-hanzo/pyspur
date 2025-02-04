import logging
from pydantic import BaseModel, Field  # type: ignore
from ...base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from phi.tools.github import GithubTools
from typing import Dict


class GitHubListRepositoriesNodeConfig(BaseNodeConfig):
    output_schema: Dict[str, str] = Field(
        default={"repositories": "string"},
        description="The schema for the output of the node",
    )
    has_fixed_output: bool = True


class GitHubListRepositoriesNodeInput(BaseNodeInput):
    pass


class GitHubListRepositoriesNodeOutput(BaseNodeOutput):
    repositories: str = Field(
        ..., description="A JSON string of the repositories for the user."
    )


class GitHubListRepositoriesNode(BaseNode):
    name = "github_list_repositories_node"
    display_name = "GitHubListRepositories"
    logo = "/images/github.png"
    category = "GitHub"

    config_model = GitHubListRepositoriesNodeConfig
    input_model = GitHubListRepositoriesNodeInput
    output_model = GitHubListRepositoriesNodeOutput

    async def run(self, input: BaseModel) -> BaseModel:
        try:
            gh = GithubTools()
            repositories = gh.list_repositories()
            return GitHubListRepositoriesNodeOutput(repositories=repositories)
        except Exception as e:
            logging.error(f"Failed to list repositories: {e}")
            return GitHubListRepositoriesNodeOutput(repositories="")
