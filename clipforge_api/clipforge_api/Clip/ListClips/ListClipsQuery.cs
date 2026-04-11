using MediatR;

namespace clipforge_api.Clip.ListClips
{
    public record ListClipsQuery(string? UserId) : IRequest<ListClipsResult>;
}
