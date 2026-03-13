using FantaF1.Api.DependencyInjection;
using FantaF1.Api.Hosting;
using FantaF1.Application.DependencyInjection;
using FantaF1.Infrastructure.DependencyInjection;
using FantaF1.Infrastructure.Configuration;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddFantaF1Api();
builder.Services.AddFantaF1Application();
builder.Services.AddFantaF1Infrastructure();

if (!string.Equals(builder.Configuration["Bootstrap:DisableHostedService"], "true", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddHostedService<PortingBootstrapHostedService>();
}

var app = builder.Build();
var frontendBuildPath = app.Services.GetRequiredService<PortingAppConfigLoader>().ResolveFrontendBuildPath();

if (Directory.Exists(frontendBuildPath) && File.Exists(Path.Combine(frontendBuildPath, "index.html")))
{
    app.Environment.WebRootPath = frontendBuildPath;
    app.Environment.WebRootFileProvider = new PhysicalFileProvider(frontendBuildPath);
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

app.MapControllers();

if (Directory.Exists(frontendBuildPath) && File.Exists(Path.Combine(frontendBuildPath, "index.html")))
{
    app.MapFallbackToFile("index.html");
}

app.Run();

public partial class Program;
