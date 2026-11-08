package middleware

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

func Timing(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)
		elapsed := time.Since(start).Nanoseconds()
		w.Header().Set("X-Response-Time-NS", strconv.FormatInt(elapsed, 10))
	})
}

func GetTimeNS(r *http.Request) string {
	return r.Header.Get("X-Response-Time-NS")
}