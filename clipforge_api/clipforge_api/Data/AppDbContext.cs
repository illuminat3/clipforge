using clipforge_api.Auth;
using clipforge_api.Clip;
using Microsoft.EntityFrameworkCore;

namespace clipforge_api.Data
{
    public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
    {
        public DbSet<User> Users => Set<User>();
        public DbSet<ClipEntity> Clips => Set<ClipEntity>();
        public DbSet<UserClip> UserClips => Set<UserClip>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>(e =>
            {
                e.HasKey(u => u.Id);
                e.HasIndex(u => u.Username).IsUnique();
                e.Property(u => u.Id).ValueGeneratedOnAdd();
            });

            modelBuilder.Entity<ClipEntity>(e =>
            {
                e.HasKey(c => c.Id);
                e.Property(c => c.Id).ValueGeneratedOnAdd();
                e.HasOne(c => c.User)
                    .WithMany(u => u.Clips)
                    .HasForeignKey(c => c.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<UserClip>(e =>
            {
                e.HasKey(uc => uc.Id);
                e.Property(uc => uc.Id).ValueGeneratedOnAdd();
                e.HasOne(uc => uc.User)
                    .WithMany(u => u.UserClips)
                    .HasForeignKey(uc => uc.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasOne(uc => uc.Clip)
                    .WithMany(c => c.UserClips)
                    .HasForeignKey(uc => uc.ClipId)
                    .OnDelete(DeleteBehavior.Cascade);
                e.HasIndex(uc => new { uc.UserId, uc.ClipId }).IsUnique();
            });
        }
    }
}
