using clipforge_api.Clip.GetClip;
using clipforge_api.Clip.ListClip;
using clipforge_api.Clip.PublishClip;
using clipforge_api.Clip.StreamClip;
using clipforge_api.Clip.ThumbnailClip;
using clipforge_api.Core;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace clipforge_api.Clip
{

    [Route("clip")]
    public class ClipController(IMediator mediator) : RequiredAuthController(mediator)
    {
        [HttpPost("publish")]
        public async Task<IActionResult> Publish([FromForm] PublishClipCommand command)
        {
            var result = await Mediator.Send(command);
            return Ok(result);
        }

        [HttpGet("list")]
        public async Task<IActionResult> ListClips([FromQuery] string? userId)
        {
            var query = new ListClipsQuery(userId);
            var result = await Mediator.Send(query);
            return Ok(result);
        }


        [HttpGet("{id}")]
        public async Task<IActionResult> GetClip(string id)
        {
            var query = new GetClipQuery(id);
            var result = await Mediator.Send(query);
            return Ok(result);
        }

        [HttpGet("{id}/stream")]
        public async Task<IActionResult> StreamClip(string id, [FromQuery] string? rangeHeader)
        {
            var query = new StreamClipQuery(id, rangeHeader);
            var result = await Mediator.Send(query);
            return result;
        }

        [HttpGet("{id}/thumbnail")]
        public async Task<IActionResult> GetThumbnail(string id)
        {
            var query = new ThumbnailClipQuery(id);
            var result = await Mediator.Send(query);
            return result;
        }
    }
}