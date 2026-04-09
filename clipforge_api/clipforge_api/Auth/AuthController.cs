using clipforge_api.Auth.Login;
using clipforge_api.Auth.Register;
using clipforge_api.Core;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace clipforge_api.Auth
{
    [Route("auth")]
    public class AuthController(IMediator mediator) : ApiController(mediator) 
    {
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] AuthRequest request, [FromQuery] string inviteCode)
        {
            var command = new RegisterUserCommand(request.Username, request.Password, inviteCode);
            var result = await Mediator.Send(command);
            return Ok(result);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] AuthRequest request)
        {
            var command = new LoginUserCommand(request.Username, request.Password);
            var result = await Mediator.Send(command);
            return Ok(result);
        }
    }
}
