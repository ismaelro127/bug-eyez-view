"""One-command Personal catalog maintenance: refresh source, then validate it."""
import argparse
from fetch_playlists import refresh
from verify_personal_channels import main as verify

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Force validation of every URL")
    parser.add_argument("--skip-source-refresh", action="store_true", help="Validate the existing local catalog only")
    parser.add_argument("--no-frontend-sync", action="store_true")
    args = parser.parse_args()

    if not args.skip_source_refresh:
        refresh()
    verify(force=args.force, sync_frontend=not args.no_frontend_sync)
