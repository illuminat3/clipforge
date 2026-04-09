using MediatR;

namespace clipforge_api.Auth.Login
{
    public record LoginUserCommand(string Username, string Password) : IRequest<LoginUserResult>;
}
