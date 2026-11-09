package vehicle

import (
	"fmt"
	"net/http"
	"strconv"

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
	r.Post("/vehicles", h.Create)
	r.Get("/vehicles", h.List)
	r.Get("/vehicles/{id}", h.GetByID)
	r.Patch("/vehicles/{id}/status", h.UpdateStatus)
	r.Delete("/vehicles/{id}", h.Delete)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req CreateVehicleRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	v, err := h.service.Create(ctx, req)
	if err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	middleware.WriteCreated(w, r, v.ToResponse())
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	v, err := h.service.GetByID(ctx, id)
	if err != nil {
		middleware.WriteError(w, r, http.StatusInternalServerError, err)
		return
	}
	if v == nil {
		middleware.WriteError(w, r, http.StatusNotFound, fmt.Errorf("vehicle not found"))
		return
	}

	middleware.WriteSuccess(w, r, v.ToResponse())
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	vehicles, total, err := h.service.List(ctx, limit, offset)
	if err != nil {
		middleware.WriteError(w, r, http.StatusInternalServerError, err)
		return
	}

	resp := make([]VehicleResponse, len(vehicles))
	for i, v := range vehicles {
		resp[i] = v.ToResponse()
	}

	middleware.WriteSuccess(w, r, map[string]any{
		"vehicles": resp,
		"total":    total,
		"limit":    limit,
		"offset":   offset,
	})
}

func (h *Handler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	var req struct {
		Status string `json:"status" validate:"required"`
	}
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	if err := h.service.UpdateStatus(ctx, id, req.Status); err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	middleware.WriteSuccess(w, r, map[string]string{"status": "updated"})
}

func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	if err := h.service.Delete(ctx, id); err != nil {
		middleware.WriteError(w, r, http.StatusInternalServerError, err)
		return
	}

	middleware.WriteSuccess(w, r, map[string]string{"message": "vehicle deleted"})
}