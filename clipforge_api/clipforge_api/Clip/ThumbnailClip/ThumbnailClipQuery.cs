using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace clipforge_api.Clip.ThumbnailClip
{
    public record ThumbnailClipQuery(string Id) : IRequest<IActionResult>;
}
