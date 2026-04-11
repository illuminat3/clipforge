using clipforge_api.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace clipforge_api.Clip.GetClip
{
    public class GetClipQueryHandler(AppDbContext db, IHttpContextAccessor httpContextAccessor)
        : IRequestHandler<GetClipQuery, GetClipResult>
    {
        public async Task<GetClipResult> Handle(GetClipQuery request, CancellationToken ct)
        {
            var userIdClaim = httpContextAccessor.HttpContext!.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? throw new UnauthorizedAccessException();
            var userId = Guid.Parse(userIdClaim);

            if (!Guid.TryParse(request.Id, out var clipId))
                throw new KeyNotFoundException("Clip not found.");

            var clip = await db.Clips
                .FirstOrDefaultAsync(c => c.Id == clipId && c.UserId == userId, ct)
                ?? throw new KeyNotFoundException("Clip not found.");

            return new GetClipResult(clip.Id, $"/clip/{clip.Id}/stream");
        }
    }
}
