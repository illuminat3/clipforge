using clipforge_api.Data;
using MediatR;

namespace clipforge_api.Auth.Login
{
    public class LoginUserCommandHandler(AppDbContext db, IJwtService jwtService) : IRequestHandler<LoginUserCommand, LoginUserResult>
    {
        public Task<LoginUserResult> Handle(LoginUserCommand request, CancellationToken cancellationToken)
        {
            var user = db.Users.FirstOrDefault(u => u.Username == request.Username)
                ?? throw new UnauthorizedAccessException("Invalid username or password.");

            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                throw new UnauthorizedAccessException("Invalid username or password.");

            var token = jwtService.GenerateToken(user);
            return Task.FromResult(new LoginUserResult(token));
        }
    }
}
