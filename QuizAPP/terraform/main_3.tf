resource "aws_iam_instance_profile" "this" {
  name = "${var.name}-${var.environment}-profile"
  role = var.iam_role_arn != "" ? split("/", var.iam_role_arn)[1] : null
}

resource "aws_instance" "this" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [var.security_group_id]
  key_name                    = var.key_name
  associate_public_ip_address = var.public_ip
  iam_instance_profile        = aws_iam_instance_profile.this.name
  user_data                   = var.user_data

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20
    delete_on_termination = true
    encrypted             = true
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"   # IMDSv2 enforced
    http_put_response_hop_limit = 1
  }

  tags = { Name = "${var.name}-${var.environment}" }
}
