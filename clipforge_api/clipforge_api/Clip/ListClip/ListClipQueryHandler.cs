using clipforge_api.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace clipforge_api.Clip.ListClip
{
    public class ListClipQueryHandler(AppDbContext db, IHttpContextAccessor httpContextAccessor) : IRequestHandler<ListClipsQuery, ListClipsResult>
    {
        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        public async Task<ListClipsResult> Handle(ListClipsQuery request, CancellationToken cancellationToken)
        {
            var userIdClaim = httpContextAccessor.HttpContext!.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException();
            var authUserId = Guid.Parse(userIdClaim);
            var userId = (request.UserId != null) ? Guid.Parse(request.UserId) : authUserId;

            var userClips = await db.UserClips.Include(uc => uc.Clip).Where(uc => uc.UserId == userId).ToListAsync(cancellationToken);

            var clips = userClips.Select(uc => new ClipListItem(
                   ClipId: uc.ClipId,
                   Title: uc.Clip.Title,
                   Length: uc.Clip.lengthMs,
                   ThumbnailUrl: $"/clip/{uc.ClipId}/thumbnail",
                   StreamUrl: $"/clip/{uc.ClipId}/stream"
               )).ToList();

            return new ListClipsResult(clips);
        }
    }

    public record StorageVideoEntry([property: JsonPropertyName("id")] string Id, [property: JsonPropertyName("durationSeconds")] double DurationSeconds);

    public record StorageListResponse([property: JsonPropertyName("videos")] List<StorageVideoEntry> Videos);
}
