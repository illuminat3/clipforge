using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace clipforge_api.Clip.StreamClip
{
    public class StreamClipQueryHandler : IRequestHandler<StreamClipQuery, IActionResult>
    {
        public async Task<IActionResult> Handle(StreamClipQuery request, CancellationToken ct)
        {
            Stream fileStream = Stream.Null;
            var contentType = "video/mp4";
            var fileName = $"{request.Id}.mp4";

            return new FileStreamResult(fileStream, contentType)
            {
                FileDownloadName = fileName,
                EnableRangeProcessing = true,
            };
        }
    }
}
