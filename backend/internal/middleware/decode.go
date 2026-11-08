package middleware

import (
	"encoding/json"
	"io"
	"net/http"
)

func DecodeJSON(r *http.Request, v any) error {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return err
	}
	defer r.Body.Close()
	return json.Unmarshal(body, v)
}