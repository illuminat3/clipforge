using clipforge_api.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace clipforge_api.Clip.ListClips
{
    public class ListClipsQueryHandler(
        AppDbContext db,
        IHttpContextAccessor httpContextAccessor,
        IHttpClientFactory httpClientFactory) : IRequestHandler<ListClipsQuery, ListClipsResult>
    {
        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
        };

        public async Task<ListClipsResult> Handle(ListClipsQuery request, CancellationToken ct)
        {
            var userIdClaim = httpContextAccessor.HttpContext!.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? throw new UnauthorizedAccessException();
            var authUserId = Guid.Parse(userIdClaim);

            var resolvedUserId = (request.UserId != null && Guid.TryParse(request.UserId, out var parsed))
                ? parsed
                : authUserId;

            var userClips = await db.UserClips
                .Include(uc => uc.Clip)
                .Where(uc => uc.UserId == resolvedUserId)
                .ToListAsync(ct);

            // Fetch duration metadata from the storage provider (best-effort).
            var durationMap = new Dictionary<Guid, double>();
            try
            {
                var httpClient = httpClientFactory.CreateClient("StorageProvider");
                var json = await httpClient.GetStringAsync($"/list/{resolvedUserId}", ct);
                var storageList = JsonSerializer.Deserialize<StorageListResponse>(json, _jsonOptions);
                if (storageList?.Videos != null)
                {
                    foreach (var video in storageList.Videos)
                    {
                        if (Guid.TryParse(video.Id, out var vid))
                            durationMap[vid] = video.DurationSeconds;
                    }
                }
            }
            catch
            {
                // Storage unavailable — duration will be 0 for all clips.
            }

            var clips = userClips
                .Select(uc => new ClipListItem(
                    ClipId: uc.ClipId,
                    Title: uc.Clip.Title,
                    Length: durationMap.TryGetValue(uc.ClipId, out var d) ? d : 0.0,
                    ThumbnailUrl: $"/clip/{uc.ClipId}/thumbnail",
                    StreamUrl: $"/clip/{uc.ClipId}/stream"
                ))
                .ToList();

            return new ListClipsResult(clips);
        }

        private record StorageVideoEntry(
            [property: JsonPropertyName("id")] string Id,
            [property: JsonPropertyName("durationSeconds")] double DurationSeconds
        );

        private record StorageListResponse(
            [property: JsonPropertyName("videos")] List<StorageVideoEntry> Videos
        );
    }
}
