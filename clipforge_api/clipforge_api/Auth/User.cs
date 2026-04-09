namespace clipforge_api.Auth
{
    public class User
    {
        public Guid Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public long StorageUsedBytes { get; set; }
        public long StorageLimitBytes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
