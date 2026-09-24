# StreakArena docs

Start with the [README](../README.md) to run it. These are the documents you need once
you're changing something.

| Document | What it answers |
| --- | --- |
| [architecture.md](architecture.md) | How the pieces fit, and the two decisions everything else rests on |
| [platforms.md](platforms.md) | The nine sites that can prove a task, what counts as a day, and what was rejected |
| [ui-spec.md](ui-spec.md) | The build spec the current interface was made from |
| [../infra/README.md](../infra/README.md) | Terraform for ECS, RDS, S3 and CloudFront, and the deploy pipeline |
| [../CLAUDE.md](../CLAUDE.md) | Working notes — the things you'd otherwise learn by breaking them |

## Images

| File | What it is |
| --- | --- |
| [images/reference.png](images/reference.png) | The four-screen mockup the UI was built from: dashboard, groups, leaderboard, group detail |
| [images/summit-source.png](images/summit-source.png) | The hero artwork, full resolution (1881×836) |

`summit-source.png` is the **source**, not what ships. The app serves two WebP crops built
from it — `frontend/src/assets/summit.webp` (a wide letterbox for the hero) and
`summit-crop.webp` (tight on the figure, for cards too narrow to show it otherwise). Together
they are 97 KB against the source's 2 MB. The source is kept so those crops can be
regenerated at other sizes.
