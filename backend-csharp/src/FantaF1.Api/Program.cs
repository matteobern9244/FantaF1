using FantaF1.Api.DependencyInjection;
using FantaF1.Application.DependencyInjection;
using FantaF1.Infrastructure.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddFantaF1Api();
builder.Services.AddFantaF1Application();
builder.Services.AddFantaF1Infrastructure();

var app = builder.Build();

app.MapControllers();

app.Run();

public partial class Program;
