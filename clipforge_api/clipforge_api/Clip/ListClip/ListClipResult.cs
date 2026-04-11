namespace clipforge_api.Clip.ListClip
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
