using MediatR;

namespace clipforge_api.Clip.GetClip
{
    public class GetClipQueryHandler : IRequestHandler<GetClipQuery, GetClipResult>
    {
        public async Task<GetClipResult> Handle(GetClipQuery request, CancellationToken ct)
        {
            throw new NotImplementedException();
        }
    }
}
