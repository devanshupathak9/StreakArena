# Secrets are referenced by the task definition rather than baked into it, so the
# values never appear in a task definition revision, the console, or a terraform plan
# that someone pastes into a chat.

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name}/app"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    JWT_SECRET   = random_password.jwt.result
    DATABASE_URL = "postgresql://${aws_db_instance.main.username}:${random_password.db.result}@${aws_db_instance.main.endpoint}/${aws_db_instance.main.db_name}"
    GITHUB_TOKEN = var.github_token
  })
}
