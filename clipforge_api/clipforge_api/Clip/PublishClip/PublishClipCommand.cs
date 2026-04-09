using MediatR;

namespace clipforge_api.Clip.PublishClip
{
    public record PublishClipCommand(string Title, IFormFile File) : IRequest<PublishClipResult>;
}