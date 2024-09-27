from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import requests

# Create an instance of the scheduler
scheduler = BackgroundScheduler()


def trigger_api(endpoint_url):
    try:
        response = requests.get(endpoint_url)
        print(f"Triggered {endpoint_url}, Status Code: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"Error triggering {endpoint_url}: {e}")


# Schedule the job to run every day at a certain time
endpoint = "https://your-api-endpoint.com/trigger"

scheduler.add_job(
    trigger_api,
    trigger=CronTrigger(hour=12, minute=0),  # Runs every day at 12:00 PM
    args=[endpoint],
    id="daily_job",
    replace_existing=True,
)

# Start the scheduler
scheduler.start()
