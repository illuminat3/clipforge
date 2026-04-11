using clipforge_api.Data;
using FFMpegCore;
using MediatR;
using System.Net.Http.Headers;
using System.Security.Claims;

namespace clipforge_api.Clip.PublishClip
{
    public class PublishClipCommandHandler(AppDbContext db, IHttpContextAccessor httpContextAccessor, IHttpClientFactory httpClientFactory) : IRequestHandler<PublishClipCommand, PublishClipResult>
    {
        public async Task<PublishClipResult> Handle(PublishClipCommand request, CancellationToken cancellationToken)
        {
            var userIdClaim = httpContextAccessor.HttpContext!.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? throw new UnauthorizedAccessException();
            var userId = Guid.Parse(userIdClaim);
            var user = await db.Users.FindAsync([userId], cancellationToken) ?? throw new UnauthorizedAccessException();

            if (user.StorageUsedBytes + request.File.Length > user.StorageLimitBytes)
            {
                throw new InvalidOperationException("Storage limit exceeded.");
            }

            var clipId = Guid.NewGuid();

            var httpClient = httpClientFactory.CreateClient("StorageProvider");

            using var formContent = new MultipartFormDataContent
            {
                { new StringContent(clipId.ToString()), "id" },
                { new StringContent(userId.ToString()), "accountId" },
                { new StringContent(request.File.FileName), "fileName" }
            };

            var fileStream = request.File.OpenReadStream();
            var fileContent = new StreamContent(fileStream);
            var hasFileContent = !string.IsNullOrEmpty(request.File.ContentType);
            
            fileContent.Headers.ContentType = new MediaTypeHeaderValue(hasFileContent ? request.File.ContentType : "video/mp4");
            formContent.Add(fileContent, "file", request.File.FileName);

            var storageResponse = await httpClient.PostAsync("/store", formContent, cancellationToken);
            storageResponse.EnsureSuccessStatusCode();

            var clip = new ClipEntity
            {
                Id = clipId,
                Title = request.Title,
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                lengthMs = await GetLengthForClip(request.File, cancellationToken),
                SizeBytes = request.File.Length
            };

            db.Clips.Add(clip);
            db.UserClips.Add(new UserClip
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ClipId = clipId,
            });

            user.StorageUsedBytes += request.File.Length;

            await db.SaveChangesAsync(cancellationToken);

            return new PublishClipResult(clipId, request.Title);
        }

        private static async Task<int> GetLengthForClip(IFormFile file, CancellationToken cancellationToken)
        {
            var tempPath = Path.Combine(Path.GetTempPath(), $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}");
            try
            {
                await using (var fs = File.Create(tempPath))
                await using (var stream = file.OpenReadStream())
                await stream.CopyToAsync(fs, cancellationToken);

                var mediaInfo = await FFProbe.AnalyseAsync(tempPath, cancellationToken: cancellationToken);
                return (int)mediaInfo.Duration.TotalMilliseconds;
            }
            finally
            {
                if (File.Exists(tempPath)) File.Delete(tempPath);
            }
        }
    }
}