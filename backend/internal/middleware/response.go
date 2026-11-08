package middleware

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

type APIResponse struct {
	Data   any    `json:"data,omitempty"`
	Error  string `json:"error,omitempty"`
	TimeNS string `json:"time_ns"`
}

func WriteJSON(w http.ResponseWriter, r *http.Request, status int, data any, err error) {
	ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
	start := time.Now()

	resp := APIResponse{
		Data: data,
	}

	if err != nil {
		resp.Error = err.Error()
	}

	elapsed := time.Since(start).Nanoseconds()
	resp.TimeNS = strconv.FormatInt(elapsed, 10)

	ww.Header().Set("Content-Type", "application/json")
	ww.WriteHeader(status)
	json.NewEncoder(ww).Encode(resp)
}

func WriteError(w http.ResponseWriter, r *http.Request, status int, err error) {
	WriteJSON(w, r, status, nil, err)
}

func WriteSuccess(w http.ResponseWriter, r *http.Request, data any) {
	WriteJSON(w, r, http.StatusOK, data, nil)
}

func WriteCreated(w http.ResponseWriter, r *http.Request, data any) {
	WriteJSON(w, r, http.StatusCreated, data, nil)
}