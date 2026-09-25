#!/usr/bin/env python3
"""True double-fork daemon launcher for the Smart Mess dev server.
Detaches from the controlling terminal and process group so the
sandbox process-reaper doesn't kill it between shell sessions."""
import os
import sys

WORKDIR = "/home/z/my-project"
LOG = "/home/z/my-project/dev.log"
PIDFILE = "/home/z/my-project/dev.pid"


def already_running() -> int | None:
    try:
        with open(PIDFILE) as f:
            pid = int(f.read().strip())
        os.kill(pid, 0)  # signal 0 = existence check
        return pid
    except Exception:
        return None


def daemonize() -> None:
    # First fork — escape the parent shell
    if os.fork() > 0:
        sys.exit(0)
    os.setsid()  # become session leader, lose controlling tty
    # Second fork — ensure we can't reacquire a tty
    if os.fork() > 0:
        sys.exit(0)
    # Reset umask and chdir
    os.umask(0o022)
    os.chdir(WORKDIR)
    # Redirect stdio to /dev/null + log file
    devnull = os.open("/dev/null", os.O_RDWR)
    logfd = os.open(LOG, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o644)
    os.dup2(devnull, 0)
    os.dup2(logfd, 1)
    os.dup2(logfd, 2)
    # Write pidfile (after we're the daemon)
    with open(PIDFILE, "w") as f:
        f.write(str(os.getpid()))


def main() -> None:
    existing = already_running()
    if existing:
        print(f"Dev server already running (pid {existing})")
        sys.exit(0)

    daemonize()
    # We are now the daemon. exec next dev (replaces this process).
    os.execvp(
        "node",
        ["node", "node_modules/.bin/next", "dev", "-p", "3000", "--webpack"],
    )


if __name__ == "__main__":
    main()
