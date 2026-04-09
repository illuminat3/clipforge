using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace clipforge_api.Clip.StreamClip
{
    public record StreamClipQuery(string Id, string? RangeHeader) : IRequest<IActionResult>;
}
