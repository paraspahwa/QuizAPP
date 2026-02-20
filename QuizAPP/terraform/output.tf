# ── VPC ──────────────────────────────────────────────────────────
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

# ── EC2 ───────────────────────────────────────────────────────────
output "frontend_public_ip" {
  description = "Frontend EC2 public IP — open port 3000 in browser"
  value       = module.frontend_ec2.public_ip
}

output "frontend_public_dns" {
  description = "Frontend EC2 public DNS"
  value       = module.frontend_ec2.public_dns
}

output "backend_private_ip" {
  description = "Backend EC2 private IP (only reachable from inside VPC)"
  value       = module.backend_ec2.private_ip
}

# ── EKS ───────────────────────────────────────────────────────────
output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS API server endpoint"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "eks_cluster_ca" {
  description = "EKS cluster certificate authority"
  value       = module.eks.cluster_ca
  sensitive   = true
}

output "kubeconfig_command" {
  description = "Run this command to configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}
