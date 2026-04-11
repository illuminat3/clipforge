using MediatR;

namespace clipforge_api.Clip.ListClip
{
    public record ListClipsQuery(string? UserId) : IRequest<ListClipsResult>;
}
