# Infrastructure

Terraform for an AWS deployment, and a GitHub Actions pipeline that ships to it.

**Nothing here has been applied.** It was written and validated (`terraform validate`
passes) but never run against an AWS account — there were no credentials in the
environment it was written in. Treat the first `apply` as the real test.

## The shape of it

```
                    ┌──────────── CloudFront ────────────┐
   browser ────────►│  /*      → S3 (the React bundle)   │
                    │  /api/*  → ALB → ECS Fargate       │
                    └────────────────────┬───────────────┘
                                         │
                              RDS Postgres (private subnets)
                              S3 uploads bucket (attachments)
```

**One distribution, two origins, and that is the whole point.** The auth cookie is
httpOnly and first-party. Putting the API on its own hostname would make every request
cross-origin and force `SameSite=None` plus a CORS layer — the same trap that
`COOKIE_SECURE` documents locally. Behind one domain the browser can't tell the two
origins apart, and the cookie behaves exactly as it does in Docker.

Attachments move to S3 because a Fargate task's filesystem is ephemeral: the local
volume that works under Docker Compose would lose every file on each deploy. The API
still streams the bytes itself after checking group membership, so the bucket stays
private and nothing is served straight from it. `backend/src/uploads.js` picks the
backend from `UPLOADS_BUCKET` — set it and you get S3, leave it and you get disk.

## What it costs

Roughly, in ap-south-1, with nothing switched off:

| Resource | Monthly |
| --- | --- |
| ALB | ~$18 |
| RDS db.t4g.micro + 20 GB | ~$15 |
| Fargate 0.25 vCPU / 0.5 GB, 1 task | ~$9 |
| CloudFront, S3, ECR, logs | ~$2 at low traffic |
| **Total** | **~$44** |

There is deliberately **no NAT gateway**. Tasks run in public subnets with public IPs
and are reachable only through their security group. A NAT is the textbook answer for
giving tasks outbound internet, and it would add ~$32/month — most of the bill again,
for a stack this size. The tasks need outbound access to reach GitHub, LeetCode and
the other platform APIs; the security group is what keeps inbound closed.

The cheapest real saving after that is the ALB: a single task with a public IP and
CloudFront pointing straight at it would remove ~$18, at the cost of losing health
checks and rolling deploys.

## First run

Terraform keeps state in S3, so that bucket has to exist before the first `init`:

```bash
aws s3 mb s3://streakarena-tfstate-<account-id> --region ap-south-1
aws s3api put-bucket-versioning --bucket streakarena-tfstate-<account-id> \
  --versioning-configuration Status=Enabled
```

GitHub's OIDC provider is looked up, not created, because an account usually has one
already. If `terraform plan` says it can't find it:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com
```

Then:

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # edit it
terraform init -backend-config="bucket=streakarena-tfstate-<account-id>" \
               -backend-config="key=prod/terraform.tfstate" \
               -backend-config="region=ap-south-1"
terraform apply
```

The first apply takes ~15 minutes, most of it CloudFront and RDS.

## Wiring the pipeline

`terraform output deploy_role_arn`, then add it to the repository as the Actions
secret **`AWS_DEPLOY_ROLE`**, and set the repository *variable*
**`DEPLOY_ENABLED=true`** to arm the deploy job. Until that variable is set the job is
skipped rather than failing, so pushing this pipeline doesn't redden every commit
before the infrastructure exists. That is the only secret the repository needs: the role
trusts this repo's `master` branch through OIDC, so there are no long-lived AWS keys
anywhere.

A push to `master` then:

1. typechecks and builds the bundle (the build runs `tsc` first),
2. builds the API image and pushes it to ECR tagged with the commit sha,
3. registers a task definition pointing at that image,
4. runs `prisma migrate deploy` as a one-off task and **stops if it fails**,
5. rolls the ECS service and waits for it to stabilise,
6. syncs the bundle to S3 — fingerprinted assets first and immutable, `index.html`
   last and uncached, so a half-finished sync can't serve an index that points at
   assets which aren't up yet,
7. invalidates `/index.html` at the edge.

Rolling back is deploying an earlier image tag; every build is tagged with its commit.

## Before this is actually production

- **`GITHUB_TOKEN` is empty by default.** Without it GitHub sync uses the public
  events API: ~90 days and 60 requests an hour *per IP, shared by every user*. With
  one Fargate task that is one IP for everybody. Set it in `terraform.tfvars`.
- **No custom domain** unless you set `domain_name` and `acm_certificate_arn` (the
  certificate must be in us-east-1). Without them you get the CloudFront domain.
- **CloudFront → ALB is plain HTTP.** It's inside AWS and the ALB only accepts
  CloudFront's own ranges, but a certificate on the ALB would close that gap.
- **One task, one AZ's worth of database.** `desired_count = 2` and RDS Multi-AZ are
  each one variable away, and each roughly doubles that line of the bill.
- **Orphaned attachments still accumulate** — rows cascade, objects don't. The
  lifecycle rule only cleans up aborted multipart uploads.
