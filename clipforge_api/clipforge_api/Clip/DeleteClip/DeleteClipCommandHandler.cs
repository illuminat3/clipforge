using clipforge_api.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace clipforge_api.Clip.DeleteClip
{
    public class DeleteClipCommandHandler(AppDbContext db, IHttpContextAccessor httpContextAccessor, IHttpClientFactory httpClientFactory) : IRequestHandler<DeleteClipCommand>
    {
        public async Task Handle(DeleteClipCommand request, CancellationToken cancellationToken)
        {
            var userIdClaim = httpContextAccessor.HttpContext!.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException();
            var userId = Guid.Parse(userIdClaim);

            if (!Guid.TryParse(request.Id, out var clipId))
            {
                throw new KeyNotFoundException("Clip not found.");
            }

            var clip = await db.Clips
                .FirstOrDefaultAsync(c => c.Id == clipId && c.UserId == userId, cancellationToken)
                ?? throw new KeyNotFoundException("Clip not found.");

            var httpClient = httpClientFactory.CreateClient("StorageProvider");
            var storageResponse = await httpClient.DeleteAsync($"/delete/{clipId}", cancellationToken);
            storageResponse.EnsureSuccessStatusCode();

            var user = await db.Users.FindAsync([userId], cancellationToken) ?? throw new UnauthorizedAccessException();
            user.StorageUsedBytes = Math.Max(0, user.StorageUsedBytes - clip.SizeBytes);

            db.Clips.Remove(clip);
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
