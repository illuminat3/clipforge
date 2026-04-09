using MediatR;

namespace clipforge_api.Auth.Register
{
    public record RegisterUserCommand(
        string Username,
        string Password,
        string InviteCode) : IRequest<RegisterUserResult>;
}
