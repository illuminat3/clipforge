using MediatR;
using Microsoft.AspNetCore.Authorization;

namespace clipforge_api.Core
{

    [Authorize]
    public abstract class RequiredAuthController(IMediator mediator) : ApiController(mediator)
    {
    }
}
