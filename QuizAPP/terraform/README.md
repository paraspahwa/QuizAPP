# MedQuizAI — Terraform Infrastructure

AWS infrastructure for the MedQuizAI application with VPC, EC2, and EKS.

## Architecture

```
                        Internet
                           │
                    ┌──────▼──────┐
                    │     IGW     │
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │         VPC             │
              │      10.0.0.0/16        │
              │                         │
              │  ┌─────────────────┐    │
              │  │  Public Subnets  │    │
              │  │  10.0.1-3.0/24  │    │
              │  │                 │    │
              │  │  ┌───────────┐  │    │
              │  │  │ Frontend  │  │    │
              │  │  │   EC2     │  │    │
              │  │  │ (nginx +  │  │    │
              │  │  │  React)   │  │    │
              │  │  └───────────┘  │    │
              │  │  ┌───────────┐  │    │
              │  │  │    NAT    │  │    │
              │  │  │  Gateway  │  │    │
              │  │  └─────┬─────┘  │    │
              │  └────────┼────────┘    │
              │           │             │
              │  ┌────────▼────────┐    │
              │  │ Private Subnets  │    │
              │  │ 10.0.11-13.0/24 │    │
              │  │                 │    │
              │  │  ┌───────────┐  │    │
              │  │  │  Backend  │  │    │
              │  │  │   EC2     │  │    │
              │  │  │ (FastAPI) │  │    │
              │  │  └───────────┘  │    │
              │  │  ┌───────────┐  │    │
              │  │  │  EKS Node │  │    │
              │  │  │  Group    │  │    │
              │  │  └───────────┘  │    │
              │  └─────────────────┘    │
              └─────────────────────────┘
```

## Resources Created

| Resource            | Count | Description |
|---|---|---|
| VPC                 | 1     | 10.0.0.0/16 |
| Public Subnets      | 3     | One per AZ, for frontend + NAT |
| Private Subnets     | 3     | One per AZ, for backend + EKS |
| Internet Gateway    | 1     | Public internet access |
| NAT Gateway         | 1     | Private subnet outbound access |
| Route Tables        | 2     | Public + Private |
| Security Groups     | 3     | Frontend, Backend, EKS |
| EC2 Frontend        | 1     | t3.small, public subnet |
| EC2 Backend         | 1     | t3.medium, private subnet |
| EKS Cluster         | 1     | Kubernetes 1.28 |
| EKS Node Group      | 1     | 2–4x t3.medium nodes |

## Prerequisites

```bash
# Install Terraform
brew install terraform         # Mac
# or download from terraform.io

# Install AWS CLI
brew install awscli

# Configure AWS credentials
aws configure
# Enter: Access Key, Secret Key, Region (us-east-1)

# Create an EC2 key pair in AWS console
# Save the .pem file locally
```

## Usage

### 1. Clone and configure

```bash
git clone your-repo
cd terraform

# Edit your values
nano terraform.tfvars
```

### 2. Initialise

```bash
terraform init
```

### 3. Preview

```bash
terraform plan
```

### 4. Deploy

```bash
terraform apply
```

Type `yes` when prompted. Takes ~15 minutes (EKS cluster takes longest).

### 5. Configure kubectl

```bash
# This command is shown in terraform output
aws eks update-kubeconfig --region us-east-1 --name medquizai-prod-eks
```

### 6. Deploy app to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets (fill in real values first)
kubectl create secret generic medquizai-secrets \
  --namespace medquizai \
  --from-literal=openai-api-key=sk-xxx \
  --from-literal=secret-key=your-jwt-secret

# Deploy storage, backend, frontend
kubectl apply -f k8s/storage.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# Check status
kubectl get all -n medquizai
```

### 7. Destroy (when done)

```bash
terraform destroy
```

## Cost Estimate (us-east-1, monthly)

| Resource          | Estimated Cost |
|---|---|
| NAT Gateway       | ~$35/month |
| EKS Cluster       | ~$72/month |
| 2x EKS nodes (t3.medium) | ~$60/month |
| Frontend EC2 (t3.small) | ~$15/month |
| Backend EC2 (t3.medium) | ~$30/month |
| **Total**         | **~$212/month** |

## File Structure

```
terraform/
├── main.tf                    # Root orchestration
├── variables.tf               # All input variables
├── outputs.tf                 # Key resource outputs
├── terraform.tfvars           # Your values (not committed)
├── modules/
│   ├── vpc/                   # VPC, subnets, IGW, NAT, routes
│   ├── ec2/                   # Reusable EC2 module
│   ├── security_groups/       # All security groups
│   ├── eks/                   # EKS cluster + node group
│   └── iam/                   # IAM roles for EC2
├── k8s/
│   ├── namespace.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── storage.yaml
│   └── secrets.yaml           # Template only — never commit secrets
└── scripts/
    ├── frontend_userdata.sh   # EC2 bootstrap script
    └── backend_userdata.sh    # EC2 bootstrap script
```
