using Microsoft.AspNetCore.Mvc;

namespace clipforge_api.Clip.StreamClip
{
    /// <summary>
    /// Proxies an HTTP response from the storage provider directly to the client,
    /// preserving the status code and streaming-relevant headers (Content-Range, Accept-Ranges).
    /// </summary>
    public class ProxiedStreamResult(HttpResponseMessage upstreamResponse) : IActionResult
    {
        public async Task ExecuteResultAsync(ActionContext context)
        {
            var response = context.HttpContext.Response;

            response.StatusCode = (int)upstreamResponse.StatusCode;
            response.ContentType = upstreamResponse.Content.Headers.ContentType?.ToString() ?? "video/mp4";

            if (upstreamResponse.Content.Headers.ContentLength.HasValue)
                response.ContentLength = upstreamResponse.Content.Headers.ContentLength;

            if (upstreamResponse.Content.Headers.ContentRange != null)
                response.Headers["Content-Range"] = upstreamResponse.Content.Headers.ContentRange.ToString();

            response.Headers["Accept-Ranges"] = "bytes";

            await upstreamResponse.Content.CopyToAsync(response.Body);
        }
    }
}
