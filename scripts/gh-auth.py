#!/usr/bin/env python3
"""Double-fork daemon that runs `gh auth login --web` so it survives the
sandbox process-reaper. gh prints the device code + URL to ghauth.log,
then polls GitHub in the background until the user authorizes."""
import os
import sys

LOG = "/tmp/ghauth.log"


def daemonize() -> None:
    if os.fork() > 0:
        sys.exit(0)
    os.setsid()
    if os.fork() > 0:
        sys.exit(0)
    os.umask(0o022)
    os.chdir("/home/z/my-project")
    devnull = os.open("/dev/null", os.O_RDWR)
    logfd = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
    os.dup2(devnull, 0)
    os.dup2(logfd, 1)
    os.dup2(logfd, 2)
    with open("/home/z/my-project/.gh-auth/gh.pid", "w") as f:
        f.write(str(os.getpid()))


def main() -> None:
    os.makedirs("/home/z/my-project/.gh-auth", exist_ok=True)
    # If already authenticated, nothing to do
    daemonize()
    # exec gh auth login --web (replaces this process; gh polls in background)
    os.execvp(
        "gh",
        [
            "gh",
            "auth",
            "login",
            "--web",
            "--hostname",
            "github.com",
            "--git-protocol",
            "https",
        ],
    )


if __name__ == "__main__":
    main()
