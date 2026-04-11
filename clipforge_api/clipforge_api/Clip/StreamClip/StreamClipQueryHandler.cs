using clipforge_api.Data;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Security.Claims;

namespace clipforge_api.Clip.StreamClip
{
    public class StreamClipQueryHandler(AppDbContext db, IHttpContextAccessor httpContextAccessor, IHttpClientFactory httpClientFactory) : IRequestHandler<StreamClipQuery, IActionResult>
    {
        public async Task<IActionResult> Handle(StreamClipQuery request, CancellationToken ct)
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

            var requestMessage = new HttpRequestMessage(HttpMethod.Get, $"/fetch/{clip.Id}");

            if (!string.IsNullOrEmpty(request.RangeHeader))
            {
                requestMessage.Headers.TryAddWithoutValidation("Range", request.RangeHeader);
            }

            var storageResponse = await httpClient.SendAsync(requestMessage, HttpCompletionOption.ResponseHeadersRead, ct);

            if (storageResponse.StatusCode == HttpStatusCode.NotFound)
            {
                return new NotFoundResult();
            }

            storageResponse.EnsureSuccessStatusCode();

            return new ProxiedStreamResult(storageResponse);
        }
    }
}
