# Infrastructure (AWS, Terraform)

Provisions the cloud stack for the Real-Time Collaborative Code Editor:

```
                Internet
                   │
            ┌──────▼──────┐   HTTP :80
            │     ALB     │   path /socket.io/*, /health ─► backend TG
            │ (public)    │   default                    ─► frontend TG
            └──┬───────┬──┘
       ┌───────▼─┐  ┌──▼────────┐
       │ frontend│  │  backend  │  Fargate tasks (awsvpc, public subnets)
       │ (nginx) │  │ x N tasks │
       └─────────┘  └─────┬─────┘
                          │ Pub/Sub
                   ┌──────▼──────┐
                   │ ElastiCache │  Redis (private subnets)
                   │   Redis     │
                   └─────────────┘
```

| Resource | Purpose |
| --- | --- |
| VPC, subnets, IGW | Network (public for ALB/Fargate, private for Redis) |
| ECR (x2) | Container registries for backend & frontend images |
| ALB + target groups | Public entry; path-routes realtime traffic to the backend |
| ECS/Fargate | Runs backend (N tasks) and frontend services |
| ElastiCache Redis | Socket.IO adapter Pub/Sub for multi-instance sync |
| IAM OIDC role | Keyless deploy from GitHub Actions |
| CloudWatch logs | Container logs (`/ecs/rtce-*`) + Container Insights |

## Prerequisites

- Terraform >= 1.5, AWS credentials with admin (or scoped) access
- Docker images pushed to ECR (the deploy workflow does this)

## Usage

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # edit github_repo, region
terraform init
terraform plan
terraform apply
```

### First-time ordering (chicken-and-egg with images)

ECS services need images that don't exist until the first push. Two options:

1. **Apply infra first**, then wire the outputs into GitHub (below) and run the
   deploy workflow to push images — ECS tasks start succeeding once images land.
2. Temporarily set `*_desired_count = 0`, `apply`, push images, then raise counts.

### Wire outputs into GitHub Actions

After `apply`, map the Terraform outputs to repo settings
(Settings → Secrets and variables → Actions):

| Terraform output | GitHub | Name |
| --- | --- | --- |
| `github_deploy_role_arn` | Secret | `AWS_DEPLOY_ROLE_ARN` |
| `aws_region` (your value) | Variable | `AWS_REGION` |
| `ecr_backend_repository_url` | Variable | `ECR_BACKEND_REPO` |
| `ecr_frontend_repository_url` | Variable | `ECR_FRONTEND_REPO` |
| `ecs_cluster_name` | Variable | `ECS_CLUSTER` |
| `ecs_backend_service` | Variable | `ECS_BACKEND_SERVICE` |
| `ecs_frontend_service` | Variable | `ECS_FRONTEND_SERVICE` |

Then `open $(terraform output -raw app_url)`.

## Cost & teardown

Fargate tasks, an ALB, and ElastiCache bill hourly. Destroy when done:

```bash
terraform destroy
```

## Notes / production hardening

- Add an HTTPS listener (ACM cert) and redirect HTTP→HTTPS.
- Move Fargate tasks to private subnets + NAT (or VPC endpoints) instead of public IPs.
- Use an ElastiCache replication group with automatic failover for HA.
- Pin ECS task definitions to the immutable `:<sha>` image tag in the deploy workflow.
