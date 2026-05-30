resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.project_name}-redis-subnets"
  subnet_ids = aws_subnet.private[*].id
}

# Single-node Redis is enough for the Socket.IO adapter's Pub/Sub fan-out.
# (Scale to a replication group with automatic failover for production HA.)
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.project_name}-redis"
  engine               = "redis"
  node_type            = var.redis_node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  engine_version       = "7.1"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis.id]
}

locals {
  redis_url = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379"
}
