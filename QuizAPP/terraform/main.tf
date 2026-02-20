terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }

  # Uncomment to use S3 remote state (recommended for teams)
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "medquiz/prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "terraform-state-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "MedQuizAI"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ── VPC ──────────────────────────────────────────────────────────
module "vpc" {
  source = "./modules/vpc"

  project         = var.project
  environment     = var.environment
  vpc_cidr        = var.vpc_cidr
  azs             = var.availability_zones
  public_subnets  = var.public_subnet_cidrs
  private_subnets = var.private_subnet_cidrs
}

# ── Security Groups ───────────────────────────────────────────────
module "security_groups" {
  source = "./modules/security_groups"

  project     = var.project
  environment = var.environment
  vpc_id      = module.vpc.vpc_id
  vpc_cidr    = var.vpc_cidr
}

# ── EC2: Frontend (public subnet) ─────────────────────────────────
module "frontend_ec2" {
  source = "./modules/ec2"

  name              = "${var.project}-frontend"
  environment       = var.environment
  ami_id            = var.ec2_ami
  instance_type     = var.frontend_instance_type
  subnet_id         = module.vpc.public_subnet_ids[0]
  security_group_id = module.security_groups.frontend_sg_id
  key_name          = var.key_pair_name
  public_ip         = true
  user_data         = file("${path.module}/scripts/frontend_userdata.sh")
  iam_role_arn      = module.ec2_iam.frontend_role_arn
}

# ── EC2: Backend (private subnet) ────────────────────────────────
module "backend_ec2" {
  source = "./modules/ec2"

  name              = "${var.project}-backend"
  environment       = var.environment
  ami_id            = var.ec2_ami
  instance_type     = var.backend_instance_type
  subnet_id         = module.vpc.private_subnet_ids[0]
  security_group_id = module.security_groups.backend_sg_id
  key_name          = var.key_pair_name
  public_ip         = false
  user_data         = file("${path.module}/scripts/backend_userdata.sh")
  iam_role_arn      = module.ec2_iam.backend_role_arn
}

# ── IAM Roles for EC2 ────────────────────────────────────────────
module "ec2_iam" {
  source      = "./modules/iam"
  project     = var.project
  environment = var.environment
}

# ── EKS Cluster ──────────────────────────────────────────────────
module "eks" {
  source = "./modules/eks"

  project             = var.project
  environment         = var.environment
  cluster_name        = "${var.project}-${var.environment}-eks"
  kubernetes_version  = var.kubernetes_version
  vpc_id              = module.vpc.vpc_id
  private_subnet_ids  = module.vpc.private_subnet_ids
  public_subnet_ids   = module.vpc.public_subnet_ids
  eks_sg_id           = module.security_groups.eks_sg_id
  node_instance_type  = var.eks_node_instance_type
  node_desired_size   = var.eks_node_desired_size
  node_min_size       = var.eks_node_min_size
  node_max_size       = var.eks_node_max_size
}
