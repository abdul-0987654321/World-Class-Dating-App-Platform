filepath = 'src/infrastructure/cache/redis.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the export at the end
content = content.replace(
    """// Export singleton instance
export const redisClient = new RedisClient();
export default redisClient;""",
    """// Export singleton instance
export const redisClient = new RedisClient();
export { RedisClient };
export default redisClient;"""
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed redis exports")
