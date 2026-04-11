using clipforge_api.Data;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Security.Claims;

namespace clipforge_api.Clip.ThumbnailClip
{
    public class ThumbnailClipQueryHandler(
        AppDbContext db,
        IHttpContextAccessor httpContextAccessor,
        IHttpClientFactory httpClientFactory) : IRequestHandler<ThumbnailClipQuery, IActionResult>
    {
        public async Task<IActionResult> Handle(ThumbnailClipQuery request, CancellationToken ct)
        {
            var userIdClaim = httpContextAccessor.HttpContext!.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? throw new UnauthorizedAccessException();
            var userId = Guid.Parse(userIdClaim);

            if (!Guid.TryParse(request.Id, out var clipId))
                return new NotFoundResult();

            var hasAccess = await db.UserClips.AnyAsync(
                uc => uc.ClipId == clipId && uc.UserId == userId, ct);

            if (!hasAccess)
                return new NotFoundResult();

            var httpClient = httpClientFactory.CreateClient("StorageProvider");
            var response = await httpClient.GetAsync($"/thumbnail/{clipId}", ct);

            if (response.StatusCode == HttpStatusCode.NotFound)
                return new NotFoundResult();

            if (!response.IsSuccessStatusCode)
                return new StatusCodeResult((int)response.StatusCode);

            var bytes = await response.Content.ReadAsByteArrayAsync(ct);
            return new FileContentResult(bytes, "image/jpeg");
        }
    }
}
