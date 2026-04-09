using clipforge_api.Data;
using MediatR;

namespace clipforge_api.Auth.Register
{
    public class RegisterUserCommandHandler(AppDbContext db) : IRequestHandler<RegisterUserCommand, RegisterUserResult>
    {
        public async Task<RegisterUserResult> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
        {
            var existingUser = db.Users.FirstOrDefault(u => u.Username == request.Username);
            if (existingUser != null)
                throw new InvalidOperationException("Username already taken.");

            var user = new User
            {
                Id = Guid.NewGuid(),
                Username = request.Username,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                StorageLimitBytes = 10L * 1024 * 1024 * 1024, // 10 GB default
                CreatedAt = DateTime.UtcNow,
            };

            db.Users.Add(user);
            await db.SaveChangesAsync(cancellationToken);

            return new RegisterUserResult(user.Username);
        }
    }
}
