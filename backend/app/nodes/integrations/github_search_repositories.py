import logging
from pydantic import BaseModel, Field  # type: ignore
from ..base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from phi.tools.github import GithubTools


class GitHubSearchRepositoriesNodeConfig(BaseNodeConfig):
    query: str = Field(
        ..., description="The search query keywords (e.g. 'machine learning')."
    )
    sort: str = Field(
        "stars",
        description="The field to sort results by. Can be 'stars', 'forks', or 'updated'.",
    )
    order: str = Field(
        "desc", description="The order of results. Can be 'asc' or 'desc'."
    )
    per_page: int = Field(5, description="Number of results per page.")


class GitHubSearchRepositoriesNodeInput(BaseNodeInput):
    pass


class GitHubSearchRepositoriesNodeOutput(BaseNodeOutput):
    repositories: str = Field(
        ..., description="A JSON string of repositories matching the search query."
    )


class GitHubSearchRepositoriesNode(BaseNode):
    name = "github_search_repositories_node"
    display_name = "GitHubSearchRepositories"
    logo = "/images/github.png"

    config_model = GitHubSearchRepositoriesNodeConfig
    input_model = GitHubSearchRepositoriesNodeInput
    output_model = GitHubSearchRepositoriesNodeOutput

    async def run(self, input: BaseModel) -> BaseModel:
        try:
            gh = GithubTools()
            repos = gh.search_repositories(
                query=self.config.query,
                sort=self.config.sort,
                order=self.config.order,
                per_page=self.config.per_page,
            )
            return GitHubSearchRepositoriesNodeOutput(repositories=repos)
        except Exception as e:
            logging.error(f"Failed to search repositories: {e}")
            return GitHubSearchRepositoriesNodeOutput(repositories="")
