package geofence

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
	r.Post("/geofences", h.Create)
	r.Get("/geofences", h.List)
	r.Get("/geofences/{id}", h.GetByID)
	r.Delete("/geofences/{id}", h.Delete)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req CreateGeofenceRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	g, err := h.service.Create(ctx, req)
	if err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	middleware.WriteCreated(w, r, g.ToResponse())
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	g, err := h.service.GetByID(ctx, id)
	if err != nil {
		middleware.WriteError(w, r, http.StatusInternalServerError, err)
		return
	}
	if g == nil {
		middleware.WriteError(w, r, http.StatusNotFound, fmt.Errorf("geofence not found"))
		return
	}

	middleware.WriteSuccess(w, r, g.ToResponse())
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

	middleware.WriteSuccess(w, r, map[string]string{"message": "geofence deleted"})
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	category := r.URL.Query().Get("category")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

	geofences, total, err := h.service.List(ctx, category, limit, offset)
	if err != nil {
		middleware.WriteError(w, r, http.StatusInternalServerError, err)
		return
	}

	resp := make([]GeofenceResponse, len(geofences))
	for i, g := range geofences {
		resp[i] = g.ToResponse()
	}

	middleware.WriteSuccess(w, r, map[string]any{
		"geofences": resp,
		"total":     total,
		"limit":     limit,
		"offset":    offset,
	})
}