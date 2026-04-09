using MediatR;

namespace clipforge_api.Clip.GetClip
{

    public record GetClipQuery(string Id) : IRequest<GetClipResult>;
}
