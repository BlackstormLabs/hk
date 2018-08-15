# Frontend Branching Strategy

Because we share our engine code across all our game projects, it's necessary to have a system for different versions of the shared code to coexist in the shared repo (this one).

## Summary

The scheme is as follows:
  * Core Tech will tag releases (ie, `1.2.0`).
  * Core Tech will maintain release branches (ie, `1.0`, `1.1`, `2.3`, etc.) which represent threads of active development. ie `1.0` might be receiving maintenance patches while `2.0` is under active development.
  * Game teams will maintain a game branch which is the frontend state for their game. For instance, `1.0-everwing` would be a branch off of `1.0` which is managed by the EverWing team and contains their version of the shared codebase. Games may also choose (and are encouraged) to directly use a release branch.

## Rationale

There are two actors in this system - Core Tech and Game Team. Core Tech has ownership over the main development branches, and is responsible for reviewing/merging/testing PRs, tagging releases, and starting new release branches when appropriate. Anyone may submit PRs against these branches but they will be merged by CT as is appropriate for their purposes. Release branches allow CT to easily maintain new, current and legacy versions of tech. The `1.0`, `2.0`, `3.0` naming convention makes it obvious to everyone which branch is for what version of the tech.

Game Teams, however, require a fast path to fix bugs, add features, etc. Releases or hot fixes cannot be held up waiting for someone on CT to approve a fix. Therefore, they can make and are responsible for their own branches off of CT release branches. The naming convention of `releasebranch-gamename`, ie `1.0-everwing`, makes it obvious what version of the tech a game is running on, and what game team is responsible for the branch.

Naturally, teams can coordinate - for instance, CT and a game team might both work in a game branch to integrate a hot fix or feature. However, teams should not mess with other teams' branches without getting permission from them.

Because all work is in a shared repo, it becomes easy for CT or other game teams to review all game branches for important fixes or features to include in a new release. Work can be copied, cherry picked, or merged. Additionally game teams can try other versions of shared tech by simply checking out a new branch in their `frontend/` folder.

## Disclaimer

This is not meant to be the ultimate approach to the problem of sharing engine code. It is just a path that is expedient today. It could be replaced with a much better system down the line.
