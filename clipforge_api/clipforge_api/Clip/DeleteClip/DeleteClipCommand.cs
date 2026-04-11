using MediatR;

namespace clipforge_api.Clip.DeleteClip
{
    public record DeleteClipCommand(string Id) : IRequest;
}
