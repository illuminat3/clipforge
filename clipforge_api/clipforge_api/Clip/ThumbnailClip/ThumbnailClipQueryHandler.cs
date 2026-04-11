using clipforge_api.Data;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Security.Claims;

namespace clipforge_api.Clip.ThumbnailClip
{
    public class ThumbnailClipQueryHandler(AppDbContext db, IHttpContextAccessor httpContextAccessor, IHttpClientFactory httpClientFactory) : IRequestHandler<ThumbnailClipQuery, IActionResult>
    {
        public async Task<IActionResult> Handle(ThumbnailClipQuery request, CancellationToken ct)
        {
            var userIdClaim = httpContextAccessor.HttpContext!.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException();
            var userId = Guid.Parse(userIdClaim);

            if (!Guid.TryParse(request.Id, out var clipId))
            {
                return new NotFoundResult();
            }

            var clip = await db.Clips.FirstOrDefaultAsync(c => c.Id == clipId && c.UserId == userId, ct);

            if (clip == null)
            {
                return new NotFoundResult();
            }

            var httpClient = httpClientFactory.CreateClient("StorageProvider");

            var storageResponse = await httpClient.GetAsync($"/thumbnail/{clip.Id}", HttpCompletionOption.ResponseHeadersRead, ct);

            if (storageResponse.StatusCode == HttpStatusCode.NotFound)
            {
                return new NotFoundResult();
            }

            storageResponse.EnsureSuccessStatusCode();

            var imageBytes = await storageResponse.Content.ReadAsByteArrayAsync(ct);
            return new FileContentResult(imageBytes, "image/jpeg");
        }
    }
}
