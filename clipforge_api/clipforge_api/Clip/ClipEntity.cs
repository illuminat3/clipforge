namespace clipforge_api.Clip
{
    public class ClipEntity
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int lengthMs { get; set; } = 0;
        public long SizeBytes { get; set; } = 0;
        public Guid UserId { get; set; }
        public Auth.User User { get; set; } = null!;

        public ICollection<UserClip> UserClips { get; set; } = [];
    }
}
