package location

import (
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"geofencing-system/internal/middleware"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Post("/vehicles/location", h.UpdateLocation)
	r.Get("/vehicles/location/{vehicle_id}", h.GetCurrentLocation)
}

func (h *Handler) UpdateLocation(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req UpdateLocationRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	resp, err := h.service.UpdateLocation(ctx, req)
	if err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	middleware.WriteSuccess(w, r, resp)
}

func (h *Handler) GetCurrentLocation(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := chi.URLParam(r, "vehicle_id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	resp, err := h.service.GetCurrentLocation(ctx, id)
	if err != nil {
		middleware.WriteError(w, r, http.StatusInternalServerError, err)
		return
	}
	if resp == nil {
		middleware.WriteError(w, r, http.StatusNotFound, fmt.Errorf("vehicle not found"))
		return
	}

	middleware.WriteSuccess(w, r, resp)
}