package middleware

import (
	"net/http"
	"os"
	"strings"
)

// CORS reads CORS_ALLOWED_ORIGINS (comma-separated) from the environment.
// If the variable is empty or set to "*" it falls back to a very permissive
// mode (suitable only for dev). Otherwise it validates the Origin header
// and echoes it back when allowed.
func CORS(next http.Handler) http.Handler {
	allowedRaw := strings.TrimSpace(os.Getenv("CORS_ALLOWED_ORIGINS"))
	if allowedRaw == "" || allowedRaw == "*" {
		// Very permissive – only for local/dev testing
		return func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Accept,Authorization,Content-Type,X-CSRF-Token")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		}
	}

	// Build a slice of trimmed allowed origins
	var allowed []string
	for _, o := range strings.Split(allowedRaw, ",") {
		if o = strings.TrimSpace(o); o != "" {
			allowed = append(allowed, o)
		}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		ok := false
		for _, a := range allowed {
			if origin == a {
				ok = true
				break
			}
		}
		if !ok {
			// Origin not allowed – returning 403 makes misconfigurations obvious during testing.
			http.Error(w, "invalid origin", http.StatusForbidden)
			return
		}

		// Set CORS headers for the actual request
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept,Authorization,Content-Type,X-CSRF-Token")
		w.Header().Set("Access-Control-Expose-Headers", "X-Response-Time-NS")

		// Pre‑flight request
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}