namespace clipforge_api.Clip
{
    public class UserClip
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }
        public Auth.User User { get; set; } = null!;

        public Guid ClipId { get; set; }
        public ClipEntity Clip { get; set; } = null!;
    }
}
