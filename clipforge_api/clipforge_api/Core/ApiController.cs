using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace clipforge_api.Core
{
    [ApiController]
    [Route("[controller]")]
    public abstract class ApiController(IMediator mediator) : ControllerBase
    {
        protected readonly IMediator Mediator = mediator;
    }
}
