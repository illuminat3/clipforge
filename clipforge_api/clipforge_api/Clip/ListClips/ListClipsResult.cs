namespace clipforge_api.Clip.ListClips
{
    public record ClipListItem(
        Guid ClipId,
        string Title,
        double Length,
        string ThumbnailUrl,
        string StreamUrl
    );

    public record ListClipsResult(List<ClipListItem> Clips);
}
