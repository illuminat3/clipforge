using MediatR;

namespace clipforge_api.Clip.PublishClip
{
    public class PublishClipCommandHandler : IRequestHandler<PublishClipCommand, PublishClipResult>
    {
        public async Task<PublishClipResult> Handle(PublishClipCommand request, CancellationToken ct)
        {
            // Validate Account Storage Limit
            // Encode to H.264
            // Save to storage
            // Return Id
            throw new NotImplementedException();
        }
    }
}