package alert

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"geofencing-system/internal/middleware"
)

type Handler struct {
	service *Service
	hub     *Hub
}

func NewHandler(service *Service, hub *Hub) *Handler {
	return &Handler{service: service, hub: hub}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Post("/alerts/configure", h.Create)
	r.Get("/alerts", h.List)
	r.Get("/ws/alerts", h.HandleWebSocket)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req CreateAlertRuleRequest
	if err := middleware.DecodeJSON(r, &req); err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	a, err := h.service.Create(ctx, req)
	if err != nil {
		middleware.WriteError(w, r, http.StatusBadRequest, err)
		return
	}

	middleware.WriteCreated(w, r, a.ToResponse())
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	limit := 20
	offset := 0

	rules, total, err := h.service.List(ctx, limit, offset)
	if err != nil {
		middleware.WriteError(w, r, http.StatusInternalServerError, err)
		return
	}

	resp := make([]AlertRuleResponse, len(rules))
	for i, a := range rules {
		resp[i] = a.ToResponse()
	}

	middleware.WriteSuccess(w, r, map[string]any{
		"alert_rules": resp,
		"total":       total,
		"limit":       limit,
		"offset":      offset,
	})
}

func (h *Handler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	h.hub.HandleWebSocket(w, r)
}