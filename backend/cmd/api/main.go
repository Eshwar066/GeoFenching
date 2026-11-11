package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"geofencing-system/internal/config"
	"geofencing-system/internal/database"
	"geofencing-system/internal/alert"
	"geofencing-system/internal/geofence"
	"geofencing-system/internal/location"
	"geofencing-system/internal/vehicle"
	"geofencing-system/internal/violation"
	middlewareApp "geofencing-system/internal/middleware"
)

func main() {
	cfg := config.Load()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := database.NewPool(ctx, &cfg.Database)
	if err != nil {
		slog.Error("Failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := database.RunMigrations(ctx, pool); err != nil {
		slog.Error("Failed to run migrations", "error", err)
		os.Exit(1)
	}

	geofenceService := geofence.NewService(pool)
	vehicleService := vehicle.NewService(pool)
	wsHub := alert.NewHub()
	alertService := alert.NewService(pool, geofenceService, vehicleService, wsHub)
	locationService := location.NewService(pool, geofenceService, vehicleService, alertService)
	violationService := violation.NewService(pool)

	go wsHub.Run(context.Background())
	alertService.StartEventProcessor(context.Background())

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middlewareApp.Logging(logger))
	r.Use(middlewareApp.CORS)
	r.Use(middlewareApp.Timing)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		middlewareApp.WriteSuccess(w, r, map[string]string{"status": "ok"})
	})

	// Mount all API routes under /api
	r.Route("/api", func(r chi.Router) {
		geofenceHandler := geofence.NewHandler(geofenceService)
		vehicleHandler := vehicle.NewHandler(vehicleService)
		locationHandler := location.NewHandler(locationService)
		alertHandler := alert.NewHandler(alertService, wsHub)
		violationHandler := violation.NewHandler(violationService)

		geofenceHandler.RegisterRoutes(r)
		vehicleHandler.RegisterRoutes(r)
		locationHandler.RegisterRoutes(r)
		alertHandler.RegisterRoutes(r)
		violationHandler.RegisterRoutes(r)
	})

	// WebSocket route - must be at root level to match nginx proxy
	alertHandler := alert.NewHandler(alertService, wsHub)
	r.Get("/ws/alerts", alertHandler.HandleWebSocket)

	server := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
		IdleTimeout:  cfg.Server.IdleTimeout,
	}

	go func() {
		slog.Info("Server starting", "port", cfg.Server.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("Server failed", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("Shutting down server...")
	ctx, cancel = context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		slog.Error("Server forced to shutdown", "error", err)
		os.Exit(1)
	}

	slog.Info("Server exited")
}