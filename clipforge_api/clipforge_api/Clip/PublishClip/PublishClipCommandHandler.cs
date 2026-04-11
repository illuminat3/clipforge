using clipforge_api.Data;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using System.Security.Claims;

namespace clipforge_api.Clip.PublishClip
{
    public class PublishClipCommandHandler(
        AppDbContext db,
        IHttpContextAccessor httpContextAccessor,
        IHttpClientFactory httpClientFactory)
        : IRequestHandler<PublishClipCommand, PublishClipResult>
    {
        public async Task<PublishClipResult> Handle(PublishClipCommand request, CancellationToken ct)
        {
            var userIdClaim = httpContextAccessor.HttpContext!.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? throw new UnauthorizedAccessException();
            var userId = Guid.Parse(userIdClaim);

            var user = await db.Users.FindAsync([userId], ct)
                ?? throw new UnauthorizedAccessException();

            // Validate storage limit
            if (user.StorageUsedBytes + request.File.Length > user.StorageLimitBytes)
                throw new InvalidOperationException("Storage limit exceeded.");

            var clipId = Guid.NewGuid();

            // Store in storage provider
            var httpClient = httpClientFactory.CreateClient("StorageProvider");

            using var formContent = new MultipartFormDataContent();

            var fileStream = request.File.OpenReadStream();
            var fileContent = new StreamContent(fileStream);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue(
                string.IsNullOrEmpty(request.File.ContentType) ? "video/mp4" : request.File.ContentType);

            formContent.Add(fileContent, "file", request.File.FileName);
            formContent.Add(new StringContent(clipId.ToString()), "id");
            formContent.Add(new StringContent(userId.ToString()), "accountId");
            formContent.Add(new StringContent(request.File.FileName), "fileName");

            var storageResponse = await httpClient.PostAsync("/store", formContent, ct);
            storageResponse.EnsureSuccessStatusCode();

            // Save clip to database
            var clip = new ClipEntity
            {
                Id = clipId,
                Title = request.Title,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
            };

            db.Clips.Add(clip);
            db.UserClips.Add(new UserClip
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ClipId = clipId,
            });

            user.StorageUsedBytes += request.File.Length;

            await db.SaveChangesAsync(ct);

            return new PublishClipResult(clipId, request.Title);
        }
    }
}